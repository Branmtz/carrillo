import type { School, Product, Order, ProductionData, Quote, OrderItem, Payment } from '../types';

const STORAGE_KEYS = {
  SCHOOLS: 'carrillo_db_schools',
  PRODUCTS: 'carrillo_db_products',
  ORDERS: 'carrillo_db_orders',
  QUOTES: 'carrillo_db_quotes'
};

const INITIAL_SCHOOLS: School[] = [
  { id: 1, name: 'Secundaria Técnica No. 1', code: 'EST-01', created_at: new Date().toISOString() },
  { id: 2, name: 'Secundaria General No. 5', code: 'ESG-05', created_at: new Date().toISOString() },
  { id: 3, name: 'Primaria Benito Juárez', code: 'PBJ-01', created_at: new Date().toISOString() },
  { id: 4, name: 'Primaria Niños Héroes', code: 'PNH-02', created_at: new Date().toISOString() },
  { id: 5, name: 'Colegio de Bachilleres (COBACH)', code: 'COBACH', created_at: new Date().toISOString() },
  { id: 6, name: 'CBTIS No. 122', code: 'CBTIS-122', created_at: new Date().toISOString() },
  { id: 7, name: 'Kínder / Preescolar Gabriela Mistral', code: 'KGM-01', created_at: new Date().toISOString() },
  { id: 8, name: 'General / Particular', code: 'GEN', created_at: new Date().toISOString() }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: 'Pans Completo', category: 'Deportivo', school_name: 'Todas', default_price: 550, package_price: 480, created_at: new Date().toISOString() },
  { id: 2, name: 'Pans (Pantalón)', category: 'Deportivo', school_name: 'Todas', default_price: 300, package_price: 260, created_at: new Date().toISOString() },
  { id: 3, name: 'Sudadera Deportiva', category: 'Deportivo', school_name: 'Todas', default_price: 320, package_price: 270, created_at: new Date().toISOString() },
  { id: 4, name: 'Playera Polo Escolar', category: 'Diario', school_name: 'Todas', default_price: 180, package_price: 150, created_at: new Date().toISOString() },
  { id: 5, name: 'Pantalón Escolar (Diario)', category: 'Diario', school_name: 'Todas', default_price: 280, package_price: 240, created_at: new Date().toISOString() },
  { id: 6, name: 'Falda Escolar', category: 'Diario', school_name: 'Todas', default_price: 260, package_price: 220, created_at: new Date().toISOString() },
  { id: 7, name: 'Suéter Escolar', category: 'Diario', school_name: 'Todas', default_price: 310, package_price: 260, created_at: new Date().toISOString() },
  { id: 8, name: 'Chazarilla / Camisa Escolar', category: 'Diario', school_name: 'Todas', default_price: 220, package_price: 190, created_at: new Date().toISOString() },
  { id: 9, name: 'Corbata / Corbatín Escolar', category: 'Accesorios', school_name: 'Todas', default_price: 90, package_price: 70, created_at: new Date().toISOString() },
  { id: 10, name: 'Chamarra Escolar', category: 'Diario', school_name: 'Todas', default_price: 450, package_price: 380, created_at: new Date().toISOString() }
];

function safeGetItem<T>(key: string, defaultVal: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error al leer ${key} de almacenamiento local:`, err);
    return defaultVal;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error al guardar ${key} en almacenamiento local:`, err);
  }
}

