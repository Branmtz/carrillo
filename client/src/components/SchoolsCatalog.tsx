import React, { useState } from 'react';
import type { School, Product } from '../types';
import { formatCurrency } from '../utils/formatters';
import { School as SchoolIcon, ShoppingBag, Plus, Trash2, Pencil, AlertCircle, X, Check } from 'lucide-react';

interface SchoolsCatalogProps {
  schools: School[];
  products: Product[];
  onSchoolAdded: (school: School) => void;
  onSchoolUpdated: (school: School) => void;
  onSchoolDeleted: (schoolId: number) => void;
  onProductAdded: (product: Product) => void;
  onProductUpdated: (product: Product) => void;
  onProductDeleted: (productId: number) => void;
}

export const SchoolsCatalog: React.FC<SchoolsCatalogProps> = ({
  schools,
  products,
  onSchoolAdded,
  onSchoolUpdated,
  onSchoolDeleted,
  onProductAdded,
  onProductUpdated,
  onProductDeleted
}) => {
  // Estado para nueva escuela
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolCode, setNewSchoolCode] = useState('');
  const [schoolError, setSchoolError] = useState('');
  const [isSubmittingSchool, setIsSubmittingSchool] = useState(false);

  // Estado para edición de escuela
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editSchoolCode, setEditSchoolCode] = useState('');
  const [isUpdatingSchool, setIsUpdatingSchool] = useState(false);
  const [editSchoolError, setEditSchoolError] = useState('');

  // Estado para nuevo producto
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Deportivo');
  const [newProductSchool, setNewProductSchool] = useState('Todas');
  const [newProductPrice, setNewProductPrice] = useState('350');
  const [newProductPackagePrice, setNewProductPackagePrice] = useState('300');
  const [productError, setProductError] = useState('');
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false);

  // Filtro de escuela para lista de productos
  const [productCatalogSchoolFilter, setProductCatalogSchoolFilter] = useState('todas');

  // Estado para edición de producto
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductCategory, setEditProductCategory] = useState('Deportivo');
  const [editProductSchool, setEditProductSchool] = useState('Todas');
  const [editProductPrice, setEditProductPrice] = useState('350');
  const [editProductPackagePrice, setEditProductPackagePrice] = useState('300');
  const [isUpdatingProduct, setIsUpdatingProduct] = useState(false);
  const [editProductError, setEditProductError] = useState('');

  const handleAddSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;

    setIsSubmittingSchool(true);
    setSchoolError('');

    let newSchoolObj: School | null = null;
    try {
      const res = await fetch('/api/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSchoolName.trim(),
          code: newSchoolCode.trim()
        })
      });
      if (res.ok) {
        newSchoolObj = await res.json();
      }
    } catch (err: any) {}

    if (!newSchoolObj) {
      newSchoolObj = {
        id: Date.now(),
        name: newSchoolName.trim(),
        code: newSchoolCode.trim(),
        created_at: new Date().toISOString()
      };
    }

    onSchoolAdded(newSchoolObj);
    setNewSchoolName('');
    setNewSchoolCode('');
    setIsSubmittingSchool(false);
  };

  const handleStartEditSchool = (school: School) => {
    setEditingSchool(school);
    setEditSchoolName(school.name);
    setEditSchoolCode(school.code || '');
    setEditSchoolError('');
  };

  const handleSaveEditSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool || !editSchoolName.trim()) return;

    setIsUpdatingSchool(true);
    setEditSchoolError('');

    let updatedSchoolObj: School | null = null;
    try {
      const res = await fetch(`/api/schools/${editingSchool.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editSchoolName.trim(),
          code: editSchoolCode.trim()
        })
      });
      if (res.ok) {
        updatedSchoolObj = await res.json();
      }
    } catch (err: any) {}

    if (!updatedSchoolObj) {
      updatedSchoolObj = {
        ...editingSchool,
        name: editSchoolName.trim(),
        code: editSchoolCode.trim()
      };
    }

    onSchoolUpdated(updatedSchoolObj);
    setEditingSchool(null);
    setIsUpdatingSchool(false);
  };

  const handleDeleteSchool = async (school: School) => {
    if (!window.confirm(`¿Está seguro de eliminar la escuela "${school.name}" del catálogo?`)) return;
    try {
      await fetch(`/api/schools/${school.id}`, { method: 'DELETE' });
    } catch (err: any) {}
    onSchoolDeleted(school.id);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    setIsSubmittingProduct(true);
    setProductError('');

    const payload = {
      name: newProductName.trim(),
      category: newProductCategory.trim(),
      school_name: newProductSchool.trim(),
      default_price: parseFloat(newProductPrice) || 0,
      package_price: parseFloat(newProductPackagePrice) || 0
    };

    let newProductObj: Product | null = null;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        newProductObj = await res.json();
      }
    } catch (err: any) {}

    if (!newProductObj) {
      newProductObj = {
        id: Date.now(),
        ...payload,
        created_at: new Date().toISOString()
      };
    }

    onProductAdded(newProductObj);
    setNewProductName('');
    setNewProductSchool('Todas');
    setNewProductPrice('350');
    setNewProductPackagePrice('300');
    setIsSubmittingProduct(false);
  };

  const handleStartEditProduct = (product: Product) => {
    setEditingProduct(product);
    setEditProductName(product.name);
    setEditProductCategory(product.category || 'Deportivo');
    setEditProductSchool(product.school_name || 'Todas');
    setEditProductPrice(String(product.default_price));
    setEditProductPackagePrice(String(product.package_price ?? Math.round(product.default_price * 0.85)));
    setEditProductError('');
  };

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editProductName.trim()) return;

    setIsUpdatingProduct(true);
    setEditProductError('');

    const payload = {
      name: editProductName.trim(),
      category: editProductCategory.trim(),
      school_name: editProductSchool.trim(),
      default_price: parseFloat(editProductPrice) || 0,
      package_price: parseFloat(editProductPackagePrice) || 0
    };

    let updatedProductObj: Product | null = null;
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        updatedProductObj = await res.json();
      }
    } catch (err: any) {}

    if (!updatedProductObj) {
      updatedProductObj = {
        ...editingProduct,
        ...payload
      };
    }

    onProductUpdated(updatedProductObj);
    setEditingProduct(null);
    setIsUpdatingProduct(false);
  };

  const handleDeleteProduct = async (product: Product) => {
    if (!window.confirm(`¿Está seguro de eliminar la prenda "${product.name}" del catálogo?`)) return;
    try {
      await fetch(`/api/products/${product.id}`, { method: 'DELETE' });
    } catch (err: any) {}
    onProductDeleted(product.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* SECCIÓN ESCUELAS */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <SchoolIcon className="w-4 h-4 text-blue-600" />
            Catálogo de Escuelas ({schools.length})
          </h3>
        </div>

        {schoolError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{schoolError}</span>
          </div>
        )}

        {/* Formulario Agregar Escuela */}
        <form onSubmit={handleAddSchool} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
          <span className="text-xs font-bold text-slate-700 block">Registrar Nueva Escuela:</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <input
                type="text"
                required
                placeholder="Nombre de la Escuela (Ej. Primaria Morelos)"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <input
                type="text"
                placeholder="Código / Clave (Opcional)"
                value={newSchoolCode}
                onChange={(e) => setNewSchoolCode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingSchool || !newSchoolName.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmittingSchool ? 'Guardando...' : 'Agregar Escuela'}</span>
          </button>
        </form>

        {/* Lista de Escuelas */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/60 rounded-xl">
          {schools.length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">No hay escuelas registradas en el catálogo.</p>
          ) : (
            schools.map(school => (
              <div key={school.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition gap-2">
                <div className="min-w-0 flex-1">
                  <span className="font-bold text-slate-900 block truncate">{school.name}</span>
                  {school.code && (
                    <span className="text-[11px] text-slate-500">Clave: {school.code}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleStartEditSchool(school)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Editar escuela"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteSchool(school)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    title="Eliminar escuela del catálogo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SECCIÓN PRENDAS / PRODUCTOS */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-blue-600" />
            Catálogo de Prendas y Precios ({products.length})
          </h3>
        </div>

        {productError && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-1.5 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{productError}</span>
          </div>
        )}

        {/* Formulario Agregar Prenda */}
        <form onSubmit={handleAddProduct} className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
          <span className="text-xs font-bold text-slate-700 block">Registrar Nueva Prenda / Uniforme:</span>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Nombre de la Prenda</label>
              <input
                type="text"
                required
                placeholder="Ej. Chamarra Escolar"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Categoría</label>
              <select
                value={newProductCategory}
                onChange={(e) => setNewProductCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Deportivo">Deportivo</option>
                <option value="Diario">Diario</option>
                <option value="Gala / Abrigo">Gala / Abrigo</option>
                <option value="Accesorios">Accesorios</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Escuela a la que Aplica</label>
              <select
                value={newProductSchool}
                onChange={(e) => setNewProductSchool(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="Todas">🌐 Todas las Escuelas (General)</option>
                {schools.map(s => (
                  <option key={s.id} value={s.name}>🏫 {s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Precio Pieza Suelta ($MXN)</label>
              <input
                type="number"
                step="any"
                min={0}
                required
                placeholder="Precio Suelto ($)"
                value={newProductPrice}
                onChange={(e) => {
                  setNewProductPrice(e.target.value);
                  const p = parseFloat(e.target.value);
                  if (!isNaN(p)) {
                    setNewProductPackagePrice(String(Math.round(p * 0.85)));
                  }
                }}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-blue-700 mb-0.5">Precio por Paquete ($MXN)</label>
              <input
                type="number"
                step="any"
                min={0}
                required
                placeholder="Precio Paquete ($)"
                value={newProductPackagePrice}
                onChange={(e) => setNewProductPackagePrice(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50/50 border border-blue-300 rounded-lg text-xs font-bold text-blue-950 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmittingProduct || !newProductName.trim()}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center justify-center gap-1 disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isSubmittingProduct ? 'Guardando...' : 'Agregar Prenda con Ambos Precios'}</span>
          </button>
        </form>

        {/* Barra de Filtro de Escuela para Lista de Prendas */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-700">Prendas en Catálogo ({products.length}):</span>
          <select
            value={productCatalogSchoolFilter}
            onChange={(e) => setProductCatalogSchoolFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="todas">Ver Todas las Escuelas</option>
            <option value="Todas">🌐 Solo Prendas Generales</option>
            {schools.map(s => (
              <option key={s.id} value={s.name}>🏫 {s.name}</option>
            ))}
          </select>
        </div>

        {/* Lista de Prendas */}
        <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 border border-slate-200/60 rounded-xl">
          {products.filter(p => {
            if (productCatalogSchoolFilter === 'todas') return true;
            if (productCatalogSchoolFilter === 'Todas') return !p.school_name || p.school_name === 'Todas';
            return p.school_name === productCatalogSchoolFilter;
          }).length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">No hay prendas registradas para este filtro.</p>
          ) : (
            products.filter(p => {
              if (productCatalogSchoolFilter === 'todas') return true;
              if (productCatalogSchoolFilter === 'Todas') return !p.school_name || p.school_name === 'Todas';
              return p.school_name === productCatalogSchoolFilter;
            }).map(product => (
              <div key={product.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-900 truncate">{product.name}</span>
                    {product.school_name && product.school_name !== 'Todas' ? (
                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                        🏫 {product.school_name}
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-md">
                        🌐 General
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">{product.category}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-slate-400 font-medium">Suelta:</span>
                      <span className="font-extrabold text-slate-800">
                        {formatCurrency(product.default_price)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-[10px] text-blue-600 font-semibold">Paquete:</span>
                      <span className="font-black text-blue-700">
                        {formatCurrency(product.package_price ?? Math.round(product.default_price * 0.85))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStartEditProduct(product)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Editar prenda y precios"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(product)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                      title="Eliminar prenda del catálogo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL EDITAR ESCUELA */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                Editar Escuela
              </h4>
              <button
                type="button"
                onClick={() => setEditingSchool(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editSchoolError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{editSchoolError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditSchool} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Escuela *
                </label>
                <input
                  type="text"
                  required
                  value={editSchoolName}
                  onChange={(e) => setEditSchoolName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código / Clave (Opcional)
                </label>
                <input
                  type="text"
                  value={editSchoolCode}
                  onChange={(e) => setEditSchoolCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingSchool || !editSchoolName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdatingSchool ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PRENDA / PRODUCTO */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                Editar Prenda / Uniforme
              </h4>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editProductError && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-center gap-1.5 font-medium">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{editProductError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditProduct} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la Prenda *
                </label>
                <input
                  type="text"
                  required
                  value={editProductName}
                  onChange={(e) => setEditProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Escuela a la que Aplica
                  </label>
                  <select
                    value={editProductSchool}
                    onChange={(e) => setEditProductSchool(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Todas">🌐 Todas las Escuelas (General)</option>
                    {schools.map(s => (
                      <option key={s.id} value={s.name}>🏫 {s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={editProductCategory}
                    onChange={(e) => setEditProductCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Deportivo">Deportivo</option>
                    <option value="Diario">Diario</option>
                    <option value="Gala / Abrigo">Gala / Abrigo</option>
                    <option value="Accesorios">Accesorios</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Precio Pieza Suelta ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    required
                    value={editProductPrice}
                    onChange={(e) => setEditProductPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-blue-700 mb-1">
                    Precio por Paquete ($) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    required
                    value={editProductPackagePrice}
                    onChange={(e) => setEditProductPackagePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-blue-50/60 border border-blue-300 rounded-xl text-xs font-bold text-blue-950 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProduct || !editProductName.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{isUpdatingProduct ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
