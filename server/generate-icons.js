const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (-(crc & 1) & 0xEDB88320);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, getPixel) {
  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8 bit
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10);
  ihdrData.writeUInt8(0, 11);
  ihdrData.writeUInt8(0, 12);
  const ihdr = makeChunk('IHDR', ihdrData);

  const rawScanlines = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines[offset++] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawScanlines[offset++] = r;
      rawScanlines[offset++] = g;
      rawScanlines[offset++] = b;
      rawScanlines[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(rawScanlines, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdr, idat, iend]);
}

function renderPixel(x, y, w, h) {
  const u = x / w;
  const v = y / h;
  const cx = u - 0.5;
  const cy = v - 0.5;

  const rCorner = 0.44;
  const inBackground = Math.abs(cx) < rCorner && Math.abs(cy) < rCorner ||
    Math.hypot(Math.max(0, Math.abs(cx) - (rCorner - 0.15)), Math.max(0, Math.abs(cy) - (rCorner - 0.15))) <= 0.15;

  if (!inBackground) {
    return [0, 0, 0, 0];
  }

  const grad = (u + v) * 0.5;
  let r = Math.round(30 + grad * 35);
  let g = Math.round(64 + grad * 30);
  let b = Math.round(180 + grad * 45);
  let a = 255;

  const inShirtBody = u >= 0.28 && u <= 0.72 && v >= 0.40 && v <= 0.82;
  const inCollarV = (v >= 0.35 && v <= 0.58 && Math.abs(u - 0.5) <= (v - 0.35) * 0.65);
  const inLeftCollar = (u >= 0.30 && u <= 0.5 && v >= 0.35 && v <= 0.52 && Math.abs((u - 0.30) * 0.9 - (v - 0.35)) < 0.08);
  const inRightCollar = (u <= 0.70 && u >= 0.5 && v >= 0.35 && v <= 0.52 && Math.abs((0.70 - u) * 0.9 - (v - 0.35)) < 0.08);
  const inTie = (v >= 0.44 && v <= 0.74 && Math.abs(u - 0.5) <= 0.035 + (v - 0.44) * 0.03);
  const inTieKnot = (v >= 0.40 && v <= 0.46 && Math.abs(u - 0.5) <= 0.045);

  const hookDist = Math.hypot(u - 0.5, v - 0.25);
  const inHook = (hookDist >= 0.055 && hookDist <= 0.085 && v <= 0.26) ||
                 (Math.abs(u - 0.5) <= 0.016 && v >= 0.24 && v <= 0.33);

  if (inHook) return [254, 240, 138, 255];
  if (inTie || inTieKnot) return [220, 38, 38, 255];
  if (inShirtBody) {
    if (inCollarV) return [255, 255, 255, 255];
    return [241, 245, 249, 255];
  }
  if (inLeftCollar || inRightCollar) return [226, 232, 240, 255];

  const inBadge = Math.hypot(u - 0.36, v - 0.62) < 0.04;
  if (inBadge) return [234, 179, 8, 255];

  return [r, g, b, a];
}

const pubDir = path.join(__dirname, '..', 'client', 'public');
if (!fs.existsSync(pubDir)) fs.mkdirSync(pubDir, { recursive: true });

const png192 = createPng(192, 192, renderPixel);
fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), png192);
console.log('Created pwa-192x192.png');

const png512 = createPng(512, 512, renderPixel);
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), png512);
console.log('Created pwa-512x512.png');

const png180 = createPng(180, 180, renderPixel);
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), png180);
console.log('Created apple-touch-icon.png');

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="50%" stop-color="#2563eb"/>
      <stop offset="100%" stop-color="#4338ca"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="130%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#0f172a" flood-opacity="0.35"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="24" y="24" width="464" height="464" rx="92" fill="none" stroke="#60a5fa" stroke-width="2" stroke-dasharray="6 6" opacity="0.4"/>
  <path d="M256 120 C235 120 220 135 220 152 C220 170 236 182 256 182 L256 210 M256 210 L140 260 C130 264 130 278 142 282 L370 282 C382 278 382 264 372 260 Z" fill="none" stroke="#fef08a" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" filter="url(#shadow)"/>
  <path d="M144 270 L110 330 L160 350 L160 430 C160 440 170 448 180 448 L332 448 C342 448 352 440 352 430 L352 350 L402 330 L368 270 Z" fill="#ffffff" filter="url(#shadow)"/>
  <path d="M200 270 L256 360 L312 270 L256 295 Z" fill="#e2e8f0"/>
  <polygon points="256,310 268,325 264,410 256,425 248,410 244,325" fill="#dc2626"/>
  <polygon points="250,305 262,305 266,322 246,322" fill="#b91c1c"/>
  <circle cx="195" cy="340" r="14" fill="#eab308"/>
  <path d="M190 336 L195 332 L200 336 L195 348 Z" fill="#1e3a8a"/>
  <text x="256" y="485" text-anchor="middle" fill="#ffffff" font-size="28" font-weight="900" font-family="system-ui, sans-serif" letter-spacing="2">UNIFORMES CARRILLO</text>
</svg>
`;

fs.writeFileSync(path.join(pubDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(pubDir, 'favicon.svg'), svgContent);
console.log('Created icon.svg and favicon.svg');
