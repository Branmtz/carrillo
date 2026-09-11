// Formato de moneda mexicana
export function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}

// Formato de fecha y hora legible
export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return dateStr;
  }
}

export function formatDateOnly(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr.replace(' ', 'T'));
    if (isNaN(d.getTime())) return dateStr;
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(d);
  } catch {
    return dateStr;
  }
}

// Orden lógico para tallas de uniformes escolares
const sizeOrder = [
  '2', '4', '6', '8', '10', '12', '14', '16', '18',
  '24', '26', '28', '30', '32', '34', '36', '38', '40',
  'ECH', 'XCH', 'CH', 'M', 'G', 'XG', 'XXG', 'XL', '2XL', '3XL', 'UNITALLA'
];

export function compareSizes(a: string, b: string): number {
  const normA = (a || '').trim().toUpperCase();
  const normB = (b || '').trim().toUpperCase();

  const idxA = sizeOrder.indexOf(normA);
  const idxB = sizeOrder.indexOf(normB);

  if (idxA !== -1 && idxB !== -1) {
    return idxA - idxB;
  }
  if (idxA !== -1) return -1;
  if (idxB !== -1) return 1;

  // Fallback a comparación numérica si ambos son números
  const numA = parseInt(normA, 10);
  const numB = parseInt(normB, 10);
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }

  return normA.localeCompare(normB);
}
