import React, { useState } from 'react';
import type { Order } from '../types';
import { formatCurrency } from '../utils/formatters';
import { DollarSign, X, Check, Banknote, CreditCard, ArrowRightLeft } from 'lucide-react';
import { localDb } from '../services/localDatabase';

interface PaymentModalProps {
  order: Order;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: Order) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  order,
  onClose,
  onPaymentSuccess
}) => {
  const [amount, setAmount] = useState<string>(String(order.balance_due));
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');
  const [notes, setNotes] = useState<string>('Liquidación / Abono a cuenta');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handlePayFull = () => {
    setAmount(String(order.balance_due));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payNum = parseFloat(amount);
    if (isNaN(payNum) || payNum <= 0) {
      setErrorMessage('Ingrese un monto válido mayor a 0');
      return;
    }
    if (payNum > order.balance_due + 0.01) {
      if (!window.confirm(`El monto ($${payNum}) supera el saldo pendiente ($${order.balance_due}). ¿Desea continuar?`)) {
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const updatedOrder = localDb.addPayment(order.id, payNum, paymentMethod, notes.trim());
      onPaymentSuccess(updatedOrder);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar abono');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Registrar Abono o Liquidación
            </h3>
            <p className="text-xs text-slate-500">Folio: <strong className="text-blue-600">{order.folio}</strong> • {order.customer_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Actual */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Total del Pedido:</span>
            <span className="font-bold text-slate-900">{formatCurrency(order.total_amount)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Anticipo acumulado (A cuenta):</span>
            <span className="font-semibold text-emerald-700">{formatCurrency(order.deposit_amount)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
            <span className="font-bold text-red-700">Saldo Restante Actual:</span>
            <span className="font-black text-red-600">{formatCurrency(order.balance_due)}</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Formulario de Pago */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Monto del Abono / Pago ($MXN) *
              </label>
              <button
                type="button"
                onClick={handlePayFull}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
              >
                Liquidar Todo ({formatCurrency(order.balance_due)})
              </button>
            </div>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="number"
                step="any"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Método de Pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('Efectivo')}
                className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  paymentMethod === 'Efectivo'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition shrink-0 ${
                  paymentMethod === 'Efectivo' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                }`}>
                  {paymentMethod === 'Efectivo' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">Efectivo</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Tarjeta de Débito/Crédito')}
                className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  paymentMethod === 'Tarjeta de Débito/Crédito'
                    ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition shrink-0 ${
                  paymentMethod === 'Tarjeta de Débito/Crédito' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                }`}>
                  {paymentMethod === 'Tarjeta de Débito/Crédito' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="truncate">Tarjeta</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('Transferencia')}
                className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  paymentMethod === 'Transferencia'
                    ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center border transition shrink-0 ${
                  paymentMethod === 'Transferencia' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                }`}>
                  {paymentMethod === 'Transferencia' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </div>
                <ArrowRightLeft className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <span className="truncate">Transf.</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notas del Pago
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Liquidación al recoger prendas"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Guardando...' : 'Confirmar Abono'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
