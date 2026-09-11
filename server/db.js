const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pos_uniformes.db');
const db = new Database(dbPath);

// Enable Foreign Keys and WAL mode for reliability and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    school_name TEXT DEFAULT 'Todas',
    default_price REAL NOT NULL DEFAULT 0,
    package_price REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT UNIQUE NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    school_name TEXT NOT NULL,
    seller_name TEXT,
    total_amount REAL NOT NULL,
    items_json TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT UNIQUE NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'pedido', -- 'directa' o 'pedido'
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    school_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    total_amount REAL NOT NULL,
    deposit_amount REAL NOT NULL,
    balance_due REAL NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'parcial', 'entregado'
    payment_status TEXT NOT NULL DEFAULT 'pendiente',  -- 'pendiente', 'liquidado'
    payment_method TEXT DEFAULT 'Efectivo',
    notes TEXT,
    is_archived INTEGER DEFAULT 0,
    priority TEXT DEFAULT 'normal', -- 'urgente', 'alta', 'normal', 'baja'
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    delivered_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    price_type TEXT NOT NULL DEFAULT 'unitario', -- 'unitario' (suelta) o 'paquete'
    status TEXT NOT NULL DEFAULT 'pendiente' -- 'pendiente', 'parcial', 'entregado'
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'Efectivo',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_name);
  CREATE INDEX IF NOT EXISTS idx_orders_folio ON orders(folio);
  CREATE INDEX IF NOT EXISTS idx_orders_school ON orders(school_name);
  CREATE INDEX IF NOT EXISTS idx_order_items_product_size ON order_items(product_name, size);
  CREATE INDEX IF NOT EXISTS idx_quotes_folio ON quotes(folio);
  CREATE INDEX IF NOT EXISTS idx_quotes_school ON quotes(school_name);
`);

// Migraciones automáticas seguras si la base de datos ya existía
try {
  db.exec("ALTER TABLE orders ADD COLUMN is_archived INTEGER DEFAULT 0;");
} catch (e) {}

try {
  db.exec("ALTER TABLE orders ADD COLUMN priority TEXT DEFAULT 'normal';");
} catch (e) {}

try {
  db.exec("ALTER TABLE products ADD COLUMN package_price REAL DEFAULT 0;");
} catch (e) {}

try {
  db.exec("ALTER TABLE products ADD COLUMN school_name TEXT DEFAULT 'Todas';");
} catch (e) {}

try {
  db.exec("ALTER TABLE order_items ADD COLUMN price_type TEXT DEFAULT 'unitario';");
} catch (e) {}

try {
  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_archived ON orders(is_archived);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_orders_priority ON orders(priority);");
  db.exec("CREATE INDEX IF NOT EXISTS idx_products_school ON products(school_name);");
} catch (e) {}

// Asignar precios por paquete para productos existentes con package_price en 0
try {
  db.exec(`
    UPDATE products SET package_price = 480 WHERE name LIKE '%Pans Completo%' AND (package_price = 0 OR package_price IS NULL);
    UPDATE products SET package_price = 260 WHERE name LIKE '%Suéter%' AND (package_price = 0 OR package_price IS NULL);
    UPDATE products SET package_price = 380 WHERE name LIKE '%Chamarra%' AND (package_price = 0 OR package_price IS NULL);
    UPDATE products SET package_price = 150 WHERE name LIKE '%Playera Polo%' AND (package_price = 0 OR package_price IS NULL);
    UPDATE products SET package_price = 240 WHERE name LIKE '%Pantalón Escolar%' AND (package_price = 0 OR package_price IS NULL);
    UPDATE products SET package_price = 220 WHERE name LIKE '%Falda%' AND (package_price = 0 OR package_price IS NULL);
    UPDATE products SET package_price = ROUND(default_price * 0.85) WHERE package_price = 0 OR package_price IS NULL;
  `);
} catch (e) {}

// Insert default schools and products if empty
const countSchools = db.prepare('SELECT COUNT(*) as count FROM schools').get().count;
if (countSchools === 0) {
  const insertSchool = db.prepare('INSERT INTO schools (name, code) VALUES (?, ?)');
  const defaultSchools = [
    ['Secundaria Técnica No. 1', 'EST-01'],
    ['Secundaria General No. 5', 'ESG-05'],
    ['Primaria Benito Juárez', 'PBJ-01'],
    ['Primaria Niños Héroes', 'PNH-02'],
    ['Colegio de Bachilleres (COBACH)', 'COBACH'],
    ['CBTIS No. 122', 'CBTIS-122'],
    ['Kínder / Preescolar Gabriela Mistral', 'KGM-01'],
    ['General / Particular', 'GEN']
  ];
  defaultSchools.forEach(([name, code]) => insertSchool.run(name, code));
}

// Asegurar prendas esenciales del paquete escolar de 6 piezas + corbata
const ensureProduct = (name, category, defaultPrice, packagePrice) => {
  const exists = db.prepare('SELECT id FROM products WHERE name = ?').get(name);
  if (!exists) {
    db.prepare('INSERT INTO products (name, category, default_price, package_price) VALUES (?, ?, ?, ?)').run(
      name, category, defaultPrice, packagePrice
    );
  }
};

ensureProduct('Chazarilla / Camisa Escolar', 'Diario', 220, 190);
ensureProduct('Corbata / Corbatín Escolar', 'Accesorios', 90, 70);

const countProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
if (countProducts === 0) {
  const insertProduct = db.prepare('INSERT INTO products (name, category, default_price, package_price) VALUES (?, ?, ?, ?)');
  const defaultProducts = [
    ['Pans Completo', 'Deportivo', 550, 480],
    ['Pans (Pantalón)', 'Deportivo', 300, 260],
    ['Sudadera Deportiva', 'Deportivo', 320, 270],
    ['Playera Polo Escolar', 'Diario', 180, 150],
    ['Pantalón Escolar (Diario)', 'Diario', 280, 240],
    ['Falda Escolar', 'Diario', 260, 220],
    ['Suéter Escolar', 'Diario', 310, 260],
    ['Chamarra Escolar', 'Abrigo', 450, 380],
    ['Chazarilla / Camisa Escolar', 'Diario', 220, 190],
    ['Corbata / Corbatín Escolar', 'Accesorios', 90, 70],
    ['Bata de Laboratorio', 'Accesorios', 220, 190],
    ['Short Deportivo', 'Deportivo', 160, 140]
  ];
  defaultProducts.forEach(([name, cat, price, pkgPrice]) => insertProduct.run(name, cat, price, pkgPrice));
}

module.exports = db;
