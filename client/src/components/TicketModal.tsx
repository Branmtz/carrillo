import React, { useState } from 'react';
import type { Order } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { generateTicketPDF } from '../utils/pdfGenerator';
import { Printer, Download, Share2, X, Check, School, User } from 'lucide-react';

interface TicketModalProps {
  order: Order;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ order, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateTicketPDF(order, { autoSave: true });
  };

  const handleShareWhatsApp = () => {
    const itemsText = order.items
      .map(it => `• ${it.quantity}x ${it.product_name} (Talla ${it.size})${it.price_type === 'paquete' ? ' [Paquete]' : ''} - ${formatCurrency(it.subtotal)}`)
      .join('\n');

    const balanceText = order.balance_due > 0
      ? `*A Cuenta:* ${formatCurrency(order.deposit_amount)}\n*Resta por Pagar:* ${formatCurrency(order.balance_due)}`
      : `*Total Pagado:* ${formatCurrency(order.total_amount)} (Liquidado 100%)`;

    const message = `*UNIFORMES CARRILLO*\n` +
      `Comprobante de ${order.order_type === 'directa' ? 'Venta Directa' : 'Pedido'}${order.priority === 'urgente' ? ' (URGENTE)' : ''}\n` +
      `--------------------------------\n` +
      `*Folio:* ${order.folio}\n` +
      `*Cliente:* ${order.customer_name}\n` +
      `*Escuela:* ${order.school_name}\n` +
      `*Fecha:* ${formatDateTime(order.created_at)}\n` +
      `--------------------------------\n` +
      `*Prendas:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*Total:* ${formatCurrency(order.total_amount)}\n` +
      `${balanceText}\n` +
      `*Estatus Entrega:* ${order.delivery_status.toUpperCase()}\n` +
      `--------------------------------\n` +
      `Favor de presentar este comprobante al recoger su pedido. ¡Gracias por su preferencia!`;

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });

    if (order.customer_phone) {
      const cleanPhone = order.customer_phone.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 no-print">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Comprobante de Venta</h3>
            <p className="text-xs text-slate-500">Folio: <span className="font-semibold text-blue-600">{order.folio}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-full transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body - Thermal Ticket Preview */}
        <div className="p-6 overflow-y-auto bg-slate-100/50 flex justify-center">
          <div
            id="printable-ticket"
            className="w-full max-w-[340px] bg-white p-5 rounded-lg shadow-md border border-slate-200 text-slate-800 font-mono text-xs leading-tight"
          >
            {/* Ticket Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <h2 className="text-base font-bold tracking-tight text-slate-900 font-sans">UNIFORMES CARRILLO</h2>
              <p className="text-[10px] text-slate-600 uppercase font-sans">Punto de Venta & Confección</p>
              <div className="mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-bold border border-slate-700">
                {order.folio}
              </div>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                  order.order_type === 'directa' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {order.order_type === 'directa' ? 'VENTA DIRECTA' : 'COMPRA SOBRE PEDIDO'}
                </span>
                {order.priority === 'urgente' && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white">
                    🚨 URGENTE
                  </span>
                )}
                {order.priority === 'alta' && (
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                    ⭐ ALTA
                  </span>
                )}
              </div>
            </div>

            {/* Ticket Details */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span>{formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Atendió:</span>
                <span className="font-semibold">{order.seller_name || 'Cajero'}</span>
              </div>
              <div className="pt-1">
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <School className="w-3 h-3 text-blue-600 no-print" />
                  <span>{order.school_name}</span>
                </div>
              </div>
              <div className="pt-0.5">
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <User className="w-3 h-3 text-slate-500 no-print" />
                  <span>Cliente: {order.customer_name}</span>
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-1 text-slate-600 pl-4">
                    <span>Tel: {order.customer_phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Items */}
            <div className="py-2.5 border-b border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase pb-1 border-b border-slate-200">
                <span>Cant / Prenda</span>
                <span>Importe</span>
              </div>
              <div className="divide-y divide-slate-100">
                {order.items.map((item, idx) => (
                  <div key={idx} className="py-1.5">
                    <div className="flex justify-between font-medium">
                      <span className="flex items-center gap-1">
                        {item.quantity}x {item.product_name}
                        {item.price_type === 'paquete' && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-bold border border-emerald-300">
                            PAQUETE
                          </span>
                        )}
                      </span>
                      <span>{formatCurrency(item.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>Talla: <strong className="text-slate-800">{item.size}</strong> @ {formatCurrency(item.unit_price)}</span>
                      {order.order_type === 'pedido' && (
                        <span className={(item.delivered_quantity || 0) >= item.quantity ? 'text-emerald-600 font-bold' : 'text-amber-700'}>
                          {(item.delivered_quantity || 0) >= item.quantity ? '✓ Entregado' : `Pendiente (${item.quantity - (item.delivered_quantity || 0)})`}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL:</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>A Cuenta (Anticipo):</span>
                <span>{formatCurrency(order.deposit_amount)}</span>
              </div>

              {order.balance_due > 0 ? (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-900 font-bold flex justify-between items-center text-xs">
                  <span>RESTA POR PAGAR:</span>
                  <span className="text-sm">{formatCurrency(order.balance_due)}</span>
                </div>
              ) : (
                <div className="mt-2 p-1.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 font-bold text-center text-xs">
                  ¡TOTALMENTE PAGADO!
                </div>
              )}
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="py-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600 italic">
                <strong>Nota:</strong> {order.notes}
              </div>
            )}

            {/* Footer Notice */}
            <div className="pt-3 border-t border-dashed border-slate-400 text-center space-y-1">
              <p className="font-bold text-[11px]">¡GRACIAS POR SU COMPRA!</p>
              <p className="text-[9px] text-slate-500">
                Presente este ticket para recoger su pedido o realizar cualquier consulta.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2 no-print">
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition border border-emerald-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            {copied ? '¡Copiado al portapapeles!' : 'Copiar / WhatsApp'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-200"
            >
              <Download className="w-4 h-4 text-slate-600" />
              Descargar PDF
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              Imprimir Ticket
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