// ==========================================
// ESCUELAS
// ==========================================
export const localDb = {
  getSchools(): School[] {
    const schools = safeGetItem<School[]>(STORAGE_KEYS.SCHOOLS, []);
    if (schools.length === 0) {
      safeSetItem(STORAGE_KEYS.SCHOOLS, INITIAL_SCHOOLS);
      return [...INITIAL_SCHOOLS];
    }
    return schools.sort((a, b) => a.name.localeCompare(b.name));
  },

  addSchool(name: string, code = ''): School {
    const schools = this.getSchools();
    const newSchool: School = {
      id: Date.now(),
      name: name.trim(),
      code: code.trim(),
      created_at: new Date().toISOString()
    };
    const updated = [...schools, newSchool].sort((a, b) => a.name.localeCompare(b.name));
    safeSetItem(STORAGE_KEYS.SCHOOLS, updated);
    return newSchool;
  },

  updateSchool(id: number, name: string, code = ''): School {
    const schools = this.getSchools();
    const updated = schools.map(s => {
      if (s.id === id) {
        return { ...s, name: name.trim(), code: code.trim() };
      }
      return s;
    }).sort((a, b) => a.name.localeCompare(b.name));
    safeSetItem(STORAGE_KEYS.SCHOOLS, updated);
    return updated.find(s => s.id === id)!;
  },

  deleteSchool(id: number): void {
    const schools = this.getSchools();
    const filtered = schools.filter(s => s.id !== id);
    safeSetItem(STORAGE_KEYS.SCHOOLS, filtered);
  },

  // ==========================================
  // PRODUCTOS / PRENDAS
  // ==========================================
  getProducts(): Product[] {
    const products = safeGetItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    if (products.length === 0) {
      safeSetItem(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
      return [...INITIAL_PRODUCTS];
    }
    return products;
  },

  addProduct(productData: {
    name: string;
    category?: string;
    school_name?: string;
    default_price: number;
    package_price?: number;
  }): Product {
    const products = this.getProducts();
    const newProd: Product = {
      id: Date.now(),
      name: productData.name.trim(),
      category: productData.category?.trim() || 'General',
      school_name: productData.school_name?.trim() || 'Todas',
      default_price: Number(productData.default_price) || 0,
      package_price: productData.package_price !== undefined ? Number(productData.package_price) : 0,
      created_at: new Date().toISOString()
    };
    const updated = [...products, newProd];
    safeSetItem(STORAGE_KEYS.PRODUCTS, updated);
    return newProd;
  },

  updateProduct(id: number, productData: {
    name: string;
    category?: string;
    school_name?: string;
    default_price: number;
    package_price?: number;
  }): Product {
    const products = this.getProducts();
    const updated = products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          name: productData.name.trim(),
          category: productData.category?.trim() || p.category,
          school_name: productData.school_name?.trim() || p.school_name || 'Todas',
          default_price: Number(productData.default_price) || 0,
          package_price: productData.package_price !== undefined ? Number(productData.package_price) : p.package_price
        };
      }
      return p;
    });
    safeSetItem(STORAGE_KEYS.PRODUCTS, updated);
    return updated.find(p => p.id === id)!;
  },

  deleteProduct(id: number): void {
    const products = this.getProducts();
    const filtered = products.filter(p => p.id !== id);
    safeSetItem(STORAGE_KEYS.PRODUCTS, filtered);
  },

  // ==========================================
  // PEDIDOS / VENTAS
  // ==========================================
  getOrders(): Order[] {
    return safeGetItem<Order[]>(STORAGE_KEYS.ORDERS, []);
  },

  createOrder(payload: {
    order_type: 'directa' | 'pedido';
    customer_name: string;
    customer_phone?: string;
    school_name: string;
    seller_name: string;
    items: OrderItem[];
    deposit_amount: number;
    payment_method: string;
    notes?: string;
    priority?: 'urgente' | 'alta' | 'normal' | 'baja';
    custom_date?: string | null;
  }): Order {
    const orders = this.getOrders();
    const prefix = payload.order_type === 'directa' ? 'VTA' : 'PED';
    
    // Calcular siguiente folio correlativo
    const matchingFolios = orders
      .filter(o => o.folio?.startsWith(`${prefix}-`))
      .map(o => {
        const num = parseInt(o.folio.split('-')[1], 10);
        return isNaN(num) ? 0 : num;
      });
    const nextNumber = matchingFolios.length > 0 ? Math.max(...matchingFolios) + 1 : 1001;
    const folio = `${prefix}-${nextNumber}`;

    const totalAmount = payload.items.reduce((acc, it) => acc + (Number(it.subtotal) || 0), 0);
    const deposit = payload.order_type === 'directa' ? totalAmount : Math.min(Number(payload.deposit_amount) || 0, totalAmount);
    const balanceDue = Math.max(0, totalAmount - deposit);
    const orderId = Date.now();

    const timestamp = payload.custom_date ? new Date(payload.custom_date).toISOString() : new Date().toISOString();

    const items: OrderItem[] = payload.items.map((it, idx) => ({
      ...it,
      id: orderId + idx + 1,
      order_id: orderId,
      delivered_quantity: payload.order_type === 'directa' ? it.quantity : 0,
      status: payload.order_type === 'directa' ? ('entregado' as const) : ('pendiente' as const)
    }));

    const payments: Payment[] = deposit > 0 ? [{
      id: orderId + 99,
      order_id: orderId,
      amount: deposit,
      payment_method: payload.payment_method || 'Efectivo',
      notes: payload.order_type === 'directa' ? 'Pago completo venta directa' : 'Anticipo inicial',
      created_at: timestamp
    }] : [];

    const newOrder: Order = {
      id: orderId,
      folio,
      order_type: payload.order_type,
      customer_name: payload.customer_name.trim(),
      customer_phone: payload.customer_phone?.trim() || '',
      school_name: payload.school_name.trim(),
      seller_name: payload.seller_name.trim(),
      total_amount: totalAmount,
      deposit_amount: deposit,
      balance_due: balanceDue,
      delivery_status: payload.order_type === 'directa' ? 'entregado' : 'pendiente',
      payment_status: balanceDue <= 0.01 ? 'liquidado' : 'pendiente',
      payment_method: payload.payment_method || 'Efectivo',
      notes: payload.notes?.trim() || '',
      priority: payload.priority || 'normal',
      is_archived: 0,
      created_at: timestamp,
      updated_at: timestamp,
      items,
      payments
    };

    const updated = [newOrder, ...orders];
    safeSetItem(STORAGE_KEYS.ORDERS, updated);
    return newOrder;
  },

  deleteOrder(orderId: number): void {
    const orders = this.getOrders();
    const filtered = orders.filter(o => o.id !== orderId);
    safeSetItem(STORAGE_KEYS.ORDERS, filtered);
  },

  updateOrderPriority(orderId: number, priority: string): Order {
    const orders = this.getOrders();
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, priority: priority as any, updated_at: new Date().toISOString() };
      }
      return o;
    });
    safeSetItem(STORAGE_KEYS.ORDERS, updated);
    return updated.find(o => o.id === orderId)!;
  },

  toggleOrderArchive(orderId: number, isArchived: number): Order {
    const orders = this.getOrders();
    const updated = orders.map(o => {
      if (o.id === orderId) {
        return { ...o, is_archived: isArchived, updated_at: new Date().toISOString() };
      }
      return o;
    });
    safeSetItem(STORAGE_KEYS.ORDERS, updated);
    return updated.find(o => o.id === orderId)!;
  },

  addPayment(orderId: number, amount: number, paymentMethod: string, notes = ''): Order {
    const orders = this.getOrders();
    const updated = orders.map(order => {
      if (order.id !== orderId) return order;

      const newDeposit = (order.deposit_amount || 0) + amount;
      const newBalance = Math.max(0, (order.total_amount || 0) - newDeposit);
      const newPayment: Payment = {
        id: Date.now(),
        order_id: order.id,
        amount,
        payment_method: paymentMethod,
        notes: notes.trim(),
        created_at: new Date().toISOString()
      };

      return {
        ...order,
        deposit_amount: newDeposit,
        balance_due: newBalance,
        payment_status: (newBalance <= 0.01 ? 'liquidado' : 'pendiente') as any,
        updated_at: new Date().toISOString(),
        payments: [...(order.payments || []), newPayment]
      };
    });

    safeSetItem(STORAGE_KEYS.ORDERS, updated);
    return updated.find(o => o.id === orderId)!;
  },

  deliverItems(
    orderId: number,
    itemsToDeliver: Array<{
      item_id?: number;
      product_name?: string;
      size?: string;
      set_delivered_quantity?: number;
      quantity_to_deliver?: number;
      deliver_all?: boolean;
    }>
  ): Order {
    const orders = this.getOrders();
    const updated = orders.map(order => {
      if (order.id !== orderId) return order;

      const updatedItems = order.items.map(it => {
        const match = itemsToDeliver.find(d => 
          (d.item_id !== undefined && d.item_id === it.id) ||
          (d.product_name === it.product_name && d.size === it.size)
        );
        if (!match) return it;

        let newDel = it.delivered_quantity || 0;
        if (match.deliver_all) {
          newDel = it.quantity;
        } else if (match.set_delivered_quantity !== undefined) {
          newDel = Math.min(it.quantity, Math.max(0, match.set_delivered_quantity));
        } else if (match.quantity_to_deliver !== undefined) {
          newDel = Math.min(it.quantity, newDel + match.quantity_to_deliver);
        }

        return {
          ...it,
          delivered_quantity: newDel,
          status: (newDel >= it.quantity ? 'entregado' : newDel > 0 ? 'parcial' : 'pendiente') as any
        };
      });

      const allDelivered = updatedItems.every(i => (i.delivered_quantity || 0) >= i.quantity);
      const someDelivered = updatedItems.some(i => (i.delivered_quantity || 0) > 0);

      return {
        ...order,
        items: updatedItems,
        delivery_status: (allDelivered ? 'entregado' : someDelivered ? 'parcial' : 'pendiente') as any,
        updated_at: new Date().toISOString()
      };
    });

    safeSetItem(STORAGE_KEYS.ORDERS, updated);
    return updated.find(o => o.id === orderId)!;
  },

  // ==========================================
  // CONTROL DE PRODUCCIÓN
  // ==========================================
  getProductionData(schoolFilter = 'todas'): ProductionData {
    const orders = this.getOrders();
    const filteredOrders = schoolFilter === 'todas'
      ? orders
      : orders.filter(o => o.school_name.toLowerCase() === schoolFilter.toLowerCase());

    const pendingOrders = filteredOrders.filter(o => o.delivery_status !== 'entregado');

    const pendingMap: Record<string, {
      school_name: string;
      product_name: string;
      size: string;
      pending_units: number;
      total_ordered_units: number;
      delivered_units: number;
      orders_count: number;
    }> = {};

    const summaryMap: Record<string, {
      product_name: string;
      pending_units: number;
      orders_count: number;
    }> = {};

    let totalSales = 0;
    let totalDeposit = 0;
    let totalBalanceDue = 0;

    for (const order of filteredOrders) {
      totalSales += order.total_amount || 0;
      totalDeposit += order.deposit_amount || 0;
      totalBalanceDue += order.balance_due || 0;

      for (const item of (order.items || [])) {
        const pendingUnits = Math.max(0, item.quantity - (item.delivered_quantity || 0));
        if (pendingUnits > 0) {
          const key = `${order.school_name}__${item.product_name}__${item.size}`;
          if (!pendingMap[key]) {
            pendingMap[key] = {
              school_name: order.school_name,
              product_name: item.product_name,
              size: item.size,
              pending_units: 0,
              total_ordered_units: 0,
              delivered_units: 0,
              orders_count: 0
            };
          }
          pendingMap[key].pending_units += pendingUnits;
          pendingMap[key].total_ordered_units += item.quantity;
          pendingMap[key].delivered_units += (item.delivered_quantity || 0);
          pendingMap[key].orders_count += 1;

          if (!summaryMap[item.product_name]) {
            summaryMap[item.product_name] = {
              product_name: item.product_name,
              pending_units: 0,
              orders_count: 0
            };
          }
          summaryMap[item.product_name].pending_units += pendingUnits;
          summaryMap[item.product_name].orders_count += 1;
        }
      }
    }

    const aggregatedPending = Object.values(pendingMap).sort((a, b) => {
      const schoolCmp = a.school_name.localeCompare(b.school_name);
      if (schoolCmp !== 0) return schoolCmp;
      return a.product_name.localeCompare(b.product_name);
    });

    const productSummary = Object.values(summaryMap).sort((a, b) => b.pending_units - a.pending_units);

    return {
      aggregatedPending,
      productSummary,
      financialTotals: {
        total_sales: totalSales,
        total_deposit_collected: totalDeposit,
        total_balance_due: totalBalanceDue,
        total_orders_count: filteredOrders.length
      },
      pendingBalanceFinancials: {
        pending_orders_deposit: totalDeposit,
        pending_orders_balance_due: totalBalanceDue,
        count_with_balance: filteredOrders.filter(o => o.balance_due > 0).length
      },
      pendingOrders
    };
  },

  // ==========================================
  // COTIZACIONES
  // ==========================================
  getQuotes(): Quote[] {
    return safeGetItem<Quote[]>(STORAGE_KEYS.QUOTES, []);
  },

  createQuote(payload: {
    customer_name: string;
    customer_phone?: string;
    school_name: string;
    seller_name: string;
    total_amount: number;
    items: any[];
    notes?: string;
  }): Quote {
    const quotes = this.getQuotes();
    
    // Generar siguiente folio correlativo
    const matchingFolios = quotes
      .filter(q => q.folio?.startsWith('COT-'))
      .map(q => {
        const num = parseInt(q.folio.split('-')[1], 10);
        return isNaN(num) ? 0 : num;
      });
    const nextNumber = matchingFolios.length > 0 ? Math.max(...matchingFolios) + 1 : 1001;
    const folio = `COT-${nextNumber}`;

    const newQuote: Quote = {
      id: Date.now(),
      folio,
      customer_name: payload.customer_name.trim() || 'Cliente General',
      customer_phone: payload.customer_phone?.trim() || '',
      school_name: payload.school_name.trim(),
      seller_name: payload.seller_name.trim() || 'Vendedor',
      total_amount: Number(payload.total_amount) || 0,
      items: payload.items,
      notes: payload.notes?.trim() || '',
      created_at: new Date().toISOString()
    };

    const updated = [newQuote, ...quotes];
    safeSetItem(STORAGE_KEYS.QUOTES, updated);
    return newQuote;
  },

  deleteQuote(quoteId: number): void {
    const quotes = this.getQuotes();
    const filtered = quotes.filter(q => q.id !== quoteId);
    safeSetItem(STORAGE_KEYS.QUOTES, filtered);
  }
};
