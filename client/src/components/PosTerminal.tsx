import React, { useState, useEffect } from 'react';
import type { School, Product, OrderItem, Order } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  ShoppingBag, Plus, Trash2, CheckCircle2, 
  School as SchoolIcon, User, Phone, FileText, 
  DollarSign, Sparkles, Clock, AlertCircle, PlusCircle,
  Calendar, CreditCard, Banknote, ArrowRightLeft, Check,
  Package, Layers, Shirt, Tag, Info
} from 'lucide-react';

interface PosTerminalProps {
  schools: School[];
  products: Product[];
  onOrderCreated: (order: Order) => void;
  onSchoolAdded: (newSchool: School) => void;
  initialQuoteData?: {
    schoolName?: string;
    customerName?: string;
    customerPhone?: string;
    items?: OrderItem[];
    notes?: string;
  } | null;
  onClearInitialQuoteData?: () => void;
}

const COMMON_SIZES = [
  '4', '6', '8', '10', '12', '14', '16', 
  '28', '30', '32', '34', 
  'CH', 'M', 'G', 'XG'
];

export const PosTerminal: React.FC<PosTerminalProps> = ({
  schools,
  products,
  onOrderCreated,
  onSchoolAdded,
  initialQuoteData,
  onClearInitialQuoteData
}) => {
  // Estado del Tipo de Venta
  const [orderType, setOrderType] = useState<'directa' | 'pedido'>('pedido');

  // Notificación de cotización cargada
  const [loadedQuoteNotification, setLoadedQuoteNotification] = useState<string>('');

  // Datos del Cliente y Venta
  const [schoolName, setSchoolName] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [sellerName, setSellerName] = useState<string>(localStorage.getItem('default_seller') || 'Vendedor 1');
  const [notes, setNotes] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'alta' | 'urgente'>('normal');
  const [paymentMethod, setPaymentMethod] = useState<string>('Efectivo');

  // Estado para fecha actual o fecha pasada
  const [isCustomDate, setIsCustomDate] = useState<boolean>(false);
  const [customDate, setCustomDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });

  // Carrito de Artículos
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);

  // Modo de ingreso: 'individual' (prenda suelta/paquete) o 'paquete_completo' (paquete 6 piezas)
  const [entryMode, setEntryMode] = useState<'individual' | 'paquete_completo'>('individual');

  // Prenda a agregar individual
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('M');
  const [customSize, setCustomSize] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(350);
  const [itemPriceType, setItemPriceType] = useState<'unitario' | 'paquete'>('unitario');

  // Estado para el Paquete Completo de 6 Piezas
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
  const [pkgSuccessMessage, setPkgSuccessMessage] = useState<string>('');

  // Anticipo / A cuenta
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Modal para agregar escuela al vuelo
  const [showNewSchoolModal, setShowNewSchoolModal] = useState<boolean>(false);
  const [newSchoolName, setNewSchoolName] = useState<string>('');

  // Sincronizar escuela por defecto si hay lista
  useEffect(() => {
    if (!schoolName && schools.length > 0) {
      setSchoolName(schools[0].name);
    }
  }, [schools, schoolName]);

  // Cargar datos de cotización transferida desde el Cotizador
  useEffect(() => {
    if (initialQuoteData) {
      if (initialQuoteData.schoolName) setSchoolName(initialQuoteData.schoolName);
      if (initialQuoteData.customerName) setCustomerName(initialQuoteData.customerName);
      if (initialQuoteData.customerPhone) setCustomerPhone(initialQuoteData.customerPhone);
      if (initialQuoteData.notes) setNotes(initialQuoteData.notes);
      if (initialQuoteData.items && initialQuoteData.items.length > 0) {
        setCartItems(initialQuoteData.items);
      }
      setLoadedQuoteNotification(
        `¡Cotización cargada para "${initialQuoteData.customerName || 'Cliente'}"! Revisa las prendas y registra el anticipo o venta directa.`
      );
      if (onClearInitialQuoteData) {
        onClearInitialQuoteData();
      }
    }
  }, [initialQuoteData, onClearInitialQuoteData]);

  // Actualizar precio cuando cambia el producto seleccionado o el tipo de precio
  const handleProductChange = (prodName: string) => {
    setSelectedProduct(prodName);
    const prod = products.find(p => p.name === prodName);
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
    const prod = products.find(p => p.name === selectedProduct);
    if (prod) {
      if (type === 'paquete' && prod.package_price && prod.package_price > 0) {
        setItemPrice(prod.package_price);
      } else {
        setItemPrice(prod.default_price);
      }
    }
  };

  // Inicializar primer producto
  useEffect(() => {
    if (!selectedProduct && products.length > 0) {
      setSelectedProduct(products[0].name);
      if (itemPriceType === 'paquete' && products[0].package_price && products[0].package_price > 0) {
        setItemPrice(products[0].package_price);
      } else {
        setItemPrice(products[0].default_price);
      }
    }
  }, [products, selectedProduct, itemPriceType]);

  // Aplicar talla global a todo el paquete
  const handleApplyGlobalSize = (size: string) => {
    setPkgGlobalSize(size);
    setPkgSizes({
      sweater: size,
      camisa: size,
      pantalon: size,
      chamarra: size,
      playera: size,
      pans: size
    });
  };

  // Resolver información de prendas del paquete desde catálogo
  const findProductByPattern = (pattern: RegExp) => {
    return products.find(p => pattern.test(p.name));
  };

  const getGarmentCatalogInfo = (type: 'sweater' | 'camisa' | 'pantalon' | 'chamarra' | 'playera' | 'pans' | 'corbata') => {
    let p: Product | undefined;
    let defaultLoose = 300;
    let defaultPkg = 250;
    let defaultName = '';

    switch (type) {
      case 'sweater':
        p = findProductByPattern(/su[eé]ter|sweater/i);
        defaultName = 'Suéter Escolar';
        defaultLoose = 310;
        defaultPkg = 260;
        break;
      case 'camisa':
        p = findProductByPattern(pkgChazarillaChoice === 'Chazarilla' ? /chazarilla/i : /camisa/i) || findProductByPattern(/chazarilla|camisa/i);
        defaultName = pkgChazarillaChoice === 'Chazarilla' ? 'Chazarilla Escolar' : 'Camisa Escolar';
        defaultLoose = 220;
        defaultPkg = 190;
        break;
      case 'pantalon':
        p = findProductByPattern(pkgFaldaPantalonChoice === 'Falda' ? /falda/i : /pantal[oó]n/i) || findProductByPattern(/pantal[oó]n|falda/i);
        defaultName = pkgFaldaPantalonChoice === 'Falda' ? 'Falda Escolar' : 'Pantalón Escolar';
        defaultLoose = 280;
        defaultPkg = 240;
        break;
      case 'chamarra':
        p = findProductByPattern(/chamarra/i);
        defaultName = 'Chamarra Escolar';
        defaultLoose = 450;
        defaultPkg = 380;
        break;
      case 'playera':
        p = findProductByPattern(/playera|polo/i);
        defaultName = 'Playera Polo Escolar';
        defaultLoose = 200;
        defaultPkg = 170;
        break;
      case 'pans':
        p = findProductByPattern(/pans/i);
        defaultName = 'Pans Deportivo Escolar';
        defaultLoose = 550;
        defaultPkg = 480;
        break;
      case 'corbata':
        p = findProductByPattern(pkgCorbataChoice === 'Corbatín' ? /corbat[ií]n/i : /corbata/i) || findProductByPattern(/corbata|corbat[ií]n/i);
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

  // Agregar las 6 prendas del paquete completo de un solo clic
  const handleAddCompletePackage = () => {
    const newItems: OrderItem[] = pkgItemsConfig.map(cfg => {
      const info = getGarmentCatalogInfo(cfg.key);
      const chosenSize = cfg.key === 'corbata' ? 'Unitalla' : (pkgSizes[cfg.sizeKey] || pkgGlobalSize);
      return {
        product_name: info.name,
        size: chosenSize,
        quantity: pkgQuantity,
        delivered_quantity: orderType === 'directa' ? pkgQuantity : 0,
        unit_price: info.packagePrice,
        subtotal: pkgQuantity * info.packagePrice,
        price_type: 'paquete',
        status: orderType === 'directa' ? 'entregado' : 'pendiente'
      };
    });

    setCartItems(prev => [...prev, ...newItems]);
    setPkgSuccessMessage(`¡Se agregaron las ${pkgItemsConfig.length} prendas del paquete con precio especial de paquete!`);
    setTimeout(() => setPkgSuccessMessage(''), 4500);
  };

  // Guardar vendedor predeterminado en localStorage
  const handleSellerChange = (val: string) => {
    setSellerName(val);
    localStorage.setItem('default_seller', val);
  };

  // Agregar prenda al carrito individual
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct.trim()) {
      setErrorMessage('Seleccione o ingrese una prenda');
      return;
    }
    const finalSize = customSize.trim() ? customSize.trim().toUpperCase() : selectedSize;
    if (!finalSize) {
      setErrorMessage('Seleccione o ingrese una talla');
      return;
    }
    if (itemQuantity <= 0) {
      setErrorMessage('La cantidad debe ser al menos 1');
      return;
    }

    const newItem: OrderItem = {
      product_name: selectedProduct.trim(),
      size: finalSize,
      quantity: itemQuantity,
      delivered_quantity: orderType === 'directa' ? itemQuantity : 0,
      unit_price: Number(itemPrice) || 0,
      subtotal: (Number(itemQuantity) || 1) * (Number(itemPrice) || 0),
      price_type: itemPriceType,
      status: orderType === 'directa' ? 'entregado' : 'pendiente'
    };

    setCartItems(prev => [...prev, newItem]);
    setCustomSize('');
    setItemQuantity(1);
    setErrorMessage('');
  };

  const handleRemoveItem = (index: number) => {
    setCartItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Cálculos financieros
  const totalAmount = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  // Anticipo sugerido y saldo
  const numericDeposit = orderType === 'directa' 
    ? totalAmount 
    : (depositAmount === '' ? 0 : Math.min(totalAmount, parseFloat(depositAmount) || 0));

  const balanceDue = Math.max(0, totalAmount - numericDeposit);

  // Botones de acceso rápido para anticipo
  const setDepositPercent = (percent: number) => {
    const val = Math.round(totalAmount * (percent / 100));
    setDepositAmount(String(val));
  };

  // Crear nueva escuela inline
  const handleCreateSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    let data: School | null = null;
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSchoolName.trim() })
      });
      if (res.ok) {
        data = await res.json();
      }
    } catch (err: any) {}

    if (!data) {
      data = {
        id: Date.now(),
        name: newSchoolName.trim(),
        code: '',
        created_at: new Date().toISOString()
      };
    }

    onSchoolAdded(data);
    setSchoolName(data.name);
    setNewSchoolName('');
    setShowNewSchoolModal(false);
  };

  // Enviar Venta / Pedido
  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      setErrorMessage('Por favor ingrese el nombre del cliente');
      return;
    }
    if (!schoolName.trim()) {
      setErrorMessage('Por favor seleccione la escuela');
      return;
    }
    if (!sellerName.trim()) {
      setErrorMessage('Por favor indique el nombre del vendedor');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Agregue al menos una prenda al pedido');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        order_type: orderType,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        school_name: schoolName.trim(),
        seller_name: sellerName.trim(),
        items: cartItems,
        deposit_amount: numericDeposit,
        payment_method: paymentMethod,
        notes: notes.trim(),
        priority: priority,
        custom_date: isCustomDate && customDate ? customDate : null
      };

      let savedOrder: Order | null = null;
      try {
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          savedOrder = await res.json();
        }
      } catch (e) {}

      if (!savedOrder) {
        // Fallback local en navegador (GitHub Pages / sin servidor activo)
        const totalAmount = cartItems.reduce((acc, it) => acc + it.subtotal, 0);
        const dep = orderType === 'directa' ? totalAmount : Math.min(numericDeposit, totalAmount);
        const bal = Math.max(0, totalAmount - dep);
        const prefix = orderType === 'directa' ? 'VTA' : 'PED';
        const orderId = Date.now();
        savedOrder = {
          id: orderId,
          folio: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
          order_type: orderType,
          customer_name: payload.customer_name,
          customer_phone: payload.customer_phone,
          school_name: payload.school_name,
          seller_name: payload.seller_name,
          total_amount: totalAmount,
          deposit_amount: dep,
          balance_due: bal,
          delivery_status: orderType === 'directa' ? 'entregado' : 'pendiente',
          payment_status: bal === 0 ? 'liquidado' : 'pendiente',
          payment_method: paymentMethod,
          notes: notes.trim(),
          priority: priority,
          created_at: payload.custom_date ? new Date(payload.custom_date).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          items: cartItems.map((it, idx) => ({
            ...it,
            id: orderId + idx + 1,
            order_id: orderId,
            delivered_quantity: orderType === 'directa' ? it.quantity : 0,
            status: orderType === 'directa' ? ('entregado' as const) : ('pendiente' as const)
          })),
          payments: dep > 0 ? [{
            id: orderId + 99,
            order_id: orderId,
            amount: dep,
            payment_method: paymentMethod,
            notes: orderType === 'directa' ? 'Pago total venta directa' : 'Anticipo inicial',
            created_at: new Date().toISOString()
          }] : []
        };
      }

      // Limpiar formulario
      setCartItems([]);
      setCustomerName('');
      setCustomerPhone('');
      setNotes('');
      setDepositAmount('');
      setPriority('normal');
      
      // Notificar al componente padre para abrir el TicketModal
      onOrderCreated(savedOrder);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner de cotización cargada */}
      {loadedQuoteNotification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-semibold">{loadedQuoteNotification}</p>
          </div>
          <button
            type="button"
            onClick={() => setLoadedQuoteNotification('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold px-3 py-1.5 bg-white rounded-lg border border-emerald-200 shadow-xs"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Selector de Modalidad: Venta Directa vs Sobre Pedido */}
      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Modalidad de Venta:</span>
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setOrderType('pedido')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
                orderType === 'pedido'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              Compra Sobre Pedido (Con Anticipo)
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderType('directa');
                setDepositAmount('');
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition ${
                orderType === 'directa'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Venta Directa (Stock / Entrega Inmediata)
            </button>
          </div>
        </div>

        {/* Prioridad y Vendedor */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Prioridad:</span>
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setPriority('normal')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  priority === 'normal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setPriority('alta')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  priority === 'alta' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Alta ⭐
              </button>
              <button
                type="button"
                onClick={() => setPriority('urgente')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                  priority === 'urgente' ? 'bg-red-600 text-white shadow-xs animate-pulse' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Urgente 🚨
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Vendedor:</span>
            <input
              type="text"
              value={sellerName}
              onChange={(e) => handleSellerChange(e.target.value)}
              className="w-28 px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre vendedor"
            />
          </div>
        </div>
      </div>

      {/* Selector de Fecha de Venta: Fecha Actual vs Pasada */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-700">Fecha del Registro:</span>
          <span className="text-xs font-semibold text-slate-500">
            {isCustomDate ? 'Fecha personalizada / anterior' : 'Fecha actual (Automática)'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 transition select-none">
            <input
              type="checkbox"
              checked={isCustomDate}
              onChange={(e) => setIsCustomDate(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
            />
            <span>Registrar fecha pasada</span>
          </label>

          {isCustomDate && (
            <div className="flex flex-wrap items-center gap-1.5">
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-2.5 py-1.5 bg-blue-50/70 border border-blue-300 rounded-lg text-xs font-bold text-blue-950 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => {
                  const now = new Date();
                  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
                  setCustomDate(now.toISOString().slice(0, 16));
                }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md transition cursor-pointer"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() - 1);
                  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                  setCustomDate(d.toISOString().slice(0, 16));
                }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-md transition cursor-pointer"
              >
                Ayer
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Grid Principal: Formulario de Pedido + Carrito/Cobro */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Columna Izquierda: Datos del Cliente, Escuela y Selector de Prenda */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Card: Cliente y Escuela */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <SchoolIcon className="w-4 h-4 text-blue-600" />
              Escuela y Datos del Cliente
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Escuela */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Escuela *
                </label>
                <div className="flex gap-2">
                  <select
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    {schools.map(s => (
                      <option key={s.id} value={s.name}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewSchoolModal(true)}
                    title="Añadir nueva escuela"
                    className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-4 h-4" />
                    Nueva
                  </button>
                </div>
              </div>

              {/* Nombre del Cliente */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Cliente *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Juan Pérez / Julisa Gómez"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Teléfono / WhatsApp */}
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

              {/* Notas del pedido */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notas / Especificaciones (Bordado, dobladillo, etc.)
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ej. Bordar 'Juan C.' en el pecho izquierdo, recoger viernes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Card: Selector de Prendas y Tallas */}
          <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Agregar Prenda al Pedido
              </h3>

              {/* Selector de Modo: Prenda Individual vs Paquete Completo de 6 Piezas */}
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

            {pkgSuccessMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2 font-bold animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{pkgSuccessMessage}</span>
              </div>
            )}

            {/* ================= MODALIDAD 1: PRENDA INDIVIDUAL ================= */}
            {entryMode === 'individual' && (
              <form onSubmit={handleAddItem} className="space-y-4">
                
                {/* Selector de Tipo de Precio: Pieza Suelta vs Precio por Paquete */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      Régimen de Precio:
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {itemPriceType === 'unitario' ? 'Pieza Suelta Individual' : 'Precio Especial de Paquete'}
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

                  <p className="text-[11px] text-slate-500 flex items-start gap-1 pt-1 leading-snug">
                    <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                    <span>
                      Los pedidos por <strong>pieza suelta</strong> tienen precios individuales ya que descompensan los paquetes completos de 6 prendas.
                    </span>
                  </p>
                </div>

                {/* Selector de Producto */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prenda / Tipo de Uniforme
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedProduct}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name} — Suelta: {formatCurrency(p.default_price)} | Paquete: {formatCurrency(p.package_price || p.default_price)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selector de Tallas */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Talla de la Prenda
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

                  {/* Talla personalizada si no está en la lista */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Otra talla:</span>
                    <input
                      type="text"
                      placeholder="Ej. 18, 36, Especial..."
                      value={customSize}
                      onChange={(e) => setCustomSize(e.target.value)}
                      className="w-36 px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold uppercase text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    {customSize && (
                      <span className="text-[11px] text-blue-600 font-semibold">
                        Seleccionada: {customSize.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cantidad y Precio */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Cantidad
                    </label>
                    <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50">
                      <button
                        type="button"
                        onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
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
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>{itemPriceType === 'paquete' ? 'Precio por Paquete ($MXN)' : 'Precio Pieza Suelta ($MXN)'}</span>
                    </label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="number"
                        step="any"
                        min={0}
                        value={itemPrice}
                        onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Botón de añadir al carrito */}
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Añadir al Carrito ({formatCurrency((Number(itemQuantity) || 1) * (Number(itemPrice) || 0))})
                </button>
              </form>
            )}

            {/* ================= MODALIDAD 2: PAQUETE COMPLETO (6 PIEZAS) ================= */}
            {entryMode === 'paquete_completo' && (
              <div className="space-y-4">
                
                {/* Banner Informativo del Paquete Reglamentario */}
                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Package className="w-4 h-4 text-emerald-700" />
                      Paquete Escolar Completo (6 Piezas)
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 text-[10px] font-black rounded-md">
                      Precio Preferencial
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-snug">
                    Incluye: <strong>Sweater, Chazarilla/Camisa, Falda/Pantalón, Chamarra, Playera y Pans</strong>. Previene descompensar el uniforme completo.
                  </p>
                </div>

                {/* Asignador de Talla Global para Todo el Paquete */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Asignar misma talla a todo el paquete:
                    </span>
                    <span className="text-[11px] font-extrabold text-blue-600">
                      Talla actual: {pkgGlobalSize}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {COMMON_SIZES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleApplyGlobalSize(s)}
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

                {/* Configuración de las 6 prendas reglamentarias */}
                <div className="space-y-2.5">
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
                        <span className="text-xs font-black text-amber-900">
                          +{formatCurrency(getGarmentCatalogInfo('corbata').packagePrice)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cantidad de Paquetes y Resumen de Precio */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Cantidad de Paquetes:
                    </span>
                    <div className="flex items-center border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
                      <button
                        type="button"
                        onClick={() => setPkgQuantity(Math.max(1, pkgQuantity - 1))}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={pkgQuantity}
                        onChange={(e) => setPkgQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="w-12 text-center py-1 bg-transparent text-xs font-bold text-white focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setPkgQuantity(pkgQuantity + 1)}
                        className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2.5 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">
                        Precio Paquete Completo ({pkgItemsConfig.length} prendas):
                      </span>
                      {pkgSavings > 0 && (
                        <span className="text-[10px] text-emerald-400 font-semibold block">
                          Ahorro de {formatCurrency(pkgSavings)} vs comprar piezas sueltas
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-white block">
                        {formatCurrency(pkgTotalPackagePrice)}
                      </span>
                    </div>
                  </div>

                  {/* Botón Añadir Paquete Completo */}
                  <button
                    type="button"
                    onClick={handleAddCompletePackage}
                    className="w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Package className="w-4 h-4" />
                    Añadir Paquete Completo al Pedido ({pkgItemsConfig.length} prendas)
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Columna Derecha: Resumen de Prendas en Venta, Anticipo y Cobro */}
        <div id="cart-section" className="lg:col-span-5 space-y-6">
          <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col min-h-[480px]">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                Prendas en el Pedido ({cartItems.length})
              </h3>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCartItems([])}
                  className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Lista de Prendas */}
            <div className="flex-1 py-3 overflow-y-auto max-h-[220px] space-y-2">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <ShoppingBag className="w-10 h-10 mb-2 stroke-[1.5] text-slate-300" />
                  <p className="text-xs font-medium text-slate-500">No hay prendas añadidas</p>
                  <p className="text-[11px] text-slate-400">Seleccione una prenda y talla para comenzar</p>
                </div>
              ) : (
                cartItems.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/60 flex items-center justify-between gap-2 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 truncate">
                          {it.product_name}
                        </span>
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-extrabold rounded-md">
                          Talla: {it.size}
                        </span>
                        {it.price_type === 'paquete' ? (
                          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold rounded-md flex items-center gap-0.5">
                            <Package className="w-2.5 h-2.5" /> Paquete
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-semibold rounded-md">
                            Pieza Suelta
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {it.quantity} pza(s) × {formatCurrency(it.unit_price)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-xs text-slate-900">
                        {formatCurrency(it.subtotal)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-slate-400 hover:text-red-600 transition"
                        title="Eliminar prenda"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desglose Financiero y Anticipos */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              
              {/* Total */}
              <div className="flex justify-between items-center text-sm font-bold text-slate-800">
                <span>Total del Pedido:</span>
                <span className="text-base text-slate-900">{formatCurrency(totalAmount)}</span>
              </div>

              {/* Si es Sobre Pedido: Manejo de Anticipo / A Cuenta */}
              {orderType === 'pedido' ? (
                <div className="space-y-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-950">
                      Dejado A Cuenta (Anticipo):
                    </label>
                    <span className="text-[11px] text-amber-800 font-semibold">
                      {depositAmount ? formatCurrency(numericDeposit) : '$0.00'}
                    </span>
                  </div>

                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-amber-700 absolute left-3 top-2" />
                    <input
                      type="number"
                      step="any"
                      min={0}
                      max={totalAmount}
                      placeholder="Monto dejado a cuenta..."
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Botones de sugerencia */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setDepositPercent(50)}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-bold transition"
                    >
                      50% Anticipo
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositPercent(100)}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-bold transition"
                    >
                      100% Liquidado
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositAmount('')}
                      className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded text-[10px] font-bold transition"
                    >
                      $0 Anticipo
                    </button>
                  </div>

                  {/* Saldo Restante */}
                  <div className="pt-2 border-t border-amber-200/60 flex justify-between items-center">
                    <span className="text-xs font-bold text-red-700">Resta por Pagar (Saldo):</span>
                    <span className="text-sm font-extrabold text-red-700">
                      {formatCurrency(balanceDue)}
                    </span>
                  </div>
                </div>
              ) : (
                /* Venta Directa */
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-emerald-900">
                    <span>Pago Total al Momento:</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 text-[11px]">
                    <span>Saldo Restante:</span>
                    <span className="font-bold">$0.00 (Liquidado)</span>
                  </div>
                </div>
              )}

              {/* Selector de Método de Pago con Check */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-slate-700 block">
                  Método de Pago:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Efectivo')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      paymentMethod === 'Efectivo'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                      paymentMethod === 'Efectivo' ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {paymentMethod === 'Efectivo' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">Efectivo</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Tarjeta de Débito/Crédito')}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      paymentMethod === 'Tarjeta de Débito/Crédito'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                      paymentMethod === 'Tarjeta de Débito/Crédito' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {paymentMethod === 'Tarjeta de Débito/Crédito' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <CreditCard className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="truncate">Tarjeta</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transferencia')}
                    className={`col-span-2 sm:col-span-1 flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      paymentMethod === 'Transferencia'
                        ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition shrink-0 ${
                      paymentMethod === 'Transferencia' ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {paymentMethod === 'Transferencia' && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <ArrowRightLeft className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="truncate">Transferencia</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Botón Principal de Confirmación */}
              <button
                type="button"
                disabled={isSubmitting || cartItems.length === 0 || !customerName.trim()}
                onClick={handleSubmitOrder}
                className={`w-full py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition cursor-pointer ${
                  orderType === 'directa'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSubmitting ? (
                  <span>Procesando...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {orderType === 'directa' ? 'Completar Venta y Generar Ticket' : 'Registrar Pedido y Generar Ticket'}
                    </span>
                  </>
                )}
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* Barra Flotante de Acceso Rápido al Carrito en Móviles */}
      {cartItems.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-30 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-[11px] text-slate-300 font-semibold block">{cartItems.length} prenda(s) en orden</span>
              <span className="text-sm font-black text-emerald-400">{formatCurrency(totalAmount)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('cart-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
          >
            Cobrar ↓
          </button>
        </div>
      )}

      {/* Modal Rápido para Nueva Escuela */}
      {showNewSchoolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl border border-slate-100 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Registrar Nueva Escuela
            </h4>
            <form onSubmit={handleCreateSchool} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Escuela
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Secundaria Federal No. 2"
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSchoolModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition"
                >
                  Guardar Escuela
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
