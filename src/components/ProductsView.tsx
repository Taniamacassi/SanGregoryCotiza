import React, { useState } from 'react';
import { Product, CompanyProfile } from '../types';
import { formatCurrency } from '../utils/storage';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Tag,
  DollarSign,
  TrendingUp,
  Layers,
  Image as ImageIcon,
  Upload,
  X,
} from 'lucide-react';

interface Props {
  products: Product[];
  company: CompanyProfile;
  onSaveProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export const ProductsView: React.FC<Props> = ({
  products,
  company,
  onSaveProduct,
  onDeleteProduct,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title: string } | null>(null);

  // Form
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [unit, setUnit] = useState('Unid');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(company.defaultTaxRate || 18);
  const [imageUrl, setImageUrl] = useState<string>('');

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  const openCreateModal = () => {
    setEditingProduct(null);
    setCode('');
    setName('');
    setDescription('');
    setCategory(categories[0] || 'Servicios');
    setUnit('Unid');
    setUnitPrice(0);
    setUnitCost(0);
    setTaxRate(company.defaultTaxRate || 18);
    setImageUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setCode(p.code || '');
    setName(p.name);
    setDescription(p.description || '');
    setCategory(p.category || '');
    setUnit(p.unit || 'Unid');
    setUnitPrice(p.unitPrice);
    setUnitCost(p.unitCost || 0);
    setTaxRate(p.taxRate ?? company.defaultTaxRate);
    setImageUrl(p.imageUrl || '');
    setIsModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const record: Product = {
      id: editingProduct ? editingProduct.id : 'prod-' + Date.now(),
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      category: category.trim() || 'General',
      unit: unit.trim() || 'Unid',
      unitPrice: Number(unitPrice) || 0,
      unitCost: Number(unitCost) || 0,
      taxRate: Number(taxRate) || 0,
      imageUrl: imageUrl.trim() || undefined,
      isActive: true,
    };

    onSaveProduct(record);
    setIsModalOpen(false);
  };

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase());

    const matchesCat = categoryFilter === 'all' || p.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Catálogo de Productos y Servicios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Estandarice precios unitarios, imágenes referenciales y descripciones técnicas para agilizar sus cotizaciones.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Producto / Servicio</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código, nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Categoría:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todas las categorías ({products.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <Package className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            {search || categoryFilter !== 'all'
              ? 'No hay productos que coincidan con la búsqueda'
              : 'El catálogo está vacío'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Registre sus servicios, productos o tarifas por hora con imagen referencial para seleccionarlos automáticamente en cada cotización.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear Primer Producto</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-3 w-14 text-center">Foto</th>
                  <th className="py-3 px-4">Código / SKU</th>
                  <th className="py-3 px-4">Nombre y Descripción</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4 text-center">Unidad</th>
                  <th className="py-3 px-4 text-right">Precio de Venta</th>
                  <th className="py-3 px-4 text-right">Costo / Margen</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const margin =
                    p.unitCost && p.unitCost > 0 && p.unitPrice > p.unitCost
                      ? Math.round(((p.unitPrice - p.unitCost) / p.unitPrice) * 100)
                      : null;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Thumbnail Image */}
                      <td className="py-2.5 px-3 text-center">
                        {p.imageUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal({ url: p.imageUrl!, title: p.name })}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white hover:border-blue-500 cursor-pointer shadow-2xs inline-block"
                            title="Ver imagen referencial ampliada"
                          >
                            <img
                              src={p.imageUrl}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center mx-auto">
                            <ImageIcon className="w-4 h-4 opacity-50" />
                          </div>
                        )}
                      </td>

                      {/* Code */}
                      <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                        {p.code || '-'}
                      </td>

                      {/* Name & Details */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="font-bold text-slate-900 text-xs">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                          {p.category || 'General'}
                        </span>
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-4 text-center text-slate-600 font-medium">
                        {p.unit}
                      </td>

                      {/* Unit Price */}
                      <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm tabular-nums">
                        {formatCurrency(p.unitPrice, company.currency)}
                      </td>

                      {/* Cost / Margin */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        {p.unitCost && p.unitCost > 0 ? (
                          <div>
                            <span className="text-slate-500 text-[11px] block">
                              Costo: {formatCurrency(p.unitCost, company.currency)}
                            </span>
                            {margin !== null && (
                              <span className="text-emerald-700 font-semibold text-[10px]">
                                Margen: +{margin}%
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Editar"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`¿Eliminar ${p.name} del catálogo?`)) {
                                onDeleteProduct(p.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Product with Image Upload */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <span>{editingProduct ? 'Editar Producto / Servicio' : 'Nuevo Producto / Servicio'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Product Reference Image Section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">
                  Imagen Referencial del Producto
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Vista previa"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-md cursor-pointer shadow-2xs">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Subir Imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                      </label>
                      {imageUrl && (
                        <button
                          type="button"
                          onClick={() => setImageUrl('')}
                          className="text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="O pegue URL de imagen (https://...)"
                        value={imageUrl.startsWith('data:') ? '' : imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1 text-[11px] text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="SRV-01"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre del Ítem *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Servidor Rack / Consultoría / Insumo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Descripción Técnica o Alcance
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles que se cargarán automáticamente al seleccionar este ítem en una cotización..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Software, Equipos, Obras..."
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Unidad de Medida
                  </label>
                  <input
                    type="text"
                    placeholder="Unid, Horas, Metros, Mes, Global"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Precio Venta ({company.currency.symbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Costo Estimado
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={unitCost}
                    onChange={(e) => setUnitCost(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tasa Impuesto (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Zoom Product Image */}
      {previewImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewImageModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-4 space-y-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-sm truncate">
                {previewImageModal.title}
              </h4>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>
            <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.title}
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
