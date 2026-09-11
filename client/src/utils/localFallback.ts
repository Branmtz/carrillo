import type { School, Product, Order, ProductionData, Quote } from '../types';

export const DEFAULT_SCHOOLS: School[] = [
  { id: 1, name: 'Secundaria Técnica No. 1', code: 'EST-01', created_at: new Date().toISOString() },
  { id: 2, name: 'Secundaria General No. 5', code: 'ESG-05', created_at: new Date().toISOString() },
  { id: 3, name: 'Primaria Benito Juárez', code: 'PBJ-01', created_at: new Date().toISOString() },
  { id: 4, name: 'Primaria Niños Héroes', code: 'PNH-02', created_at: new Date().toISOString() },
  { id: 5, name: 'Colegio de Bachilleres (COBACH)', code: 'COBACH', created_at: new Date().toISOString() },
  { id: 6, name: 'CBTIS No. 122', code: 'CBTIS-122', created_at: new Date().toISOString() },
  { id: 7, name: 'Kínder / Preescolar Gabriela Mistral', code: 'KGM-01', created_at: new Date().toISOString() },
  { id: 8, name: 'General / Particular', code: 'GEN', created_at: new Date().toISOString() }
];

export const DEFAULT_PRODUCTS: Product[] = [
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

export function getLocalSchools(): School[] {
  try {
    const saved = localStorage.getItem('carrillo_schools');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  saveLocalSchools(DEFAULT_SCHOOLS);
  return DEFAULT_SCHOOLS;
}

export function saveLocalSchools(schools: School[]): void {
  try {
    localStorage.setItem('carrillo_schools', JSON.stringify(schools));
  } catch (e) {}
}

export function getLocalProducts(): Product[] {
  try {
    const saved = localStorage.getItem('carrillo_products');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  saveLocalProducts(DEFAULT_PRODUCTS);
  return DEFAULT_PRODUCTS;
}

export function saveLocalProducts(products: Product[]): void {
  try {
    localStorage.setItem('carrillo_products', JSON.stringify(products));
  } catch (e) {}
}

export function getLocalOrders(): Order[] {
  try {
    const saved = localStorage.getItem('carrillo_orders');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function saveLocalOrders(orders: Order[]): void {
  try {
    localStorage.setItem('carrillo_orders', JSON.stringify(orders));
  } catch (e) {}
}

export function getLocalQuotes(): Quote[] {
  try {
    const saved = localStorage.getItem('carrillo_quotes');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

export function saveLocalQuotes(quotes: Quote[]): void {
  try {
    localStorage.setItem('carrillo_quotes', JSON.stringify(quotes));
  } catch (e) {}
}

export function calculateLocalProductionData(orders: Order[], filterSchool = 'todas'): ProductionData {
  const filteredOrders = filterSchool === 'todas'
    ? orders
    : orders.filter(o => o.school_name.toLowerCase() === filterSchool.toLowerCase());

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
}
