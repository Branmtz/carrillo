import React, { useState, useEffect, useCallback } from 'react';
import type { School, Product, Order, ProductionData, OrderItem } from './types';
import { Navbar } from './components/Navbar';
import { PosTerminal } from './components/PosTerminal';
import { OrdersSearch } from './components/OrdersSearch';
import { ProductionManager } from './components/ProductionManager';
import { SchoolsCatalog } from './components/SchoolsCatalog';
import { PriceListAndQuote } from './components/PriceListAndQuote';
import { TicketModal } from './components/TicketModal';
import { PaymentModal } from './components/PaymentModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pos' | 'search' | 'production' | 'catalog' | 'quotes'>('pos');

  // Cotización transferida para cobrar en punto de venta
  const [quoteForPos, setQuoteForPos] = useState<{
    schoolName: string;
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
    notes?: string;
  } | null>(null);
  
  // Datos del backend
  const [schools, setSchools] = useState<School[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productionData, setProductionData] = useState<ProductionData | null>(null);
  
  // Filtro de escuela en producción
  const [selectedSchool, setSelectedSchool] = useState<string>('todas');

  // Modales
  const [ticketOrder, setTicketOrder] = useState<Order | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);

  // Estados de carga
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Cargar datos del servidor
  const loadAllData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const [schoolsRes, productsRes, ordersRes, prodRes] = await Promise.all([
        fetch('/api/schools'),
        fetch('/api/products'),
        fetch('/api/orders'),
        fetch(`/api/production${selectedSchool !== 'todas' ? `?school=${encodeURIComponent(selectedSchool)}` : ''}`)
      ]);

      if (schoolsRes.ok) setSchools(await schoolsRes.json());
      if (productsRes.ok) setProducts(await productsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (prodRes.ok) setProductionData(await prodRes.json());
    } catch (err) {
      console.error('Error al sincronizar datos:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSchool]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Manejador de creación de orden
  const handleOrderCreated = (newOrder: Order) => {
    setOrders(prev => [newOrder, ...prev]);
    loadAllData(true);
    setTicketOrder(newOrder); // Abrir ticket automáticamente
  };

  // Manejador de entrega de productos
  const handleDeliverItems = async (orderId: number, itemsToDeliver: any[]) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/deliveries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToDeliver })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Error al actualizar entregas');
      }
      await loadAllData(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Cuando se añade una escuela
  const handleSchoolAdded = (newSchool: School) => {
    setSchools(prev => [...prev, newSchool].sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Cuando se edita una escuela
  const handleSchoolUpdated = (updatedSchool: School) => {
    setSchools(prev => prev.map(s => s.id === updatedSchool.id ? updatedSchool : s).sort((a, b) => a.name.localeCompare(b.name)));
  };

  // Cuando se elimina una escuela
  const handleSchoolDeleted = (schoolId: number) => {
    setSchools(prev => prev.filter(s => s.id !== schoolId));
  };

  // Cuando se añade un producto
  const handleProductAdded = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
  };

  // Cuando se edita un producto
  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  // Cuando se elimina un producto
  const handleProductDeleted = (productId: number) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // Cuando un pedido se actualiza (archivo o prioridad)
  const handleOrderUpdated = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    loadAllData(true);
  };

  // Contadores para el navbar
  const pendingPiecesCount = productionData?.aggregatedPending?.reduce(
    (acc, it) => acc + it.pending_units, 0
  ) || 0;

  const totalBalanceDue = productionData?.financialTotals?.total_balance_due || 0;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Barra de Navegación Principal */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingPiecesCount={pendingPiecesCount}
        totalBalanceDue={totalBalanceDue}
        onRefresh={() => loadAllData(false)}
        isRefreshing={isRefreshing}
      />

      {/* Contenedor Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
            <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-sm font-semibold">Cargando Uniformes Carrillo...</p>
          </div>
        ) : (
          <>
            {activeTab === 'pos' && (
              <PosTerminal
                schools={schools}
                products={products}
                onOrderCreated={handleOrderCreated}
                onSchoolAdded={handleSchoolAdded}
                initialQuoteData={quoteForPos}
                onClearInitialQuoteData={() => setQuoteForPos(null)}
              />
            )}

            {activeTab === 'quotes' && (
              <PriceListAndQuote
                schools={schools}
                products={products}
                onTransferQuoteToPos={(quoteData) => {
                  setQuoteForPos(quoteData);
                  setActiveTab('pos');
                }}
              />
            )}

            {activeTab === 'search' && (
              <OrdersSearch
                orders={orders}
                onSelectOrderForTicket={(order) => setTicketOrder(order)}
                onSelectOrderForPayment={(order) => setPaymentOrder(order)}
                onSelectOrderForDelivery={() => {
                  setActiveTab('production');
                }}
                onOrderUpdated={handleOrderUpdated}
              />
            )}

            {activeTab === 'production' && (
              <ProductionManager
                productionData={productionData}
                schools={schools}
                selectedSchool={selectedSchool}
                onSchoolChange={(sch) => setSelectedSchool(sch)}
                onDeliverItems={handleDeliverItems}
                onOpenPaymentModal={(order) => setPaymentOrder(order)}
                onRefresh={() => loadAllData(false)}
              />
            )}

            {activeTab === 'catalog' && (
              <SchoolsCatalog
                schools={schools}
                products={products}
                onSchoolAdded={handleSchoolAdded}
                onSchoolUpdated={handleSchoolUpdated}
                onSchoolDeleted={handleSchoolDeleted}
                onProductAdded={handleProductAdded}
                onProductUpdated={handleProductUpdated}
                onProductDeleted={handleProductDeleted}
              />
            )}
          </>
        )}
      </main>

      {/* Modal de Ticket / Comprobante PDF */}
      {ticketOrder && (
        <TicketModal
          order={ticketOrder}
          onClose={() => setTicketOrder(null)}
        />
      )}

      {/* Modal de Pago / Abono de Saldo */}
      {paymentOrder && (
        <PaymentModal
          order={paymentOrder}
          onClose={() => setPaymentOrder(null)}
          onPaymentSuccess={(updatedOrder) => {
            loadAllData(true);
            setTicketOrder(updatedOrder); // Mostrar ticket actualizado con el abono
          }}
        />
      )}

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-400 no-print">
        <p>Uniformes Carrillo • Punto de Venta, Confección y Control de Entregas © {new Date().getFullYear()}</p>
      </footer>

    </div>
  );
};

export default App;
