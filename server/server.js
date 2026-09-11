const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper to generate next folio
function generateFolio(orderType) {
  const prefix = orderType === 'directa' ? 'VTA' : 'PED';
  const lastOrder = db.prepare(`
    SELECT folio FROM orders 
    WHERE folio LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}-%`);

  let nextNumber = 1001;
  if (lastOrder && lastOrder.folio) {
    const parts = lastOrder.folio.split('-');
    if (parts.length === 2 && !isNaN(parseInt(parts[1], 10))) {
      nextNumber = parseInt(parts[1], 10) + 1;
    }
  }
  return `${prefix}-${nextNumber}`;
}

// ==================== ESCUELAS ====================
app.get('/api/schools', (req, res) => {
  try {
    const schools = db.prepare('SELECT * FROM schools ORDER BY name ASC').all();
    res.json(schools);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schools', (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la escuela es obligatorio' });
    }
    const stmt = db.prepare('INSERT INTO schools (name, code) VALUES (?, ?)');
    const info = stmt.run(name.trim(), (code || '').trim());
    const newSchool = db.prepare('SELECT * FROM schools WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newSchool);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Ya existe una escuela con este nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schools/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM schools WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schools/:id', (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la escuela es obligatorio' });
    }
    db.prepare('UPDATE schools SET name = ?, code = ? WHERE id = ?')
      .run(name.trim(), (code || '').trim(), req.params.id);
    const updated = db.prepare('SELECT * FROM schools WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Ya existe otra escuela con este nombre' });
    }
    res.status(500).json({ error: err.message });
  }
});

