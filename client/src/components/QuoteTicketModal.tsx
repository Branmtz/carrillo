import React, { useState } from 'react';
import type { Quote } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { generateQuoteTicketPDF } from '../utils/pdfGenerator';
import { Printer, Download, Share2, X, Check, School, User, ShoppingCart } from 'lucide-react';

interface QuoteTicketModalProps {
  quote: Quote;
  onClose: () => void;
  onTransferToPos?: (quote: Quote) => void;
}

export const QuoteTicketModal: React.FC<QuoteTicketModalProps> = ({ quote, onClose, onTransferToPos }) => {
  const [copied, setCopied] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    generateQuoteTicketPDF(quote, { autoSave: true });
  };

  const handleShareWhatsApp = () => {
    const itemsText = quote.items
      .map(it => `• ${it.quantity}x ${it.product_name} (Talla ${it.size})${it.price_type === 'paquete' ? ' [Precio Paquete]' : ' [Pieza Suelta]'} - ${formatCurrency(it.subtotal)}`)
      .join('\n');

    const message = `*UNIFORMES CARRILLO*\n` +
      `*COTIZACIÓN DE UNIFORMES ESCOLARES*\n` +
      `--------------------------------\n` +
      `*Folio de Cotización:* ${quote.folio}\n` +
      `*Cliente:* ${quote.customer_name}\n` +
      `*Escuela:* ${quote.school_name}\n` +
      `*Fecha:* ${formatDateTime(quote.created_at)}\n` +
      `*Atendió:* ${quote.seller_name || 'Vendedor'}\n` +
      `--------------------------------\n` +
      `*Prendas Cotizadas:*\n${itemsText}\n` +
      `--------------------------------\n` +
      `*TOTAL PRESUPUESTADO:* ${formatCurrency(quote.total_amount)}\n` +
      `*Anticipo sugerido (50%):* ${formatCurrency(Math.round(quote.total_amount * 0.5))}\n` +
      `--------------------------------\n` +
      `_Nota: Presupuesto informativo válido por 15 días. Para apartado o confección se requiere el 50% de anticipo. ¡Estamos a sus órdenes!_`;

    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });

    if (quote.customer_phone) {
      const cleanPhone = quote.customer_phone.replace(/\D/g, '');
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
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-md uppercase">
                Cotización Informativa
              </span>
              <span className="text-xs text-slate-500 font-semibold">Folio: {quote.folio}</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mt-0.5">Ticket de Cotización (Sin Cobro)</h3>
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
              
              <div className="mt-2 py-1 px-2 bg-blue-50 border border-blue-200 rounded text-center">
                <span className="text-[11px] font-black text-blue-900 block font-sans tracking-wide">
                  *** COTIZACIÓN / PRESUPUESTO ***
                </span>
                <span className="text-[9px] text-blue-700 font-sans block">
                  (Comprobante informativo • Sin valor de cobro)
                </span>
              </div>

              <div className="mt-2 inline-block px-2 py-0.5 rounded text-[11px] font-bold border border-slate-700">
                {quote.folio}
              </div>
            </div>

            {/* Ticket Details */}
            <div className="py-2.5 space-y-1 border-b border-dashed border-slate-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha:</span>
                <span>{formatDateTime(quote.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cotizó:</span>
                <span className="font-semibold">{quote.seller_name || 'Vendedor'}</span>
              </div>
              <div className="pt-1">
                <div className="flex items-center gap-1 font-bold text-slate-900">
                  <School className="w-3 h-3 text-blue-600 no-print" />
                  <span>{quote.school_name}</span>
                </div>
              </div>
              <div className="pt-0.5">
                <div className="flex items-center gap-1 font-semibold text-slate-800">
                  <User className="w-3 h-3 text-slate-500 no-print" />
                  <span>Cliente: {quote.customer_name || 'Cliente General'}</span>
                </div>
                {quote.customer_phone && (
                  <div className="flex items-center gap-1 text-slate-600 pl-4">
                    <span>Tel: {quote.customer_phone}</span>
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
                {quote.items.map((item, idx) => (
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
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="py-2.5 space-y-1.5 text-xs">
              <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                <span>TOTAL COTIZADO:</span>
                <span className="text-base text-blue-700">{formatCurrency(quote.total_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-600 text-[11px] pt-1">
                <span>Anticipo sugerido (50%):</span>
                <span className="font-bold">{formatCurrency(Math.round(quote.total_amount * 0.5))}</span>
              </div>
            </div>

            {/* Notes */}
            {quote.notes && (
              <div className="py-2 border-t border-dashed border-slate-300 text-[10px] text-slate-600 italic">
                <strong>Nota:</strong> {quote.notes}
              </div>
            )}

            {/* Footer Terms */}
            <div className="pt-3 border-t border-dashed border-slate-400 text-center space-y-1.5 text-[10px] text-slate-600">
              <div className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[9px] space-y-0.5 text-left font-sans">
                <p className="font-bold text-slate-800">CONDICIONES:</p>
                <p>• Presupuesto informativo válido por 15 días.</p>
                <p>• Para iniciar confección se requiere 50% de anticipo.</p>
              </div>
              <p className="font-bold text-[11px] text-slate-900 pt-1">¡GRACIAS POR SU PREFERENCIA!</p>
              <p className="text-[9px] text-slate-500">
                Presente este comprobante para iniciar su pedido.
              </p>
            </div>

          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          {onTransferToPos && (
            <button
              type="button"
              onClick={() => onTransferToPos(quote)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              title="Cargar esta cotización en el Punto de Venta para cobrarla"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Convertir en Venta / Cobrar</span>
            </button>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={handlePrint}
              className="flex-1 sm:flex-initial px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir Ticket</span>
            </button>

            <button
              onClick={handleDownloadPDF}
              className="p-2 text-slate-700 hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
              title="Descargar Ticket en PDF"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={handleShareWhatsApp}
              className={`px-3 py-2 border rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
              }`}
              title="Enviar cotización por WhatsApp"
            >
              {copied ? <Check className="w-4 h-4 stroke-[3]" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? '¡Copiado!' : 'WhatsApp'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
