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

import { localDb } from './services/localDatabase';

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

  // Cargar datos exclusivamente de la base local del dispositivo
  const loadAllData = useCallback((isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    
    const loadedSchools = localDb.getSchools();
    const loadedProducts = localDb.getProducts();
    const loadedOrders = localDb.getOrders();
    const loadedProduction = localDb.getProductionData(selectedSchool);

    setSchools(loadedSchools);
    setProducts(loadedProducts);
    setOrders(loadedOrders);
    setProductionData(loadedProduction);

    setIsLoading(false);
    setIsRefreshing(false);
  }, [selectedSchool]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Manejador de creación de orden
  const handleOrderCreated = (newOrder: Order) => {
    loadAllData(true);
    setTicketOrder(newOrder); // Abrir ticket automáticamente
  };

  // Manejador de entrega de productos
  const handleDeliverItems = async (_orderId: number, itemsToDeliver: any[]) => {
    localDb.deliverItems(_orderId, itemsToDeliver);
    loadAllData(true);
  };

  // Cuando se añade una escuela
  const handleSchoolAdded = (_newSchool: School) => {
    loadAllData(true);
  };

  // Cuando se edita una escuela
  const handleSchoolUpdated = (_updatedSchool: School) => {
    loadAllData(true);
  };

  // Cuando se elimina una escuela
  const handleSchoolDeleted = (schoolId: number) => {
    localDb.deleteSchool(schoolId);
    loadAllData(true);
  };

  // Cuando se añade un producto
  const handleProductAdded = (_newProduct: Product) => {
    loadAllData(true);
  };

  // Cuando se edita un producto
  const handleProductUpdated = (_updatedProduct: Product) => {
    loadAllData(true);
  };

  // Cuando se elimina un producto
  const handleProductDeleted = (productId: number) => {
    localDb.deleteProduct(productId);
    loadAllData(true);
  };

  // Cuando un pedido se actualiza (archivo o prioridad)
  const handleOrderUpdated = (_updatedOrder: Order) => {
    loadAllData(true);
  };

  // Cuando se elimina un pedido
  const handleOrderDeleted = (orderId: number) => {
    localDb.deleteOrder(orderId);
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
                onOrderDeleted={handleOrderDeleted}
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
