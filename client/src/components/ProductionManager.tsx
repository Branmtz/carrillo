import React, { useState } from 'react';
import type { ProductionData, Order, School } from '../types';
import { formatCurrency, compareSizes } from '../utils/formatters';
import { generateProductionReportPDF } from '../utils/pdfGenerator';
import { 
  Scissors, Package, Check, CheckCheck, Clock, 
  DollarSign, FileDown, School as SchoolIcon, 
  User, Phone, AlertTriangle
} from 'lucide-react';

interface ProductionManagerProps {
  productionData: ProductionData | null;
  schools: School[];
  selectedSchool: string;
  onSchoolChange: (school: string) => void;
  onDeliverItems: (orderId: number, items: Array<{ item_id: number; deliver_all?: boolean; set_delivered_quantity?: number }>) => Promise<void>;
  onOpenPaymentModal: (order: Order) => void;
  onRefresh: () => void;
}

export const ProductionManager: React.FC<ProductionManagerProps> = ({
  productionData,
  schools,
  selectedSchool,
  onSchoolChange,
  onDeliverItems,
  onOpenPaymentModal,
  onRefresh
}) => {
  const [activeTab, setActiveTab] = useState<'resumen' | 'pedidos'>('resumen');
  const [selectedSchoolTab, setSelectedSchoolTab] = useState<string>('todas');
  const [processingDelivery, setProcessingDelivery] = useState<number | null>(null);

  if (!productionData) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-semibold text-slate-600">Cargando datos de producción...</p>
      </div>
    );
  }

  const {
    aggregatedPending = [],
    financialTotals = { total_sales: 0, total_deposit_collected: 0, total_balance_due: 0, total_orders_count: 0 },
    pendingBalanceFinancials = { pending_orders_deposit: 0, pending_orders_balance_due: 0, count_with_balance: 0 },
    pendingOrders = []
  } = productionData;

  // Agrupar items pendientes por Escuela primero, y dentro de cada Escuela por Prenda y Talla
  const groupedBySchool: Record<string, {
    totalPendingPieces: number;
    products: Record<string, typeof aggregatedPending>;
  }> = {};

  aggregatedPending.forEach(item => {
    const school = item.school_name || 'Sin Escuela Asignada';
    if (!groupedBySchool[school]) {
      groupedBySchool[school] = {
        totalPendingPieces: 0,
        products: {}
      };
    }
    groupedBySchool[school].totalPendingPieces += item.pending_units;

    if (!groupedBySchool[school].products[item.product_name]) {
      groupedBySchool[school].products[item.product_name] = [];
    }
    groupedBySchool[school].products[item.product_name].push(item);
  });

  // Ordenar tallas lógicamente dentro de cada producto de cada escuela
  Object.values(groupedBySchool).forEach(schoolData => {
    Object.keys(schoolData.products).forEach(prodName => {
      schoolData.products[prodName].sort((a, b) => compareSizes(a.size, b.size));
    });
  });

  const totalPendingPieces = aggregatedPending.reduce((acc, it) => acc + it.pending_units, 0);

  // Cambiar prioridad directamente desde la vista de producción
  const handleChangePriority = async (order: Order, newPriority: string) => {
    try {
      const res = await fetch(`/api/orders/${order.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
      if (!res.ok) throw new Error('Error al cambiar prioridad');
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Manejar entrega individual de una prenda específica
  const handleDeliverSingleItem = async (orderId: number, itemId: number, totalQty: number) => {
    setProcessingDelivery(itemId);
    try {
      await onDeliverItems(orderId, [{ item_id: itemId, set_delivered_quantity: totalQty }]);
      onRefresh();
    } finally {
      setProcessingDelivery(null);
    }
  };

  // Manejar entrega completa de todas las prendas de un pedido
  const handleDeliverEntireOrder = async (order: Order) => {
    if (!window.confirm(`¿Confirmar entrega completa de todas las prendas pendientes para ${order.customer_name}?`)) {
      return;
    }
    setProcessingDelivery(order.id);
    try {
      const itemsToDeliver = order.items
        .filter(it => (it.delivered_quantity || 0) < it.quantity)
        .map(it => ({ item_id: it.id!, set_delivered_quantity: it.quantity }));
      
      await onDeliverItems(order.id, itemsToDeliver);
      onRefresh();
    } finally {
      setProcessingDelivery(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Tarjetas Métricas Superiores: Control Financiero y de Producción */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Prendas Pendientes de Confección/Entrega */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Scissors className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Prendas por Entregar
            </span>
            <span className="text-2xl font-black text-slate-900">
              {totalPendingPieces} <span className="text-xs font-semibold text-slate-500">piezas</span>
            </span>
            <span className="text-[11px] text-amber-700 font-medium block">
              En {pendingOrders.length} pedido(s) activos
            </span>
          </div>
        </div>

        {/* Total Dejado A Cuenta */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Cobrado (A Cuenta)
            </span>
            <span className="text-2xl font-black text-emerald-700">
              {formatCurrency(financialTotals.total_deposit_collected)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              Anticipos y abonos recibidos
            </span>
          </div>
        </div>

        {/* Total Restante por Cobrar */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Resta por Cobrar
            </span>
            <span className="text-2xl font-black text-red-600">
              {formatCurrency(financialTotals.total_balance_due)}
            </span>
            <span className="text-[11px] text-red-700 font-medium block">
              {pendingBalanceFinancials.count_with_balance} cliente(s) con saldo
            </span>
          </div>
        </div>

        {/* Total Proyectado de Ventas */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Venta Total Registrada
            </span>
            <span className="text-2xl font-black text-slate-900">
              {formatCurrency(financialTotals.total_sales)}
            </span>
            <span className="text-[11px] text-slate-500 font-medium block">
              {financialTotals.total_orders_count} ventas y pedidos
            </span>
          </div>
        </div>

      </div>

      {/* Barra de Filtro de Escuela y Selector de Pestañas */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        
        {/* Pestañas: Resumen de Confección vs Detalle de Clientes */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('resumen')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'resumen'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Resumen de Confección por Talla ({totalPendingPieces})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pedidos')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'pedidos'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-4 h-4" />
            Control de Entregas por Pedido ({pendingOrders.length})
          </button>
        </div>

        {/* Filtro de Escuela & Botón PDF */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <SchoolIcon className="w-4 h-4 text-blue-600" />
            <select
              value={selectedSchool}
              onChange={(e) => onSchoolChange(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="todas">Todas las Escuelas</option>
              {schools.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => generateProductionReportPDF(aggregatedPending, selectedSchool)}
            disabled={aggregatedPending.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
            title="Descargar reporte en PDF para imprimir en el taller de costura"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Reporte PDF para Taller</span>
          </button>
        </div>

      </div>

      {/* CONTENIDO PESTAÑA 1: RESUMEN DE CONFECCIÓN POR TALLA (Dividido por Escuela) */}
      {activeTab === 'resumen' && (
        <div className="space-y-6">
          {Object.keys(groupedBySchool).length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">¡No hay prendas pendientes de entrega!</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Todas las prendas solicitadas en los pedidos han sido confeccionadas y entregadas a los clientes.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Selector Rápido de Escuela para Vista de Confección si hay más de 1 escuela */}
              {Object.keys(groupedBySchool).length > 1 && (
                <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/80 flex items-center gap-2 overflow-x-auto">
                  <span className="text-xs font-bold text-slate-500 shrink-0 pl-1">Filtrar Escuela:</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedSchoolTab('todas')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                        selectedSchoolTab === 'todas'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      Todas ({totalPendingPieces} pzas)
                    </button>
                    {Object.entries(groupedBySchool).map(([schName, schData]) => (
                      <button
                        key={schName}
                        type="button"
                        onClick={() => setSelectedSchoolTab(schName)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          selectedSchoolTab === schName
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <SchoolIcon className="w-3.5 h-3.5" />
                        <span className="truncate max-w-[180px]">{schName}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          selectedSchoolTab === schName ? 'bg-blue-800 text-white' : 'bg-slate-200 text-slate-800'
                        }`}>
                          {schData.totalPendingPieces}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de Escuelas con sus Prendas y Tallas */}
              {Object.entries(groupedBySchool)
                .filter(([schName]) => selectedSchoolTab === 'todas' || schName === selectedSchoolTab)
                .map(([schoolName, schoolData]) => (
                  <div
                    key={schoolName}
                    className="bg-white rounded-3xl shadow-xs border border-slate-200/90 overflow-hidden"
                  >
                    {/* Encabezado Principal de la Escuela */}
                    <div className="bg-gradient-to-r from-slate-900 to-slate-800 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-blue-300 shrink-0 border border-white/10">
                          <SchoolIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-blue-300">
                              Escuela
                            </span>
                          </div>
                          <h3 className="text-base font-extrabold tracking-tight text-white">
                            {schoolName}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-amber-400 text-amber-950 font-black text-xs rounded-xl shadow-xs">
                          {schoolData.totalPendingPieces} prenda(s) pendiente(s)
                        </span>
                        <span className="px-2.5 py-1 bg-white/10 text-slate-200 font-semibold text-xs rounded-xl border border-white/10">
                          {Object.keys(schoolData.products).length} modelo(s)
                        </span>
                      </div>
                    </div>

                    {/* Prendas de esta Escuela organizadas por Talla */}
                    <div className="p-5 sm:p-6 bg-slate-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(schoolData.products).map(([productName, items]) => {
                          const totalForProduct = items.reduce((acc, it) => acc + it.pending_units, 0);

                          return (
                            <div
                              key={productName}
                              className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 space-y-3.5 hover:border-slate-300 transition"
                            >
                              {/* Encabezado de la Prenda */}
                              <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900">{productName}</h4>
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Pendiente de confección / entrega
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-lg">
                                    {totalForProduct} pza(s)
                                  </span>
                                </div>
                              </div>

                              {/* Desglose de Tallas */}
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Tallas requeridas en {schoolName}:
                                </span>

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                  {items.map(it => (
                                    <div
                                      key={it.size}
                                      className="bg-slate-50 border border-slate-200 rounded-xl p-2 text-center flex flex-col items-center justify-center hover:bg-blue-50/50 hover:border-blue-200 transition"
                                    >
                                      <span className="text-[10px] font-semibold text-slate-500">
                                        Talla
                                      </span>
                                      <span className="text-sm font-black text-slate-900">
                                        {it.size}
                                      </span>
                                      <div className="mt-1 px-1.5 py-0.5 bg-red-100 text-red-800 rounded-md font-extrabold text-[11px]">
                                        {it.pending_units} pza(s)
                                      </div>
                                      <span className="text-[9px] text-slate-400 mt-0.5">
                                        {it.orders_count} pedido(s)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO PESTAÑA 2: CONTROL DE ENTREGAS POR PEDIDO INDIVIDUAL */}
      {activeTab === 'pedidos' && (
        <div className="space-y-4">
          {pendingOrders.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <CheckCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <h4 className="text-base font-bold text-slate-800">¡No hay pedidos con entregas pendientes!</h4>
              <p className="text-xs text-slate-500">
                Todos los clientes han recibido el 100% de sus prendas.
              </p>
            </div>
          ) : (
            pendingOrders.map(order => {
              const hasBalance = order.balance_due > 0;
              const pendingItems = order.items.filter(it => (it.delivered_quantity || 0) < it.quantity);
              const isUrgent = order.priority === 'urgente';
              const isHigh = order.priority === 'alta';

              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-2xl shadow-xs border p-5 space-y-4 transition ${
                    isUrgent
                      ? 'border-red-400 ring-2 ring-red-400/40 bg-red-50/10'
                      : isHigh
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200/80 hover:border-blue-300'
                  }`}
                >
                  {/* Cabecera del Pedido */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {order.folio}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          {order.customer_name}
                        </h4>

                        {/* Prioridad Badge y Selector Rápido */}
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={order.priority || 'normal'}
                            onChange={(e) => handleChangePriority(order, e.target.value)}
                            className={`text-xs font-bold rounded-md px-2 py-0.5 border cursor-pointer ${
                              isUrgent
                                ? 'bg-red-600 text-white border-red-700'
                                : isHigh
                                  ? 'bg-amber-400 text-amber-950 border-amber-500'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                            title="Cambiar prioridad en taller"
                          >
                            <option value="normal">Normal</option>
                            <option value="alta">⭐ Alta Prioridad</option>
                            <option value="urgente">🚨 URGENTE</option>
                            <option value="baja">Baja</option>
                          </select>
                        </div>

                        {order.customer_phone && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {order.customer_phone}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-blue-700 font-semibold mt-1">
                        <SchoolIcon className="w-3.5 h-3.5" />
                        <span>{order.school_name}</span>
                      </div>
                    </div>

                    {/* Resumen Financiero del Cliente */}
                    <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Total Pedido:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(order.total_amount)}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[10px] text-slate-500 block">A Cuenta:</span>
                        <span className="font-bold text-emerald-700">{formatCurrency(order.deposit_amount)}</span>
                      </div>
                      <div className="border-l border-slate-200 pl-3">
                        <span className="text-[10px] text-slate-500 block">Resta:</span>
                        <span className={`font-black ${hasBalance ? 'text-red-600' : 'text-emerald-700'}`}>
                          {formatCurrency(order.balance_due)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Alerta si el cliente debe dinero */}
                  {hasBalance && (
                    <div className="p-2.5 bg-red-50/80 border border-red-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-red-900 font-medium">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>
                          Este cliente aún resta <strong>{formatCurrency(order.balance_due)}</strong> por pagar.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(order)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs shrink-0"
                      >
                        Cobrar Saldo Restante
                      </button>
                    </div>
                  )}

                  {/* Lista de Prendas y Marcado de Entregas Parciales / Totales */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      Prendas del Pedido (Seleccione cuáles ya se entregaron):
                    </span>

                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                      {order.items.map(item => {
                        const delivered = item.delivered_quantity || 0;
                        const isDone = delivered >= item.quantity;
                        const pendingQty = item.quantity - delivered;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 flex items-center justify-between gap-3 text-xs transition ${
                              isDone ? 'bg-slate-50/70 text-slate-500' : 'bg-white text-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                                isDone ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                              }`}>
                                {isDone ? '✓' : '!'}
                              </span>

                              <div>
                                <div className="font-bold flex items-center gap-2">
                                  <span>{item.product_name}</span>
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md">
                                    Talla: {item.size}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Total pedido: {item.quantity} pza(s) • Entregadas: {delivered} de {item.quantity}
                                </div>
                              </div>
                            </div>

                            {/* Botón de acción para esta prenda */}
                            <div>
                              {isDone ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs px-2.5 py-1 bg-emerald-50 rounded-lg border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  Entregado
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={processingDelivery === item.id}
                                  onClick={() => handleDeliverSingleItem(order.id, item.id!, item.quantity)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition shadow-xs disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Entregar {pendingQty} pza(s)</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Acción global: Entregar todo el pedido */}
                  {pendingItems.length > 0 && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        disabled={processingDelivery === order.id}
                        onClick={() => handleDeliverEntireOrder(order)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                      >
                        <CheckCheck className="w-4 h-4" />
                        <span>Marcar TODO el Pedido como Entregado</span>
                      </button>
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      )}

    </div>
  );
};