// ==================== PRODUCTOS ====================
app.get('/api/products', (req, res) => {
  try {
    const { school } = req.query;
    let products;
    if (school && school !== 'todas') {
      products = db.prepare(`
        SELECT * FROM products 
        WHERE school_name = ? OR school_name = 'Todas' OR school_name IS NULL OR school_name = ''
        ORDER BY 
          CASE WHEN school_name = ? THEN 0 ELSE 1 END,
          category, name ASC
      `).all(school, school);
    } else {
      products = db.prepare('SELECT * FROM products ORDER BY category, name ASC').all();
    }
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/products', (req, res) => {
  try {
    const { name, category, default_price, package_price, school_name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }
    const defPrice = Number(default_price) || 0;
    const pkgPrice = package_price !== undefined ? (Number(package_price) || 0) : Math.round(defPrice * 0.85);
    const schName = (school_name && school_name.trim()) ? school_name.trim() : 'Todas';
    const stmt = db.prepare('INSERT INTO products (name, category, default_price, package_price, school_name) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(name.trim(), category || 'General', defPrice, pkgPrice, schName);
    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', (req, res) => {
  try {
    const { name, category, default_price, package_price, school_name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }
    const defPrice = Number(default_price) || 0;
    const pkgPrice = package_price !== undefined ? (Number(package_price) || 0) : Math.round(defPrice * 0.85);
    const schName = (school_name && school_name.trim()) ? school_name.trim() : 'Todas';
    db.prepare('UPDATE products SET name = ?, category = ?, default_price = ?, package_price = ?, school_name = ? WHERE id = ?')
      .run(name.trim(), category || 'General', defPrice, pkgPrice, schName, req.params.id);
    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== COTIZACIONES (PRESUPUESTOS SIN COBRO) ====================
app.get('/api/quotes', (req, res) => {
  try {
    const { q, school } = req.query;
    let query = 'SELECT * FROM quotes WHERE 1=1';
    const params = [];

    if (q && q.trim()) {
      query += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR folio LIKE ?)';
      const s = `%${q.trim()}%`;
      params.push(s, s, s);
    }
    if (school && school !== 'todas') {
      query += ' AND school_name = ?';
      params.push(school);
    }

    query += ' ORDER BY id DESC LIMIT 100';
    const quotes = db.prepare(query).all(...params).map(q => ({
      ...q,
      items: JSON.parse(q.items_json || '[]')
    }));
    res.json(quotes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes', (req, res) => {
  try {
    const { customer_name, customer_phone, school_name, seller_name, total_amount, items, notes } = req.body;
    if (!school_name || !school_name.trim()) {
      return res.status(400).json({ error: 'La escuela es obligatoria en la cotización' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Agregue al menos una prenda a la cotización' });
    }

    // Generar folio correlativo COT-XXXX
    const lastQuote = db.prepare('SELECT id FROM quotes ORDER BY id DESC LIMIT 1').get();
    const nextId = (lastQuote ? lastQuote.id : 0) + 1;
    const folio = `COT-${String(nextId + 1000).padStart(4, '0')}`;

    const itemsJson = JSON.stringify(items);
    const total = Number(total_amount) || items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);

    const stmt = db.prepare(`
      INSERT INTO quotes (folio, customer_name, customer_phone, school_name, seller_name, total_amount, items_json, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      folio,
      customer_name ? customer_name.trim() : 'Cliente General',
      customer_phone ? customer_phone.trim() : '',
      school_name.trim(),
      seller_name ? seller_name.trim() : 'Vendedor',
      total,
      itemsJson,
      notes ? notes.trim() : ''
    );

    const saved = db.prepare('SELECT * FROM quotes WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({
      ...saved,
      items: JSON.parse(saved.items_json)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/quotes/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM quotes WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== PEDIDOS Y VENTAS ====================
// Obtener lista con búsqueda avanzada
app.get('/api/orders', (req, res) => {
  try {
    const { q, order_type, delivery_status, payment_status, archived, priority } = req.query;
    
    let query = `
      SELECT 
        o.*,
        (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as total_items,
        (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) as total_units,
        (SELECT SUM(delivered_quantity) FROM order_items WHERE order_id = o.id) as delivered_units
      FROM orders o
      WHERE 1=1
    `;
    const params = [];

    if (q && q.trim()) {
      const searchTerm = `%${q.trim()}%`;
      query += ` AND (
        o.customer_name LIKE ? OR 
        o.customer_phone LIKE ? OR 
        o.folio LIKE ? OR 
        o.school_name LIKE ? OR 
        o.seller_name LIKE ?
      )`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (order_type && order_type !== 'todos') {
      query += ` AND o.order_type = ?`;
      params.push(order_type);
    }

    if (delivery_status && delivery_status !== 'todos') {
      query += ` AND o.delivery_status = ?`;
      params.push(delivery_status);
    }

    if (payment_status && payment_status !== 'todos') {
      query += ` AND o.payment_status = ?`;
      params.push(payment_status);
    }

    if (priority && priority !== 'todos') {
      query += ` AND o.priority = ?`;
      params.push(priority);
    }

    if (archived === 'archivados') {
      query += ` AND o.is_archived = 1`;
    } else if (archived !== 'todos') {
      query += ` AND (o.is_archived = 0 OR o.is_archived IS NULL)`;
    }

    query += ` ORDER BY CASE o.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, o.id DESC`;

    const orders = db.prepare(query).all(...params);

    // Adjuntar items a cada orden
    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const getPayments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC');

    const fullOrders = orders.map(order => ({
      ...order,
      items: getItems.all(order.id),
      payments: getPayments.all(order.id)
    }));

    res.json(fullOrders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener un solo pedido por ID
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC').all(order.id);
    res.json({ ...order, items, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear nuevo pedido o venta directa
app.post('/api/orders', (req, res) => {
  const tx = db.transaction((orderData) => {
    const {
      order_type = 'pedido', // 'directa' o 'pedido'
      customer_name,
      customer_phone = '',
      school_name,
      seller_name,
      items = [],
      deposit_amount = 0,
      payment_method = 'Efectivo',
      notes = '',
      priority = 'normal',
      custom_date = null
    } = orderData;

    if (!customer_name || !customer_name.trim()) {
      throw new Error('El nombre del cliente es obligatorio');
    }
    if (!school_name || !school_name.trim()) {
      throw new Error('La escuela es obligatoria');
    }
    if (!seller_name || !seller_name.trim()) {
      throw new Error('El nombre del vendedor es obligatorio');
    }
    if (!items || items.length === 0) {
      throw new Error('Debe agregar al menos una prenda a la venta');
    }

    // Calcular montos totales
    let total_amount = 0;
    items.forEach(item => {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = parseFloat(item.unit_price) || 0;
      total_amount += qty * price;
    });

    let deposit = parseFloat(deposit_amount) || 0;
    if (order_type === 'directa') {
      deposit = total_amount; // En venta directa se liquida al 100%
    }

    const balance_due = Math.max(0, total_amount - deposit);
    const payment_status = balance_due <= 0.01 ? 'liquidado' : 'pendiente';

    // En venta directa todo se entrega de inmediato; en pedido inicia como pendiente
    const delivery_status = order_type === 'directa' ? 'entregado' : 'pendiente';
    const folio = generateFolio(order_type);

    const validPriorities = ['urgente', 'alta', 'normal', 'baja'];
    const finalPriority = validPriorities.includes(priority) ? priority : 'normal';

    let createdAt = null;
    if (custom_date && String(custom_date).trim()) {
      let cd = String(custom_date).trim().replace('T', ' ');
      if (cd.length === 16) cd += ':00';
      createdAt = cd;
    }

    let orderId;
    if (createdAt) {
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          folio, order_type, customer_name, customer_phone, school_name, 
          seller_name, total_amount, deposit_amount, balance_due, 
          delivery_status, payment_status, payment_method, notes, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderResult = insertOrder.run(
        folio,
        order_type,
        customer_name.trim(),
        customer_phone.trim(),
        school_name.trim(),
        seller_name.trim(),
        total_amount,
        deposit,
        balance_due,
        delivery_status,
        payment_status,
        payment_method,
        notes.trim(),
        finalPriority,
        createdAt,
        createdAt
      );
      orderId = orderResult.lastInsertRowid;
    } else {
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          folio, order_type, customer_name, customer_phone, school_name, 
          seller_name, total_amount, deposit_amount, balance_due, 
          delivery_status, payment_status, payment_method, notes, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const orderResult = insertOrder.run(
        folio,
        order_type,
        customer_name.trim(),
        customer_phone.trim(),
        school_name.trim(),
        seller_name.trim(),
        total_amount,
        deposit,
        balance_due,
        delivery_status,
        payment_status,
        payment_method,
        notes.trim(),
        finalPriority
      );
      orderId = orderResult.lastInsertRowid;
    }

    // Insertar items
    const insertItem = db.prepare(`
      INSERT INTO order_items (
        order_id, product_name, size, quantity, delivered_quantity, unit_price, subtotal, price_type, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const qty = parseInt(item.quantity, 10) || 1;
      const price = parseFloat(item.unit_price) || 0;
      const subtotal = qty * price;
      const deliveredQty = order_type === 'directa' ? qty : 0;
      const itemStatus = order_type === 'directa' ? 'entregado' : 'pendiente';
      const priceType = item.price_type === 'paquete' ? 'paquete' : 'unitario';

      insertItem.run(
        orderId,
        item.product_name.trim(),
        item.size.trim().toUpperCase(),
        qty,
        deliveredQty,
        price,
        subtotal,
        priceType,
        itemStatus
      );
    }

    // Registrar pago inicial si hubo depósito
    if (deposit > 0) {
      if (createdAt) {
        const insertPayment = db.prepare(`
          INSERT INTO payments (order_id, amount, payment_method, notes, created_at)
          VALUES (?, ?, ?, ?, ?)
        `);
        insertPayment.run(
          orderId,
          deposit,
          payment_method,
          order_type === 'directa' ? 'Pago completo en venta directa' : 'Anticipo inicial',
          createdAt
        );
      } else {
        const insertPayment = db.prepare(`
          INSERT INTO payments (order_id, amount, payment_method, notes)
          VALUES (?, ?, ?, ?)
        `);
        insertPayment.run(
          orderId,
          deposit,
          payment_method,
          order_type === 'directa' ? 'Pago completo en venta directa' : 'Anticipo inicial'
        );
      }
    }

    const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const orderPayments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(orderId);

    return { ...createdOrder, items: orderItems, payments: orderPayments };
  });

  try {
    const result = tx(req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Registrar entrega parcial o total de items de un pedido
app.post('/api/orders/:id/deliveries', (req, res) => {
  const tx = db.transaction((orderId, itemsToDeliver) => {
    // itemsToDeliver: array de { item_id, delivered_quantity_to_add } o { item_id, set_delivered }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new Error('Pedido no encontrado');

    const updateItemStmt = db.prepare(`
      UPDATE order_items 
      SET delivered_quantity = ?, status = ?
      WHERE id = ? AND order_id = ?
    `);

    for (const action of itemsToDeliver) {
      const currentItem = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(action.item_id, orderId);
      if (!currentItem) continue;

      let newDelivered = currentItem.delivered_quantity;
      if (typeof action.set_delivered_quantity === 'number') {
        newDelivered = Math.max(0, Math.min(currentItem.quantity, action.set_delivered_quantity));
      } else if (typeof action.deliver_add === 'number') {
        newDelivered = Math.max(0, Math.min(currentItem.quantity, currentItem.delivered_quantity + action.deliver_add));
      } else if (action.deliver_all) {
        newDelivered = currentItem.quantity;
      }

      let newStatus = 'pendiente';
      if (newDelivered >= currentItem.quantity) {
        newStatus = 'entregado';
      } else if (newDelivered > 0) {
        newStatus = 'parcial';
      }

      updateItemStmt.run(newDelivered, newStatus, currentItem.id, orderId);
    }

    // Recalcular estado global de entrega del pedido
    const allItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const totalUnits = allItems.reduce((acc, it) => acc + it.quantity, 0);
    const deliveredUnits = allItems.reduce((acc, it) => acc + it.delivered_quantity, 0);

    let globalDeliveryStatus = 'pendiente';
    if (deliveredUnits >= totalUnits) {
      globalDeliveryStatus = 'entregado';
    } else if (deliveredUnits > 0) {
      globalDeliveryStatus = 'parcial';
    }

    db.prepare(`
      UPDATE orders 
      SET delivery_status = ?, updated_at = datetime('now', 'localtime') 
      WHERE id = ?
    `).run(globalDeliveryStatus, orderId);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const updatedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ?').all(orderId);

    return { ...updatedOrder, items: updatedItems, payments };
  });

  try {
    const result = tx(req.params.id, req.body.items || []);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Registrar abono o pago posterior a un pedido
app.post('/api/orders/:id/payments', (req, res) => {
  const tx = db.transaction((orderId, paymentData) => {
    const { amount, payment_method = 'Efectivo', notes = '' } = paymentData;
    const payAmount = parseFloat(amount);

    if (isNaN(payAmount) || payAmount <= 0) {
      throw new Error('El monto del abono debe ser mayor a 0');
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new Error('Pedido no encontrado');

    const newDeposit = order.deposit_amount + payAmount;
    const newBalance = Math.max(0, order.total_amount - newDeposit);
    const newPaymentStatus = newBalance <= 0.01 ? 'liquidado' : 'pendiente';

    // Insert payment record
    db.prepare(`
      INSERT INTO payments (order_id, amount, payment_method, notes)
      VALUES (?, ?, ?, ?)
    `).run(orderId, payAmount, payment_method, notes.trim() || 'Abono a cuenta');

    // Update order
    db.prepare(`
      UPDATE orders 
      SET deposit_amount = ?, balance_due = ?, payment_status = ?, updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newDeposit, newBalance, newPaymentStatus, orderId);

    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const updatedItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC').all(orderId);

    return { ...updatedOrder, items: updatedItems, payments };
  });

  try {
    const result = tx(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Archivar o desarchivar pedido
app.patch('/api/orders/:id/archive', (req, res) => {
  try {
    const { is_archived } = req.body;
    db.prepare("UPDATE orders SET is_archived = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
      .run(is_archived ? 1 : 0, req.params.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ ...updated, items, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cambiar prioridad del pedido ('urgente', 'alta', 'normal', 'baja')
app.patch('/api/orders/:id/priority', (req, res) => {
  try {
    const { priority } = req.body;
    const valid = ['urgente', 'alta', 'normal', 'baja'];
    const p = valid.includes(priority) ? priority : 'normal';
    db.prepare("UPDATE orders SET priority = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
      .run(p, req.params.id);
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
    const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC').all(req.params.id);
    res.json({ ...updated, items, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==================== MÓDULO DE PRODUCCIÓN Y RESUMEN ====================
app.get('/api/production', (req, res) => {
  try {
    const { school } = req.query;

    let schoolFilterQuery = '';
    const queryParams = [];
    if (school && school !== 'todas') {
      schoolFilterQuery = 'AND o.school_name = ?';
      queryParams.push(school);
    }

    // 1. Resumen agrupado por Escuela, Producto y Talla (solo pedidos activos no archivados)
    const aggregatedPending = db.prepare(`
      SELECT 
        o.school_name,
        oi.product_name,
        oi.size,
        SUM(oi.quantity - oi.delivered_quantity) AS pending_units,
        SUM(oi.quantity) AS total_ordered_units,
        SUM(oi.delivered_quantity) AS delivered_units,
        COUNT(DISTINCT o.id) AS orders_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.quantity > oi.delivered_quantity 
        AND (o.is_archived = 0 OR o.is_archived IS NULL)
        ${schoolFilterQuery}
      GROUP BY o.school_name, oi.product_name, oi.size
      ORDER BY o.school_name ASC, oi.product_name ASC, oi.size ASC
    `).all(...queryParams);

    // 2. Resumen por Prenda total (todas las tallas juntas)
    const productSummary = db.prepare(`
      SELECT 
        oi.product_name,
        SUM(oi.quantity - oi.delivered_quantity) AS pending_units,
        COUNT(DISTINCT o.id) AS orders_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.quantity > oi.delivered_quantity 
        AND (o.is_archived = 0 OR o.is_archived IS NULL)
        ${schoolFilterQuery}
      GROUP BY oi.product_name
      ORDER BY pending_units DESC
    `).all(...queryParams);

    // 3. Totales financieros globales de pedidos pendientes de entrega y generales (no archivados)
    const financialTotals = db.prepare(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_sales,
        COALESCE(SUM(deposit_amount), 0) AS total_deposit_collected,
        COALESCE(SUM(balance_due), 0) AS total_balance_due,
        COUNT(id) AS total_orders_count
      FROM orders o
      WHERE (o.is_archived = 0 OR o.is_archived IS NULL) ${schoolFilterQuery}
    `).get(...queryParams);

    // 4. Totales financieros SOLO de pedidos que aún tienen saldo pendiente
    const pendingBalanceFinancials = db.prepare(`
      SELECT 
        COALESCE(SUM(deposit_amount), 0) AS pending_orders_deposit,
        COALESCE(SUM(balance_due), 0) AS pending_orders_balance_due,
        COUNT(id) AS count_with_balance
      FROM orders o
      WHERE balance_due > 0 
        AND (o.is_archived = 0 OR o.is_archived IS NULL)
        ${schoolFilterQuery}
    `).get(...queryParams);

    // 5. Lista de pedidos que tienen prendas pendientes ordenados por prioridad (Urgente primero)
    const pendingOrdersRaw = db.prepare(`
      SELECT DISTINCT o.*
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE oi.quantity > oi.delivered_quantity 
        AND (o.is_archived = 0 OR o.is_archived IS NULL)
        ${schoolFilterQuery}
      ORDER BY CASE o.priority WHEN 'urgente' THEN 1 WHEN 'alta' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END, o.id ASC
    `).all(...queryParams);

    const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
    const getPayments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY created_at ASC');

    const pendingOrders = pendingOrdersRaw.map(order => ({
      ...order,
      items: getItems.all(order.id),
      payments: getPayments.all(order.id)
    }));

    res.json({
      aggregatedPending,
      productSummary,
      financialTotals,
      pendingBalanceFinancials,
      pendingOrders
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar pedido
app.delete('/api/orders/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend in production if built
const clientDistPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexPath = path.join(clientDistPath, 'index.html');
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'API server is running on port ' + PORT });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor POS Uniformes ejecutándose en http://localhost:${PORT}`);
});
