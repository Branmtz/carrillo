import React, { useState, useEffect } from 'react';
import type { School, Product, Quote, QuoteItem, OrderItem } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateSchoolPriceListPDF } from '../utils/pdfGenerator';
import { getLocalQuotes, saveLocalQuotes } from '../utils/localFallback';
import { QuoteTicketModal } from './QuoteTicketModal';
import { 
  Calculator, FileSpreadsheet, Search, School as SchoolIcon, 
  FileDown, Plus, Trash2, ShoppingCart, User, Phone, 
  Tag, Package, Shirt, Layers, Clock, AlertCircle, 
  Printer
} from 'lucide-react';

interface PriceListAndQuoteProps {
  schools: School[];
  products: Product[];
  onTransferQuoteToPos: (quoteData: {
    schoolName: string;
    customerName: string;
    customerPhone: string;
    items: OrderItem[];
    notes?: string;
  }) => void;
}

const COMMON_SIZES = [
  '4', '6', '8', '10', '12', '14', '16', 
  '28', '30', '32', '34', 
  'CH', 'M', 'G', 'XG'
];

export const PriceListAndQuote: React.FC<PriceListAndQuoteProps> = ({
  schools,
  products,
  onTransferQuoteToPos
}) => {
  // Pestaña principal: Lista de Precios vs Cotizador
  const [mainTab, setMainTab] = useState<'prices' | 'quote'>('prices');

  // ==================== ESTADOS DE LISTA DE PRECIOS ====================
  const [priceListSchool, setPriceListSchool] = useState<string>('todas');
  const [priceSearchQuery, setPriceSearchQuery] = useState<string>('');
  const [priceCategoryFilter, setPriceCategoryFilter] = useState<string>('todos');

  // Sincronizar primera escuela si hay escuelas disponibles
  useEffect(() => {
    if (priceListSchool === 'todas' && schools.length > 0) {
      setPriceListSchool(schools[0].name);
    }
  }, [schools, priceListSchool]);

  // ==================== ESTADOS DE COTIZADOR ====================
  const [quoteSchool, setQuoteSchool] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [sellerName, setSellerName] = useState<string>(localStorage.getItem('default_seller') || 'Vendedor 1');
  const [quoteNotes, setQuoteNotes] = useState<string>('Precios vigentes por 15 días');

  // Modo en cotizador: individual vs paquete completo
  const [entryMode, setEntryMode] = useState<'individual' | 'paquete_completo'>('individual');

  // Prenda individual a cotizar
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [customSize, setCustomSize] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(300);
  const [itemPriceType, setItemPriceType] = useState<'unitario' | 'paquete'>('unitario');

  // Paquete Completo 6 prendas en cotizador
  const [pkgGlobalSize, setPkgGlobalSize] = useState<string>('M');
  const [pkgSizes, setPkgSizes] = useState<Record<string, string>>({
    sweater: 'M',
    camisa: 'M',
    pantalon: 'M',
    chamarra: 'M',
    playera: 'M',
    pans: 'M'
  });
  const [pkgChazarillaChoice, setPkgChazarillaChoice] = useState<'Camisa' | 'Chazarilla'>('Camisa');
  const [pkgFaldaPantalonChoice, setPkgFaldaPantalonChoice] = useState<'Pantalón' | 'Falda'>('Pantalón');
  const [pkgIncludeCorbata, setPkgIncludeCorbata] = useState<boolean>(false);
  const [pkgCorbataChoice, setPkgCorbataChoice] = useState<'Corbata' | 'Corbatín'>('Corbata');
  const [pkgQuantity, setPkgQuantity] = useState<number>(1);

  // Items en la cotización actual
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [isSubmittingQuote, setIsSubmittingQuote] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modal de ticket de cotización emitido
  const [activeQuoteTicket, setActiveQuoteTicket] = useState<Quote | null>(null);

  // Historial de cotizaciones recientes
  const [recentQuotes, setRecentQuotes] = useState<Quote[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState<boolean>(false);

  // Sincronizar escuela por defecto para cotizador
  useEffect(() => {
    if (!quoteSchool && schools.length > 0) {
      setQuoteSchool(schools[0].name);
    }
  }, [schools, quoteSchool]);

  // Cargar cotizaciones recientes
  const loadRecentQuotes = async () => {
    setIsLoadingQuotes(true);
    let quotesList: Quote[] | null = null;
    try {
      const res = await fetch('/api/quotes').catch(() => null);
      if (res && res.ok) {
        quotesList = await res.json();
      }
    } catch (err) {
      console.warn('Error al cargar cotizaciones del backend:', err);
    }

    if (quotesList && quotesList.length >= 0) {
      setRecentQuotes(quotesList);
      saveLocalQuotes(quotesList);
    } else {
      setRecentQuotes(getLocalQuotes());
    }
    setIsLoadingQuotes(false);
  };

  useEffect(() => {
    loadRecentQuotes();
  }, []);

  // Productos disponibles según escuela seleccionada
  const getAvailableProductsForSchool = (schoolName: string) => {
    return products.filter(p => {
      if (!p.school_name || p.school_name === 'Todas') return true;
      return p.school_name === schoolName;
    });
  };

  const availableProducts = getAvailableProductsForSchool(quoteSchool);

  // Inicializar producto seleccionado al cambiar escuela en cotizador
  useEffect(() => {
    if (availableProducts.length > 0) {
      const exists = availableProducts.find(p => p.name === selectedProduct);
      if (!exists) {
        setSelectedProduct(availableProducts[0].name);
        setItemPrice(
          itemPriceType === 'paquete' && availableProducts[0].package_price
            ? availableProducts[0].package_price
            : availableProducts[0].default_price
        );
      }
    }
  }, [quoteSchool, availableProducts, selectedProduct, itemPriceType]);

  // Manejador de cambio de producto individual
  const handleProductChange = (prodName: string) => {
    setSelectedProduct(prodName);
    const prod = availableProducts.find(p => p.name === prodName);
    if (prod) {
      if (itemPriceType === 'paquete' && prod.package_price && prod.package_price > 0) {
        setItemPrice(prod.package_price);
      } else {
        setItemPrice(prod.default_price);
      }
    }
  };

  const handlePriceTypeChange = (type: 'unitario' | 'paquete') => {
    setItemPriceType(type);
    const prod = availableProducts.find(p => p.name === selectedProduct);
    if (prod) {
      if (type === 'paquete' && prod.package_price && prod.package_price > 0) {
        setItemPrice(prod.package_price);
      } else {
        setItemPrice(prod.default_price);
      }
    }
  };

  // Helper para paquete completo en cotizador
  const getGarmentCatalogInfo = (type: 'sweater' | 'camisa' | 'pantalon' | 'chamarra' | 'playera' | 'pans' | 'corbata') => {
    let p: Product | undefined;
    let defaultLoose = 300;
    let defaultPkg = 250;
    let defaultName = '';

    const schoolProds = getAvailableProductsForSchool(quoteSchool);

    switch (type) {
      case 'sweater':
        p = schoolProds.find(pr => /su[eé]ter|sweater/i.test(pr.name));
        defaultName = 'Suéter Escolar';
        defaultLoose = 310;
        defaultPkg = 260;
        break;
      case 'camisa':
        p = schoolProds.find(pr => pkgChazarillaChoice === 'Chazarilla' ? /chazarilla/i.test(pr.name) : /camisa/i.test(pr.name)) || schoolProds.find(pr => /chazarilla|camisa/i.test(pr.name));
        defaultName = pkgChazarillaChoice === 'Chazarilla' ? 'Chazarilla Escolar' : 'Camisa Escolar';
        defaultLoose = 220;
        defaultPkg = 190;
        break;
      case 'pantalon':
        p = schoolProds.find(pr => pkgFaldaPantalonChoice === 'Falda' ? /falda/i.test(pr.name) : /pantal[oó]n/i.test(pr.name)) || schoolProds.find(pr => /pantal[oó]n|falda/i.test(pr.name));
        defaultName = pkgFaldaPantalonChoice === 'Falda' ? 'Falda Escolar' : 'Pantalón Escolar';
        defaultLoose = 280;
        defaultPkg = 240;
        break;
      case 'chamarra':
        p = schoolProds.find(pr => /chamarra/i.test(pr.name));
        defaultName = 'Chamarra Escolar';
        defaultLoose = 450;
        defaultPkg = 380;
        break;
      case 'playera':
        p = schoolProds.find(pr => /playera|polo/i.test(pr.name));
        defaultName = 'Playera Polo Escolar';
        defaultLoose = 200;
        defaultPkg = 170;
        break;
      case 'pans':
        p = schoolProds.find(pr => /pans/i.test(pr.name));
        defaultName = 'Pans Deportivo Escolar';
        defaultLoose = 550;
        defaultPkg = 480;
        break;
      case 'corbata':
        p = schoolProds.find(pr => pkgCorbataChoice === 'Corbatín' ? /corbat[ií]n/i.test(pr.name) : /corbata/i.test(pr.name)) || schoolProds.find(pr => /corbata|corbat[ií]n/i.test(pr.name));
        defaultName = pkgCorbataChoice === 'Corbatín' ? 'Corbatín Escolar' : 'Corbata Escolar';
        defaultLoose = 90;
        defaultPkg = 70;
        break;
    }

    const name = p ? p.name : defaultName;
    const loosePrice = p ? p.default_price : defaultLoose;
    const packagePrice = (p && p.package_price && p.package_price > 0) ? p.package_price : (p ? p.default_price : defaultPkg);

    return { name, loosePrice, packagePrice };
  };

  const pkgItemsConfig: Array<{ key: 'sweater' | 'camisa' | 'pantalon' | 'chamarra' | 'playera' | 'pans' | 'corbata'; label: string; sizeKey: string }> = [
    { key: 'sweater', label: 'Suéter', sizeKey: 'sweater' },
    { key: 'camisa', label: pkgChazarillaChoice, sizeKey: 'camisa' },
    { key: 'pantalon', label: pkgFaldaPantalonChoice, sizeKey: 'pantalon' },
    { key: 'chamarra', label: 'Chamarra', sizeKey: 'chamarra' },
    { key: 'playera', label: 'Playera Polo', sizeKey: 'playera' },
    { key: 'pans', label: 'Pans Deportivo', sizeKey: 'pans' }
  ];
  if (pkgIncludeCorbata) {
    pkgItemsConfig.push({ key: 'corbata', label: pkgCorbataChoice, sizeKey: 'corbata' });
  }

  const pkgTotalPackagePrice = pkgItemsConfig.reduce((acc, item) => acc + getGarmentCatalogInfo(item.key).packagePrice, 0) * pkgQuantity;
  const pkgTotalLoosePrice = pkgItemsConfig.reduce((acc, item) => acc + getGarmentCatalogInfo(item.key).loosePrice, 0) * pkgQuantity;
  const pkgSavings = Math.max(0, pkgTotalLoosePrice - pkgTotalPackagePrice);

  // Agregar prenda individual a la cotización
  const handleAddIndividualItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct.trim()) {
      setErrorMessage('Seleccione una prenda');
      return;
    }
    const finalSize = customSize.trim() ? customSize.trim().toUpperCase() : selectedSize;
    if (!finalSize) {
      setErrorMessage('Indique una talla');
      return;
    }

    const newItem: QuoteItem = {
      product_name: selectedProduct.trim(),
      size: finalSize,
      quantity: itemQuantity,
      unit_price: Number(itemPrice) || 0,
      subtotal: (Number(itemQuantity) || 1) * (Number(itemPrice) || 0),
      price_type: itemPriceType
    };

    setQuoteItems(prev => [...prev, newItem]);
    setCustomSize('');
    setItemQuantity(1);
    setErrorMessage('');
  };

  // Agregar paquete de 6 prendas a la cotización
  const handleAddCompletePackage = () => {
    const newItems: QuoteItem[] = pkgItemsConfig.map(cfg => {
      const info = getGarmentCatalogInfo(cfg.key);
      const chosenSize = cfg.key === 'corbata' ? 'Unitalla' : (pkgSizes[cfg.sizeKey] || pkgGlobalSize);
      return {
        product_name: info.name,
        size: chosenSize,
        quantity: pkgQuantity,
        unit_price: info.packagePrice,
        subtotal: pkgQuantity * info.packagePrice,
        price_type: 'paquete'
      };
    });

    setQuoteItems(prev => [...prev, ...newItems]);
    setErrorMessage('');
  };

  // Eliminar prenda de la cotización
  const handleRemoveQuoteItem = (index: number) => {
    setQuoteItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Total cotizado
  const totalQuoteAmount = quoteItems.reduce((acc, it) => acc + it.subtotal, 0);

  // Enviar y Guardar Cotización (Generar Ticket sin Cobro)
  const handleGenerateQuoteTicket = async () => {
    if (!quoteSchool.trim()) {
      setErrorMessage('Seleccione la escuela para la cotización');
      return;
    }
    if (quoteItems.length === 0) {
      setErrorMessage('Agregue al menos una prenda a la cotización');
      return;
    }

    setIsSubmittingQuote(true);
    setErrorMessage('');

    try {
      const payload = {
        customer_name: customerName.trim() || 'Cliente General',
        customer_phone: customerPhone.trim(),
        school_name: quoteSchool.trim(),
        seller_name: sellerName.trim() || 'Vendedor',
        total_amount: totalQuoteAmount,
        items: quoteItems,
        notes: quoteNotes.trim()
      };

      let savedQuote: Quote | null = null;
      try {
        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          savedQuote = await res.json();
        }
      } catch (e) {}

      if (!savedQuote) {
        // Fallback local (GitHub Pages)
        const quoteId = Date.now();
        savedQuote = {
          id: quoteId,
          folio: `COT-${Math.floor(1000 + Math.random() * 9000)}`,
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          school_name: payload.school_name,
          seller_name: payload.seller_name,
          total_amount: payload.total_amount,
          items: quoteItems,
          notes: payload.notes,
          created_at: new Date().toISOString()
        };
        const currentQuotes = getLocalQuotes();
        saveLocalQuotes([savedQuote, ...currentQuotes]);
      }

      // Abrir modal de ticket de cotización
      setActiveQuoteTicket(savedQuote);
      // Recargar lista reciente
      loadRecentQuotes();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al generar cotización');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Transferir cotización directamente a Punto de Venta para cobrar
  const handleTransferToPos = (quoteToTransfer: Quote) => {
    const orderItems: OrderItem[] = quoteToTransfer.items.map(it => ({
      product_name: it.product_name,
      size: it.size,
      quantity: it.quantity,
      delivered_quantity: 0,
      unit_price: it.unit_price,
      subtotal: it.subtotal,
      price_type: it.price_type || 'unitario',
      status: 'pendiente'
    }));

    onTransferQuoteToPos({
      schoolName: quoteToTransfer.school_name,
      customerName: quoteToTransfer.customer_name === 'Cliente General' ? '' : quoteToTransfer.customer_name,
      customerPhone: quoteToTransfer.customer_phone || '',
      items: orderItems,
      notes: quoteToTransfer.notes ? `De Cotización ${quoteToTransfer.folio}: ${quoteToTransfer.notes}` : `De Cotización ${quoteToTransfer.folio}`
    });

    if (activeQuoteTicket) setActiveQuoteTicket(null);
  };

  // Filtrar lista de precios
  const filteredPriceProducts = products.filter(p => {
    // Filtro de escuela
    if (priceListSchool !== 'todas') {
      const matchSchool = !p.school_name || p.school_name === 'Todas' || p.school_name === priceListSchool;
      if (!matchSchool) return false;
    }
    // Filtro de categoría
    if (priceCategoryFilter !== 'todos') {
      if (p.category !== priceCategoryFilter) return false;
    }
    // Búsqueda de texto
    if (priceSearchQuery.trim()) {
      const q = priceSearchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.category && p.category.toLowerCase().includes(q));
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Encabezado y Selector de Sub-Módulo */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight leading-none">
              Lista de Precios & Cotizador Rápido
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Consulta tarifas por escuela y genera presupuestos impresos para clientes sin cobro.
            </p>
          </div>
        </div>

        {/* Pestañas: Lista de Precios vs Cotizador */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setMainTab('prices')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${
              mainTab === 'prices'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Lista de Precios por Escuela</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('quote')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 font-bold rounded-lg transition cursor-pointer ${
              mainTab === 'quote'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Cotizador (Ticket sin Cobro)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN 1: VISOR DE LISTA DE PRECIOS POR ESCUELA */}
      {/* ========================================================================= */}
      {mainTab === 'prices' && (
        <div className="space-y-6">
          
          {/* Barra de Filtros y Controles de la Lista de Precios */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              
              {/* Selector de Escuela */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <SchoolIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <label className="text-xs font-bold text-slate-700 shrink-0">Escuela:</label>
                <select
                  value={priceListSchool}
                  onChange={(e) => setPriceListSchool(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="todas">Todas las Escuelas</option>
                  {schools.map(s => (
                    <option key={s.id} value={s.name}>🏫 {s.name}</option>
                  ))}
                </select>
              </div>

              {/* Botón de Descargar PDF de la Lista */}
              <button
                type="button"
                onClick={() => generateSchoolPriceListPDF(filteredPriceProducts, priceListSchool === 'todas' ? 'Catálogo General' : priceListSchool)}
                disabled={filteredPriceProducts.length === 0}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                title="Descargar lista oficial de precios en formato PDF"
              >
                <FileDown className="w-4 h-4" />
                <span>Descargar Lista PDF ({filteredPriceProducts.length} prendas)</span>
              </button>
            </div>

            {/* Buscador de Prenda y Filtro de Categoría */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar prenda o uniforme..."
                  value={priceSearchQuery}
                  onChange={(e) => setPriceSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {['todos', 'Deportivo', 'Diario', 'Gala / Abrigo', 'Accesorios'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPriceCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer shrink-0 ${
                      priceCategoryFilter === cat
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'todos' ? 'Todas las Categorías' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabla Comparativa de Precios: Suelto vs Paquete vs Ahorro */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Precios Registrados ({filteredPriceProducts.length} prendas)
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                💡 El precio por paquete aplica al adquirir el paquete de 6 prendas completas.
              </span>
            </div>

            {filteredPriceProducts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileSpreadsheet className="w-10 h-10 mx-auto stroke-[1.5] text-slate-300" />
                <p className="text-xs font-semibold text-slate-500">No se encontraron prendas con los filtros seleccionados</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/60 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Prenda / Uniforme</th>
                      <th className="py-3 px-4">Escuela Asignada</th>
                      <th className="py-3 px-4">Categoría</th>
                      <th className="py-3 px-4 text-right">Precio Pieza Suelta</th>
                      <th className="py-3 px-4 text-right">Precio en Paquete</th>
                      <th className="py-3 px-4 text-right">Ahorro en Paquete</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPriceProducts.map(prod => {
                      const loose = prod.default_price;
                      const pkg = prod.package_price || Math.round(loose * 0.85);
                      const savings = Math.max(0, loose - pkg);

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {prod.name}
                          </td>
                          <td className="py-3 px-4">
                            {prod.school_name && prod.school_name !== 'Todas' ? (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold rounded-md">
                                🏫 {prod.school_name}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md">
                                🌐 General (Todas)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {prod.category || 'General'}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-slate-800">
                            {formatCurrency(loose)}
                          </td>
                          <td className="py-3 px-4 text-right font-black text-emerald-700">
                            {formatCurrency(pkg)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {savings > 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[11px] rounded-md">
                                -{formatCurrency(savings)}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setMainTab('quote');
                                setQuoteSchool(prod.school_name && prod.school_name !== 'Todas' ? prod.school_name : (quoteSchool || schools[0]?.name || ''));
                                setSelectedProduct(prod.name);
                                setItemPrice(prod.default_price);
                                setItemPriceType('unitario');
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition inline-flex items-center gap-1 cursor-pointer"
                              title="Cotizar esta prenda para un cliente"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Cotizar</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SECCIÓN 2: COTIZADOR RÁPIDO CON IMPRESIÓN DE TICKET SIN COBRO */}
      {/* ========================================================================= */}
      {mainTab === 'quote' && (
        <div className="space-y-6">
          
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Columna Izquierda: Formulario de Cotización */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Card 1: Escuela y Datos del Cliente */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <SchoolIcon className="w-4 h-4 text-blue-600" />
                  Escuela y Datos del Presupuesto
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Escuela de la Cotización *
                    </label>
                    <select
                      value={quoteSchool}
                      onChange={(e) => setQuoteSchool(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {schools.map(s => (
                        <option key={s.id} value={s.name}>🏫 {s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nombre del Cliente (Opcional)
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Ej. Sra. María Gómez"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Teléfono / WhatsApp (Opcional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        placeholder="Ej. 614-123-4567"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cotizado / Atendido por
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Nombre del vendedor"
                        value={sellerName}
                        onChange={(e) => {
                          setSellerName(e.target.value);
                          localStorage.setItem('default_seller', e.target.value);
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Notas del Presupuesto (Vigencia, condiciones, etc.)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Precios válidos por 15 días, incluye logotipo bordado"
                      value={quoteNotes}
                      onChange={(e) => setQuoteNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Selector de Prendas a Cotizar */}
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    Prendas a Presupuestar
                  </h3>

                  <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                    <button
                      type="button"
                      onClick={() => setEntryMode('individual')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                        entryMode === 'individual'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Shirt className="w-3.5 h-3.5 text-blue-600" />
                      Prenda Individual
                    </button>

                    <button
                      type="button"
                      onClick={() => setEntryMode('paquete_completo')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-lg transition cursor-pointer ${
                        entryMode === 'paquete_completo'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-emerald-700 hover:text-emerald-900'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5" />
                      Paquete Completo (6 Pzas)
                    </button>
                  </div>
                </div>

                {/* MODALIDAD A: INDIVIDUAL */}
                {entryMode === 'individual' && (
                  <form onSubmit={handleAddIndividualItem} className="space-y-4">
                    {/* Régimen de precio */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-blue-600" />
                          Tarifa a Cotizar:
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {itemPriceType === 'unitario' ? 'Pieza Suelta' : 'Precio de Paquete'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => handlePriceTypeChange('unitario')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                            itemPriceType === 'unitario'
                              ? 'bg-white border-blue-600 text-blue-900 shadow-xs ring-1 ring-blue-600/30'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span>🏷️ Pieza Suelta (Unitario)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePriceTypeChange('paquete')}
                          className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition border cursor-pointer ${
                            itemPriceType === 'paquete'
                              ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>📦 Precio por Paquete</span>
                        </button>
                      </div>
                    </div>

                    {/* Prenda */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Prenda / Tipo de Uniforme
                      </label>
                      <select
                        value={selectedProduct}
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        {availableProducts.map(p => (
                          <option key={p.id} value={p.name}>
                            {p.name} — Suelto: {formatCurrency(p.default_price)} | Paquete: {formatCurrency(p.package_price || p.default_price)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tallas */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Talla
                      </label>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {COMMON_SIZES.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setSelectedSize(s);
                              setCustomSize('');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border cursor-pointer ${
                              selectedSize === s && !customSize
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Otra talla:</span>
                        <input
                          type="text"
                          placeholder="Ej. 18, Especial..."
                          value={customSize}
                          onChange={(e) => setCustomSize(e.target.value)}
                          className="w-36 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Cantidad y Precio */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad</label>
                        <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                          <button
                            type="button"
                            onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={itemQuantity}
                            onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-full text-center py-2 bg-transparent text-xs font-bold text-slate-800 focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setItemQuantity(itemQuantity + 1)}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Precio Unitario ($MXN)</label>
                        <input
                          type="number"
                          step="any"
                          min={0}
                          value={itemPrice}
                          onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Añadir a la Cotización ({formatCurrency((Number(itemQuantity) || 1) * (Number(itemPrice) || 0))})
                    </button>
                  </form>
                )}

                {/* MODALIDAD B: PAQUETE COMPLETO 6 PIEZAS */}
                {entryMode === 'paquete_completo' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                      <span className="text-xs font-black text-emerald-950 uppercase tracking-wide block">
                        📦 Paquete Escolar de 6 Piezas
                      </span>
                      <p className="text-[11px] text-emerald-800 mt-0.5">
                        Incluye Sweater, Chazarilla/Camisa, Falda/Pantalón, Chamarra, Playera y Pans con tarifa de paquete.
                      </p>
                    </div>

                    {/* Talla Global */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          Asignar misma talla a todo el paquete:
                        </span>
                        <span className="text-[11px] font-extrabold text-blue-600">
                          Talla: {pkgGlobalSize}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {COMMON_SIZES.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setPkgGlobalSize(s);
                              setPkgSizes({
                                sweater: s,
                                camisa: s,
                                pantalon: s,
                                chamarra: s,
                                playera: s,
                                pans: s
                              });
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition border cursor-pointer ${
                              pkgGlobalSize === s
                                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Lista detallada de las 6 prendas del paquete */}
                    <div className="space-y-2 pt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Prendas incluidas en el paquete:
                      </span>

                      {/* 1. Sweater */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">1. Suéter / Sweater</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {formatCurrency(getGarmentCatalogInfo('sweater').packagePrice)} (Paquete)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Talla:</span>
                          <select
                            value={pkgSizes.sweater || pkgGlobalSize}
                            onChange={(e) => setPkgSizes(prev => ({ ...prev, sweater: e.target.value }))}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            {COMMON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 2. Chazarilla / Camisa */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">2. Chazarilla / Camisa:</span>
                            <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setPkgChazarillaChoice('Camisa')}
                                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                                  pkgChazarillaChoice === 'Camisa' ? 'bg-blue-600 text-white' : 'text-slate-600'
                                }`}
                              >
                                Camisa
                              </button>
                              <button
                                type="button"
                                onClick={() => setPkgChazarillaChoice('Chazarilla')}
                                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                                  pkgChazarillaChoice === 'Chazarilla' ? 'bg-blue-600 text-white' : 'text-slate-600'
                                }`}
                              >
                                Chazarilla
                              </button>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {formatCurrency(getGarmentCatalogInfo('camisa').packagePrice)} (Paquete)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <span className="text-[11px] text-slate-500">Talla:</span>
                          <select
                            value={pkgSizes.camisa || pkgGlobalSize}
                            onChange={(e) => setPkgSizes(prev => ({ ...prev, camisa: e.target.value }))}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            {COMMON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 3. Falda / Pantalón */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">3. Falda / Pantalón:</span>
                            <div className="inline-flex p-0.5 bg-white rounded-lg border border-slate-200 text-[10px]">
                              <button
                                type="button"
                                onClick={() => setPkgFaldaPantalonChoice('Pantalón')}
                                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                                  pkgFaldaPantalonChoice === 'Pantalón' ? 'bg-blue-600 text-white' : 'text-slate-600'
                                }`}
                              >
                                Pantalón
                              </button>
                              <button
                                type="button"
                                onClick={() => setPkgFaldaPantalonChoice('Falda')}
                                className={`px-2 py-0.5 rounded font-bold transition cursor-pointer ${
                                  pkgFaldaPantalonChoice === 'Falda' ? 'bg-blue-600 text-white' : 'text-slate-600'
                                }`}
                              >
                                Falda
                              </button>
                            </div>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {formatCurrency(getGarmentCatalogInfo('pantalon').packagePrice)} (Paquete)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          <span className="text-[11px] text-slate-500">Talla:</span>
                          <select
                            value={pkgSizes.pantalon || pkgGlobalSize}
                            onChange={(e) => setPkgSizes(prev => ({ ...prev, pantalon: e.target.value }))}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            {COMMON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 4. Chamarra */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">4. Chamarra Escolar</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {formatCurrency(getGarmentCatalogInfo('chamarra').packagePrice)} (Paquete)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Talla:</span>
                          <select
                            value={pkgSizes.chamarra || pkgGlobalSize}
                            onChange={(e) => setPkgSizes(prev => ({ ...prev, chamarra: e.target.value }))}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            {COMMON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 5. Playera Polo */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">5. Playera Polo</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {formatCurrency(getGarmentCatalogInfo('playera').packagePrice)} (Paquete)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Talla:</span>
                          <select
                            value={pkgSizes.playera || pkgGlobalSize}
                            onChange={(e) => setPkgSizes(prev => ({ ...prev, playera: e.target.value }))}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            {COMMON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 6. Pans Deportivo */}
                      <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">6. Pans Deportivo Escolar</span>
                          <span className="text-[10px] text-emerald-700 font-semibold">
                            {formatCurrency(getGarmentCatalogInfo('pans').packagePrice)} (Paquete)
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-slate-500">Talla:</span>
                          <select
                            value={pkgSizes.pans || pkgGlobalSize}
                            onChange={(e) => setPkgSizes(prev => ({ ...prev, pans: e.target.value }))}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          >
                            {COMMON_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>

                      {/* 7. Accesorio Opcional: Corbata / Corbatín */}
                      <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-xl space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-950 select-none">
                          <input
                            type="checkbox"
                            checked={pkgIncludeCorbata}
                            onChange={(e) => setPkgIncludeCorbata(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-amber-300 cursor-pointer"
                          />
                          <span>+ Añadir Corbata / Corbatín Escolar (Opcional)</span>
                        </label>

                        {pkgIncludeCorbata && (
                          <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
                            <div className="inline-flex p-0.5 bg-white rounded-lg border border-amber-300 text-xs">
                              <button
                                type="button"
                                onClick={() => setPkgCorbataChoice('Corbata')}
                                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                                  pkgCorbataChoice === 'Corbata' ? 'bg-amber-500 text-white' : 'text-amber-900'
                                }`}
                              >
                                Corbata
                              </button>
                              <button
                                type="button"
                                onClick={() => setPkgCorbataChoice('Corbatín')}
                                className={`px-2.5 py-1 rounded font-bold transition cursor-pointer ${
                                  pkgCorbataChoice === 'Corbatín' ? 'bg-amber-500 text-white' : 'text-amber-900'
                                }`}
                              >
                                Corbatín
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-amber-900">
                              {formatCurrency(getGarmentCatalogInfo('corbata').packagePrice)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Resumen del Paquete */}
                    <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Cantidad de Paquetes:</span>
                        <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
                          <button
                            type="button"
                            onClick={() => setPkgQuantity(Math.max(1, pkgQuantity - 1))}
                            className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={pkgQuantity}
                            onChange={(e) => setPkgQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            className="w-10 text-center py-0.5 bg-transparent text-xs font-bold text-white focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setPkgQuantity(pkgQuantity + 1)}
                            className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <div>
                          <span className="text-[11px] text-slate-400 block">Total del Paquete ({pkgItemsConfig.length} prendas):</span>
                          {pkgSavings > 0 && (
                            <span className="text-[10px] text-emerald-400 font-semibold block">
                              Ahorro de {formatCurrency(pkgSavings)} vs piezas sueltas
                            </span>
                          )}
                        </div>
                        <span className="text-xl font-black text-white">{formatCurrency(pkgTotalPackagePrice)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCompletePackage}
                        className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                      >
                        <Package className="w-4 h-4" />
                        Añadir Paquete Completo a la Cotización
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Columna Derecha: Resumen de Prendas Cotizadas & Generación del Ticket */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col min-h-[480px]">
                
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    Prendas en Presupuesto ({quoteItems.length})
                  </h3>
                  {quoteItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setQuoteItems([])}
                      className="text-[11px] text-red-500 hover:text-red-700 font-semibold cursor-pointer"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {/* Lista de Prendas en la Cotización */}
                <div className="flex-1 py-3 overflow-y-auto max-h-[260px] space-y-2">
                  {quoteItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Calculator className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">No hay prendas agregadas</p>
                      <p className="text-[11px] text-slate-400">Seleccione prendas para armar el presupuesto</p>
                    </div>
                  ) : (
                    quoteItems.map((it, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 transition"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-xs text-slate-900 truncate">{it.product_name}</span>
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md">
                              Talla: {it.size}
                            </span>
                            {it.price_type === 'paquete' ? (
                              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[9px] font-extrabold rounded-md">
                                Paquete
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[9px] font-medium rounded-md">
                                Suelto
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {it.quantity} pza(s) × {formatCurrency(it.unit_price)}
                          </div>
                        </div>

                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            {formatCurrency(it.subtotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuoteItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                            title="Quitar de cotización"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Resumen Financiero de la Cotización */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-xs font-bold text-blue-900">
                      <span>Total Presupuestado:</span>
                      <span className="text-base text-blue-700 font-black">{formatCurrency(totalQuoteAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-blue-800">
                      <span>Anticipo mínimo sugerido (50%):</span>
                      <span className="font-bold">{formatCurrency(Math.round(totalQuoteAmount * 0.5))}</span>
                    </div>
                  </div>

                  {/* Botón Principal: Generar e Imprimir Ticket de Cotización */}
                  <button
                    type="button"
                    disabled={isSubmittingQuote || quoteItems.length === 0}
                    onClick={handleGenerateQuoteTicket}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingQuote ? (
                      <span>Generando Presupuesto...</span>
                    ) : (
                      <>
                        <Printer className="w-4 h-4" />
                        <span>Generar e Imprimir Ticket de Cotización</span>
                      </>
                    )}
                  </button>

                  {/* Botón Secundario: Cargar en Punto de Venta */}
                  {quoteItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const tempQuote: Quote = {
                          id: 0,
                          folio: 'COT-DIRECTA',
                          customer_name: customerName.trim() || 'Cliente General',
                          customer_phone: customerPhone.trim(),
                          school_name: quoteSchool,
                          seller_name: sellerName,
                          total_amount: totalQuoteAmount,
                          items: quoteItems,
                          notes: quoteNotes,
                          created_at: new Date().toISOString()
                        };
                        handleTransferToPos(tempQuote);
                      }}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>Convertir en Venta / Cobrar en POS</span>
                    </button>
                  )}

                </div>

              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* SECCIÓN 3: HISTORIAL DE COTIZACIONES EMITIDAS */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-bold text-slate-900">Cotizaciones Recientes</h4>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {recentQuotes.length} presupuesto(s) registrado(s)
              </span>
            </div>

            {isLoadingQuotes ? (
              <div className="p-6 text-center text-xs text-slate-400">Cargando cotizaciones recientes...</div>
            ) : recentQuotes.length === 0 ? (
              <p className="text-center py-6 text-xs text-slate-400">Aún no hay cotizaciones emitidas.</p>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {recentQuotes.map(q => (
                  <div key={q.id} className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 transition rounded-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {q.folio}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{q.customer_name}</span>
                        {q.customer_phone && (
                          <span className="text-[11px] text-slate-500">{q.customer_phone}</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>🏫 {q.school_name}</span>
                        <span>•</span>
                        <span>{q.items.length} prenda(s)</span>
                        <span>•</span>
                        <span>{new Date(q.created_at).toLocaleDateString('es-MX')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="font-black text-xs text-slate-900">
                        {formatCurrency(q.total_amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveQuoteTicket(q)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Ver ticket de cotización"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Ver Ticket</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransferToPos(q)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Cobrar o registrar pedido de esta cotización"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Cobrar</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL DE TICKET DE COTIZACIÓN */}
      {activeQuoteTicket && (
        <QuoteTicketModal
          quote={activeQuoteTicket}
          onClose={() => setActiveQuoteTicket(null)}
          onTransferToPos={(q) => handleTransferToPos(q)}
        />
      )}

    </div>
  );
};
