import React from 'react';
import { ShoppingCart, Search, Scissors, School, RefreshCw, Calculator } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface NavbarProps {
  activeTab: 'pos' | 'search' | 'production' | 'catalog' | 'quotes';
  setActiveTab: (tab: 'pos' | 'search' | 'production' | 'catalog' | 'quotes') => void;
  pendingPiecesCount: number;
  totalBalanceDue: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingPiecesCount,
  totalBalanceDue,
  onRefresh,
  isRefreshing
}) => {
  return (
    <header className="bg-white border-b border-slate-200/80 sticky top-0 z-40 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('pos')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 tracking-tight leading-none m-0">
                Uniformes <span className="text-blue-600">Carrillo</span>
              </h1>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
                Ventas, Confección & Entregas
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'pos'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Punto de Venta</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('quotes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'quotes'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Cotizador & Precios</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'search'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Búsqueda de Clientes</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('production')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition relative ${
                activeTab === 'production'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors className="w-4 h-4" />
              <span>Control de Producción</span>
              {pendingPiecesCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px] font-black">
                  {pendingPiecesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('catalog')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'catalog'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <School className="w-4 h-4" />
              <span>Escuelas y Catálogo</span>
            </button>
          </nav>

          {/* Quick Metrics & Refresh Button */}
          <div className="flex items-center gap-3">
            {totalBalanceDue > 0 && (
              <div 
                onClick={() => setActiveTab('search')}
                className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100/80 border border-red-200 rounded-xl cursor-pointer transition text-xs"
                title="Total restante por cobrar a clientes"
              >
                <span className="text-[11px] text-red-700 font-semibold">Por cobrar:</span>
                <span className="font-extrabold text-red-700">{formatCurrency(totalBalanceDue)}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition border border-slate-200"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden overflow-x-auto py-2 gap-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'pos' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Punto de Venta
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('quotes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'quotes' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Cotizador & Precios
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'search' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Búsqueda
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'production' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Producción ({pendingPiecesCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
              activeTab === 'catalog' ? 'bg-blue-600 text-white' : 'text-slate-600 bg-slate-100'
            }`}
          >
            Catálogos
          </button>
        </div>

      </div>
    </header>
  );
};
