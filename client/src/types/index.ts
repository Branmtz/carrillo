export interface School {
  id: number;
  name: string;
  code?: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  school_name?: string;
  default_price: number;
  package_price?: number;
  created_at: string;
}

export interface QuoteItem {
  id?: number;
  product_name: string;
  size: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  price_type?: 'unitario' | 'paquete';
}

export interface Quote {
  id: number;
  folio: string;
  customer_name: string;
  customer_phone?: string;
  school_name: string;
  seller_name: string;
  total_amount: number;
  items: QuoteItem[];
  notes?: string;
  created_at: string;
}

export interface OrderItem {
  id?: number;
  order_id?: number;
  product_name: string;
  size: string;
  quantity: number;
  delivered_quantity: number;
  unit_price: number;
  subtotal: number;
  price_type?: 'unitario' | 'paquete';
  status: 'pendiente' | 'parcial' | 'entregado';
}

export interface Payment {
  id: number;
  order_id: number;
  amount: number;
  payment_method: string;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: number;
  folio: string;
  order_type: 'directa' | 'pedido';
  customer_name: string;
  customer_phone: string;
  school_name: string;
  seller_name: string;
  total_amount: number;
  deposit_amount: number;
  balance_due: number;
  delivery_status: 'pendiente' | 'parcial' | 'entregado';
  payment_status: 'pendiente' | 'liquidado';
  payment_method: string;
  notes?: string;
  is_archived?: number;
  priority?: 'urgente' | 'alta' | 'normal' | 'baja';
  created_at: string;
  updated_at: string;
  total_items?: number;
  total_units?: number;
  delivered_units?: number;
  items: OrderItem[];
  payments: Payment[];
}

export interface AggregatedPendingItem {
  school_name?: string;
  product_name: string;
  size: string;
  pending_units: number;
  total_ordered_units: number;
  delivered_units: number;
  orders_count: number;
}

export interface ProductSummaryItem {
  product_name: string;
  pending_units: number;
  orders_count: number;
}

export interface ProductionData {
  aggregatedPending: AggregatedPendingItem[];
  productSummary: ProductSummaryItem[];
  financialTotals: {
    total_sales: number;
    total_deposit_collected: number;
    total_balance_due: number;
    total_orders_count: number;
  };
  pendingBalanceFinancials: {
    pending_orders_deposit: number;
    pending_orders_balance_due: number;
    count_with_balance: number;
  };
  pendingOrders: Order[];
}
