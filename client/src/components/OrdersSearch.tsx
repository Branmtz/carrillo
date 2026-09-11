import React, { useState } from 'react';
import type { Order } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { 
  Search, Printer, DollarSign, PackageCheck, 
  School, User, Calendar, CheckCircle, Clock, X,
  Archive, ArchiveRestore, Trash2
} from 'lucide-react';

interface OrdersSearchProps {
  orders: Order[];
  onSelectOrderForTicket: (order: Order) => void;
  onSelectOrderForPayment: (order: Order) => void;
  onSelectOrderForDelivery: (order: Order) => void;
  onOrderUpdated: (order: Order) => void;
  onOrderDeleted?: (orderId: number) => void;
}

export const OrdersSearch: React.FC<OrdersSearchProps> = ({
  orders,
  onSelectOrderForTicket,
  onSelectOrderForPayment,
  onSelectOrderForDelivery,
  onOrderUpdated,
  onOrderDeleted
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('todos'); // 'todos', 'pedido', 'directa'
  const [filterPayment, setFilterPayment] = useState<string>('todos'); // 'todos', 'con_saldo', 'liquidado'
  const [filterDelivery, setFilterDelivery] = useState<string>('todos'); // 'todos', 'pendiente', 'entregado'
  const [filterArchived, setFilterArchived] = useState<'activos' | 'archivados' | 'todos'>('activos');
  const [filterPriority, setFilterPriority] = useState<string>('todos'); // 'todos', 'urgente', 'alta', 'normal'

  // Cambiar prioridad
  const handleChangePriority = async (order: Order, newPriority: string) => {
    try {
      await fetch(`/api/orders/${order.id}/priority`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: newPriority })
      });
    } catch (err: any) {}
    onOrderUpdated({ ...order, priority: newPriority as any });
  };

  // Archivar o desarchivar pedido
  const handleToggleArchive = async (order: Order) => {
    const willArchive = !order.is_archived;
    const action = willArchive ? 'archivar' : 'desarchivar';
    if (!window.confirm(`¿Desea ${action} el pedido ${order.folio} de ${order.customer_name}?`)) {
      return;
    }

    try {
      await fetch(`/api/orders/${order.id}/archive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_archived: willArchive ? 1 : 0 })
      });
    } catch (err: any) {}
    onOrderUpdated({ ...order, is_archived: willArchive ? 1 : 0 });
  };

  // Eliminar pedido
  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`¿Está seguro de eliminar permanentemente el pedido ${order.folio} de "${order.customer_name}"?`)) {
      return;
    }
    try {
      await fetch(`/api/orders/${order.id}`, { method: 'DELETE' });
    } catch (err: any) {}
    if (onOrderDeleted) {
      onOrderDeleted(order.id);
    }
  };

  // Filtrar pedidos en memoria para respuesta instantánea
  const filteredOrders = orders.filter(order => {
    // Búsqueda por texto (Lupa)
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch = !term || (
      (order.customer_name || '').toLowerCase().includes(term) ||
      (order.customer_phone || '').toLowerCase().includes(term) ||
      (order.folio || '').toLowerCase().includes(term) ||
      (order.school_name || '').toLowerCase().includes(term) ||
      (order.seller_name || '').toLowerCase().includes(term) ||
      order.items?.some(it => 
        (it.product_name || '').toLowerCase().includes(term) || 
        (it.size || '').toLowerCase().includes(term)
      )
    );

    // Filtro por Tipo de Venta
    const matchesType = filterType === 'todos' || order.order_type === filterType;

    // Filtro por Pago
    const matchesPayment = filterPayment === 'todos' || (
      filterPayment === 'con_saldo' ? order.balance_due > 0 : order.balance_due <= 0.01
    );

    // Filtro por Entrega
    const matchesDelivery = filterDelivery === 'todos' || (
      filterDelivery === 'pendiente' 
        ? (order.delivery_status === 'pendiente' || order.delivery_status === 'parcial')
        : order.delivery_status === 'entregado'
    );

    // Filtro por Archivo
    const matchesArchived = filterArchived === 'todos' || (
      filterArchived === 'archivados' ? Boolean(order.is_archived) : !order.is_archived
    );

    // Filtro por Prioridad
    const matchesPriority = filterPriority === 'todos' || (order.priority || 'normal') === filterPriority;

    return matchesSearch && matchesType && matchesPayment && matchesDelivery && matchesArchived && matchesPriority;
  });

  // Ordenar con Urgente primero, luego Alta, luego Normal, luego por ID desc
  const priorityOrder: Record<string, number> = { urgente: 1, alta: 2, normal: 3, baja: 4 };
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const weightA = priorityOrder[a.priority || 'normal'] || 3;
    const weightB = priorityOrder[b.priority || 'normal'] || 3;
    if (weightA !== weightB) return weightA - weightB;
    return b.id - a.id;
  });

  return (
    <div className="space-y-6">
      
      {/* Barra de Búsqueda con Lupa y Filtros */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-blue-600 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="🔍 Buscar por cliente (ej. Juan, Julisa), teléfono, folio (#PED-1001), escuela..."
            className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Chips de Filtrado Rápido */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="font-bold text-slate-500 mr-1">Filtros:</span>

          {/* Archivo: Activos vs Archivados */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterArchived('activos')}
              className={`px-2.5 py-1 rounded-md font-bold transition ${filterArchived === 'activos' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
            >
              Activos
            </button>
            <button
              type="button"
              onClick={() => setFilterArchived('archivados')}
              className={`px-2.5 py-1 rounded-md font-bold transition flex items-center gap-1 ${filterArchived === 'archivados' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-600'}`}
            >
              <Archive className="w-3.5 h-3.5" />
              Archivados
            </button>
            <button
              type="button"
              onClick={() => setFilterArchived('todos')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterArchived === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Todos
            </button>
          </div>

          {/* Prioridad */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterPriority('todos')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterPriority === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Prioridad: Todas
            </button>
            <button
              type="button"
              onClick={() => setFilterPriority('urgente')}
              className={`px-2.5 py-1 rounded-md font-bold transition ${filterPriority === 'urgente' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              🚨 Urgentes
            </button>
            <button
              type="button"
              onClick={() => setFilterPriority('alta')}
              className={`px-2.5 py-1 rounded-md font-bold transition ${filterPriority === 'alta' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600'}`}
            >
              ⭐ Alta
            </button>
          </div>

          {/* Tipo de venta */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterType('todos')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterType === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
            >
              Tipo: Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterType('pedido')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterType === 'pedido' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Sobre Pedido
            </button>
            <button
              type="button"
              onClick={() => setFilterType('directa')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterType === 'directa' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Directa
            </button>
          </div>

          {/* Saldo / Pago */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterPayment('con_saldo')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterPayment === 'con_saldo' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Con Saldo
            </button>
            <button
              type="button"
              onClick={() => setFilterPayment('liquidado')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterPayment === 'liquidado' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Liquidados
            </button>
          </div>

          {/* Entregas */}
          <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFilterDelivery('pendiente')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterDelivery === 'pendiente' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Por Entregar
            </button>
            <button
              type="button"
              onClick={() => setFilterDelivery('entregado')}
              className={`px-2.5 py-1 rounded-md font-semibold transition ${filterDelivery === 'entregado' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600'}`}
            >
              Entregados
            </button>
          </div>

          <span className="ml-auto text-slate-500 font-medium text-xs">
            Mostrando <strong>{sortedOrders.length}</strong> pedidos
          </span>
        </div>
      </div>

      {/* Lista de Resultados */}
      {sortedOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <Search className="w-12 h-12 text-slate-300 mx-auto" />
          <h4 className="text-base font-bold text-slate-700">No se encontraron pedidos</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filterArchived === 'archivados' 
              ? 'No hay pedidos archivados que coincidan con la búsqueda.' 
              : 'Intente con otro término o revise los filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map(order => {
            const hasPendingBalance = order.balance_due > 0;
            const isFullyDelivered = order.delivery_status === 'entregado';
            const isPartialDelivered = order.delivery_status === 'parcial';
            const isUrgent = order.priority === 'urgente';
            const isHigh = order.priority === 'alta';

            return (
              <div
                key={order.id}
                className={`bg-white rounded-2xl shadow-xs border p-5 transition space-y-4 ${
                  order.is_archived
                    ? 'border-slate-300 bg-slate-50/70 opacity-80'
                    : isUrgent
                      ? 'border-red-400 ring-2 ring-red-300/40 shadow-md'
                      : isHigh
                        ? 'border-amber-300 ring-1 ring-amber-200'
                        : 'border-slate-200/80 hover:border-blue-300'
                }`}
              >
                {/* Cabecera del Pedido */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                        {order.folio}
                      </span>
                      
                      <span className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        order.order_type === 'directa' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-900'
                      }`}>
                        {order.order_type === 'directa' ? 'Venta Directa' : 'Sobre Pedido'}
                      </span>
                      
                      {/* Estado Entrega Badge */}
                      <span className={`px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1 ${
                        isFullyDelivered 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : isPartialDelivered
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {isFullyDelivered ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {isFullyDelivered ? 'Entregado' : isPartialDelivered ? 'Entrega Parcial' : 'Pendiente de Entrega'}
                      </span>

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
                          title="Cambiar prioridad del cliente/pedido"
                        >
                          <option value="normal">Prioridad: Normal</option>
                          <option value="alta">⭐ Prioridad Alta</option>
                          <option value="urgente">🚨 URGENTE</option>
                          <option value="baja">Baja</option>
                        </select>
                      </div>

                      {/* Badge de Archivado */}
                      {Boolean(order.is_archived) && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-600 text-white flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          Archivado
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pt-1 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDateTime(order.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        Vendedor: <strong className="text-slate-700">{order.seller_name}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Botones de Acción */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectOrderForTicket(order)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition border border-slate-200 cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      Ticket / PDF
                    </button>

                    {hasPendingBalance && (
                      <button
                        type="button"
                        onClick={() => onSelectOrderForPayment(order)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        Abonar / Liquidar
                      </button>
                    )}

                    {!isFullyDelivered && (
                      <button
                        type="button"
                        onClick={() => onSelectOrderForDelivery(order)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        Entregar Prendas
                      </button>
                    )}

                    {/* Botón Archivar / Desarchivar */}
                    <button
                      type="button"
                      onClick={() => handleToggleArchive(order)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition border cursor-pointer ${
                        order.is_archived
                          ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                      title={order.is_archived ? 'Regresar pedido a activos' : 'Archivar pedido finalizado para despejar la lista'}
                    >
                      {order.is_archived ? (
                        <>
                          <ArchiveRestore className="w-3.5 h-3.5 text-blue-600" />
                          <span>Desarchivar</span>
                        </>
                      ) : (
                        <>
                          <Archive className="w-3.5 h-3.5 text-slate-500" />
                          <span>Archivar</span>
                        </>
                      )}
                    </button>

                    {/* Botón Eliminar Pedido */}
                    <button
                      type="button"
                      onClick={() => handleDeleteOrder(order)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 cursor-pointer"
                      title="Eliminar pedido permanentemente"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Eliminar</span>
                    </button>
                  </div>
                </div>

                {/* Cliente, Escuela y Desglose Financiero */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  
                  {/* Info Cliente & Escuela */}
                  <div className="md:col-span-5 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-800">
                      <School className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-bold">{order.school_name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-semibold text-sm">{order.customer_name}</span>
                      {order.customer_phone && (
                        <span className="text-slate-500 font-normal text-xs">
                          • Tel: {order.customer_phone}
                        </span>
                      )}
                    </div>

                    {order.notes && (
                      <p className="text-[11px] text-slate-500 italic pl-5">
                        Nota: {order.notes}
                      </p>
                    )}
                  </div>

                  {/* Prendas Solicitadas */}
                  <div className="md:col-span-4 border-l border-slate-100 pl-4 space-y-1 text-xs">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">Prendas / Tallas:</span>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {order.items?.map((it, idx) => {
                        const itDelivered = (it.delivered_quantity || 0) >= it.quantity;
                        return (
                          <div key={idx} className="flex items-center justify-between text-slate-700 text-[11px]">
                            <span>
                              <strong>{it.quantity}x</strong> {it.product_name}{' '}
                              <span className="px-1 py-0.2 bg-slate-100 rounded text-slate-800 font-semibold text-[10px]">
                                Talla {it.size}
                              </span>
                            </span>
                            {order.order_type === 'pedido' && (
                              <span className={`text-[10px] font-semibold ${
                                itDelivered ? 'text-emerald-600' : 'text-amber-700'
                              }`}>
                                {itDelivered ? '✓ Entregado' : `Pendiente (${it.quantity - (it.delivered_quantity || 0)})`}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Balance Financiero */}
                  <div className="md:col-span-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Total:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>A Cuenta:</span>
                      <span className="font-semibold text-emerald-700">{formatCurrency(order.deposit_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200">
                      <span className="font-bold text-slate-700">Resta:</span>
                      <span className={`font-extrabold ${hasPendingBalance ? 'text-red-600' : 'text-emerald-700'}`}>
                        {formatCurrency(order.balance_due)}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
