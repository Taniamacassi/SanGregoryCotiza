import React, { useState } from 'react';
import {
  Quote,
  QuoteItem,
  Client,
  Product,
  CompanyProfile,
  TermsTemplate,
  QuoteStatus,
  PaymentMethodsDisplayConfig,
} from '../types';
import {
  getNextFolio,
  incrementQuoteNumber,
  formatCurrency,
} from '../utils/storage';
import {
  Plus,
  Trash2,
  Copy,
  Save,
  Eye,
  ArrowLeft,
  Building,
  UserPlus,
  Search,
  Sparkles,
  FileText,
  Calendar,
  DollarSign,
  AlertCircle,
  HelpCircle,
  Image as ImageIcon,
  Upload,
  Smartphone,
  CreditCard,
  Percent,
  Star,
  Banknote,
  CheckCircle2,
} from 'lucide-react';

interface Props {
  initialQuote?: Quote | null;
  company: CompanyProfile;
  clients: Client[];
  products: Product[];
  termsTemplates: TermsTemplate[];
  onSave: (quote: Quote, viewImmediately?: boolean) => void;
  onCancel: () => void;
  onQuickCreateClient: (client: Client) => void;
}

export const QuoteBuilderView: React.FC<Props> = ({
  initialQuote,
  company,
  clients,
  products,
  termsTemplates,
  onSave,
  onCancel,
  onQuickCreateClient,
}) => {
  // Compute initial dates
  const today = new Date().toISOString().split('T')[0];
  const initialValidityDays = initialQuote
    ? initialQuote.validityDays
    : company.defaultValidityDays || 15;

  const computeValidUntil = (baseDate: string, days: number): string => {
    try {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch {
      return baseDate;
    }
  };

  // State
  const [folio, setFolio] = useState<string>(() => {
    if (initialQuote) return initialQuote.folio;
    return getNextFolio().folio;
  });

  const [issueDate, setIssueDate] = useState<string>(
    initialQuote?.issueDate || today
  );
  const [validityDays, setValidityDays] = useState<number>(initialValidityDays);
  const [validUntil, setValidUntil] = useState<string>(() => {
    if (initialQuote?.validUntil) return initialQuote.validUntil;
    return computeValidUntil(today, initialValidityDays);
  });

  const [status, setStatus] = useState<QuoteStatus>(
    initialQuote?.status || 'borrador'
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(
    initialQuote?.clientId || (clients.length > 0 ? clients[0].id : '')
  );

  const [pricesIncludeTax, setPricesIncludeTax] = useState<boolean>(
    initialQuote?.pricesIncludeTax ?? (company.defaultPricesIncludeTax ?? false)
  );
  const taxName = initialQuote?.taxName || company.taxName || 'IGV';

  const [showProductImages, setShowProductImages] = useState<boolean>(
    initialQuote?.showProductImages ?? true
  );

  const [paymentMethodsConfig, setPaymentMethodsConfig] = useState<PaymentMethodsDisplayConfig>({
    showBankTransfer: initialQuote?.paymentMethodsConfig?.showBankTransfer ?? true,
    showYape: initialQuote?.paymentMethodsConfig?.showYape ?? (company.digitalWallets?.yape?.enabled ?? true),
    showPlin: initialQuote?.paymentMethodsConfig?.showPlin ?? (company.digitalWallets?.plin?.enabled ?? true),
    showCustomWallets: initialQuote?.paymentMethodsConfig?.showCustomWallets ?? false,
    showCash: initialQuote?.paymentMethodsConfig?.showCash ?? false,
    showCard: initialQuote?.paymentMethodsConfig?.showCard ?? false,
    showCredit: initialQuote?.paymentMethodsConfig?.showCredit ?? false,
    isExclusiveOffer: initialQuote?.paymentMethodsConfig?.isExclusiveOffer ?? false,
    exclusiveTitle: initialQuote?.paymentMethodsConfig?.exclusiveTitle || '',
    exclusiveNote: initialQuote?.paymentMethodsConfig?.exclusiveNote || '',
  });

  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientTaxId, setNewClientTaxId] = useState('');
  const [newClientContact, setNewClientContact] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');

  // Math helper for line item calculation according to whether prices include tax
  const calculateItemValues = (
    quantity: number,
    unitPrice: number,
    discountPercent: number,
    taxRate: number,
    includeTax: boolean
  ) => {
    const qty = Number(quantity) || 0;
    const price = Number(unitPrice) || 0;
    const discount = Number(discountPercent) || 0;
    const taxR = Number(taxRate) || 0;

    if (includeTax) {
      // Precio unitario ingresado YA incluye el impuesto (ej: S/ 118 con IGV 18%)
      const grossTotal = qty * price;
      const discountVal = (grossTotal * discount) / 100;
      const finalTotal = grossTotal - discountVal;
      // Base imponible neta = Total / (1 + tasa)
      const baseNet = taxR > 0 ? finalTotal / (1 + taxR / 100) : finalTotal;
      const taxAmount = finalTotal - baseNet;

      return {
        subtotal: baseNet,
        taxAmount: taxAmount,
        total: finalTotal,
      };
    } else {
      // Precio unitario es neto sin impuesto (ej: S/ 100 + 18% IGV = S/ 118)
      const grossNet = qty * price;
      const discountVal = (grossNet * discount) / 100;
      const baseNet = grossNet - discountVal;
      const taxAmount = (baseNet * taxR) / 100;
      const finalTotal = baseNet + taxAmount;

      return {
        subtotal: baseNet,
        taxAmount: taxAmount,
        total: finalTotal,
      };
    }
  };

  // Items
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (initialQuote && initialQuote.items.length > 0) {
      return initialQuote.items;
    }
    const defaultTax = company.defaultTaxRate ?? 18;
    const initCalcs = calculateItemValues(
      1,
      0,
      0,
      defaultTax,
      initialQuote?.pricesIncludeTax ?? (company.defaultPricesIncludeTax ?? false)
    );
    return [
      {
        id: 'item-' + Date.now(),
        code: '',
        name: '',
        description: '',
        unit: 'Unid',
        quantity: 1,
        unitPrice: 0,
        discountPercent: 0,
        taxRate: defaultTax,
        subtotal: initCalcs.subtotal,
        taxAmount: initCalcs.taxAmount,
        total: initCalcs.total,
        imageUrl: '',
      },
    ];
  });

  // Terms and conditions
  const [paymentTerms, setPaymentTerms] = useState<string>(
    initialQuote?.paymentTerms ?? company.defaultPaymentTerms
  );
  const [deliveryTime, setDeliveryTime] = useState<string>(
    initialQuote?.deliveryTime ?? company.defaultDeliveryTime
  );
  const [termsAndConditions, setTermsAndConditions] = useState<string>(
    initialQuote?.termsAndConditions ?? company.defaultTerms
  );
  const [notes, setNotes] = useState<string>(
    initialQuote?.notes ?? company.defaultNotes
  );

  // Selected client object
  const currentClient =
    clients.find((c) => c.id === selectedClientId) ||
    initialQuote?.clientSnapshot ||
    clients[0];

  // Recalculate item line totals
  const updateItem = (
    index: number,
    field: keyof QuoteItem,
    value: string | number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index], [field]: value };

      const calcs = calculateItemValues(
        item.quantity,
        item.unitPrice,
        item.discountPercent,
        item.taxRate,
        pricesIncludeTax
      );

      item.subtotal = calcs.subtotal;
      item.taxAmount = calcs.taxAmount;
      item.total = calcs.total;

      copy[index] = item;
      return copy;
    });
  };

  // Switch tax mode and recalculate all current items
  const handleTogglePricesIncludeTax = (newIncludeTax: boolean) => {
    setPricesIncludeTax(newIncludeTax);
    setItems((prev) =>
      prev.map((item) => {
        const calcs = calculateItemValues(
          item.quantity,
          item.unitPrice,
          item.discountPercent,
          item.taxRate,
          newIncludeTax
        );
        return {
          ...item,
          subtotal: calcs.subtotal,
          taxAmount: calcs.taxAmount,
          total: calcs.total,
        };
      })
    );
  };

  const handleItemImageUpload = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        updateItem(index, 'imageUrl', reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add line item
  const handleAddItem = (product?: Product) => {
    const defaultTax = product?.taxRate ?? company.defaultTaxRate;
    const price = product?.unitPrice || 0;
    const calcs = calculateItemValues(1, price, 0, defaultTax, pricesIncludeTax);

    const newItem: QuoteItem = {
      id: 'item-' + Date.now() + Math.random().toString(36).substring(2, 5),
      productId: product?.id,
      code: product?.code || '',
      name: product?.name || '',
      description: product?.description || '',
      unit: product?.unit || 'Unid',
      quantity: 1,
      unitPrice: price,
      discountPercent: 0,
      taxRate: defaultTax,
      subtotal: calcs.subtotal,
      taxAmount: calcs.taxAmount,
      total: calcs.total,
      imageUrl: product?.imageUrl || '',
    };
    setItems([...items, newItem]);
  };

  const handleDuplicateItem = (index: number) => {
    const original = items[index];
    const cloned: QuoteItem = {
      ...original,
      id: 'item-' + Date.now() + Math.random().toString(36).substring(2, 5),
    };
    const nextItems = [...items];
    nextItems.splice(index + 1, 0, cloned);
    setItems(nextItems);
  };

  const handleDeleteItem = (index: number) => {
    if (items.length <= 1) {
      alert('La cotización debe tener al menos un ítem.');
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Quick product selection for an existing row
  const handleSelectProductForRow = (index: number, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };
      item.productId = prod.id;
      item.code = prod.code;
      item.name = prod.name;
      item.description = prod.description;
      item.unit = prod.unit;
      item.unitPrice = prod.unitPrice;
      item.taxRate = prod.taxRate;
      item.imageUrl = prod.imageUrl || '';

      const calcs = calculateItemValues(
        item.quantity || 1,
        prod.unitPrice,
        item.discountPercent || 0,
        prod.taxRate,
        pricesIncludeTax
      );

      item.subtotal = calcs.subtotal;
      item.taxAmount = calcs.taxAmount;
      item.total = calcs.total;

      copy[index] = item;
      return copy;
    });
  };

  // Date updates
  const handleDaysChange = (days: number) => {
    setValidityDays(days);
    setValidUntil(computeValidUntil(issueDate, days));
  };

  const handleIssueDateChange = (newDate: string) => {
    setIssueDate(newDate);
    setValidUntil(computeValidUntil(newDate, validityDays));
  };

  // Load a terms template
  const handleApplyTermsTemplate = (templateId: string) => {
    const tpl = termsTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (
      window.confirm(
        `¿Desea aplicar la plantilla "${tpl.name}"? Esto actualizará las condiciones y términos de este documento.`
      )
    ) {
      setPaymentTerms(tpl.paymentTerms);
      setDeliveryTime(tpl.deliveryTime);
      setTermsAndConditions(tpl.terms);
      if (tpl.notes) setNotes(tpl.notes);
      if (tpl.validityDays) {
        setValidityDays(tpl.validityDays);
        setValidUntil(computeValidUntil(issueDate, tpl.validityDays));
      }
    }
  };

  // Financial aggregates
  const subtotalGross = items.reduce(
    (acc, it) => acc + (it.quantity || 0) * (it.unitPrice || 0),
    0
  );
  const discountTotal = items.reduce((acc, it) => {
    const rowGross = (it.quantity || 0) * (it.unitPrice || 0);
    return acc + (rowGross * (it.discountPercent || 0)) / 100;
  }, 0);
  const subtotalNet = items.reduce((acc, it) => acc + (it.subtotal || 0), 0);
  const taxTotal = items.reduce((acc, it) => acc + (it.taxAmount || 0), 0);
  const total = items.reduce((acc, it) => acc + (it.total || 0), 0);

  // Save handler
  const handleSaveInternal = (viewImmediately = false) => {
    if (!selectedClientId && !currentClient) {
      alert('Por favor seleccione o cree un cliente para la cotización.');
      return;
    }
    if (items.some((it) => !it.name.trim())) {
      alert('Todos los ítems de la cotización deben tener un nombre o descripción.');
      return;
    }

    const clientSnap =
      clients.find((c) => c.id === selectedClientId) ||
      currentClient ||
      ({
        id: 'cli-gen',
        name: 'Cliente General',
        taxId: '',
        taxIdLabel: company.taxIdLabel || 'RUC',
        contactPerson: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        country: '',
        createdAt: today,
      } as Client);

    const quoteRecord: Quote = {
      id: initialQuote ? initialQuote.id : 'quote-' + Date.now(),
      folio,
      issueDate,
      validUntil,
      clientId: clientSnap.id,
      clientSnapshot: clientSnap,
      companySnapshot: company,
      items,
      currency: company.currency,
      subtotalGross,
      discountTotal,
      subtotalNet,
      taxTotal,
      total,
      status,
      paymentTerms,
      deliveryTime,
      validityDays,
      termsAndConditions,
      notes,
      templateTheme: initialQuote?.templateTheme || 'corporate',
      pricesIncludeTax,
      taxName,
      showProductImages,
      paymentMethodsConfig,
      createdAt: initialQuote?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!initialQuote) {
      incrementQuoteNumber();
    }

    onSave(quoteRecord, viewImmediately);
  };

  // Quick Client Creation
  const handleCreateClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newCli: Client = {
      id: 'cli-' + Date.now(),
      name: newClientName.trim(),
      taxId: newClientTaxId.trim(),
      taxIdLabel: company.taxIdLabel || 'RUC',
      contactPerson: newClientContact.trim(),
      email: newClientEmail.trim(),
      phone: newClientPhone.trim(),
      address: newClientAddress.trim(),
      city: company.city || '',
      country: company.country || '',
      createdAt: today,
    };

    onQuickCreateClient(newCli);
    setSelectedClientId(newCli.id);
    setShowNewClientModal(false);

    // reset modal fields
    setNewClientName('');
    setNewClientTaxId('');
    setNewClientContact('');
    setNewClientEmail('');
    setNewClientPhone('');
    setNewClientAddress('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Volver sin guardar"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {initialQuote ? `Editar Cotización ${initialQuote.folio}` : 'Nueva Cotización'}
            </h1>
            <p className="text-xs text-slate-500">
              Complete los datos del cliente, agregue los ítems con imagen y personalice las condiciones comerciales y billeteras de pago.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => handleSaveInternal(false)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 text-slate-600" />
            <span>Guardar Borrador</span>
          </button>
          <button
            onClick={() => handleSaveInternal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Guardar y Ver Documento</span>
          </button>
        </div>
      </div>

      {/* Basic Metadata Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Número de Folio / Cotización
          </label>
          <input
            type="text"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            className="w-full text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Fecha de Emisión
          </label>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => handleIssueDateChange(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Validez de la Oferta
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="180"
              value={validityDays}
              onChange={(e) => handleDaysChange(Number(e.target.value) || 1)}
              className="w-20 text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800 text-center focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-500 self-center">días (hasta {validUntil})</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Estado Actual
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          >
            <option value="borrador">Borrador</option>
            <option value="enviada">Enviada al Cliente</option>
            <option value="aprobada">Aprobada / Confirmada</option>
            <option value="rechazada">Rechazada</option>
            <option value="vencida">Vencida</option>
            <option value="facturada">Facturada</option>
          </select>
        </div>
      </div>

      {/* Client Selector & Snapshot Info */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Cliente / Destinatario</span>
            </h2>
            <p className="text-xs text-slate-500">
              Seleccione un cliente registrado o cree uno nuevo rápidamente con su {company.taxIdLabel || 'RUC'}.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-500 flex-1 sm:w-64"
            >
              {clients.length === 0 && <option value="">Sin clientes registrados</option>}
              {clients.map((cli) => (
                <option key={cli.id} value={cli.id}>
                  {cli.name} {cli.taxId ? `(${cli.taxIdLabel || company.taxIdLabel || 'ID'}: ${cli.taxId})` : ''}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewClientModal(true)}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Nuevo Cliente</span>
            </button>
          </div>
        </div>

        {/* Selected Client Card */}
        {currentClient && (
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 block font-medium">Razón Social:</span>
              <span className="font-bold text-slate-800 text-sm">{currentClient.name}</span>
              {currentClient.taxId && (
                <span className="text-slate-600 font-mono block">
                  {currentClient.taxIdLabel || company.taxIdLabel || 'RUC'}: {currentClient.taxId}
                </span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Contacto:</span>
              <span className="font-medium text-slate-700">{currentClient.contactPerson || 'No especificado'}</span>
              {currentClient.email && (
                <span className="text-slate-500 block">{currentClient.email}</span>
              )}
              {currentClient.phone && (
                <span className="text-slate-500 block">{currentClient.phone}</span>
              )}
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Ubicación:</span>
              <span className="text-slate-700 block">
                {currentClient.address || 'Sin dirección registrada'}
              </span>
              {(currentClient.city || currentClient.country) && (
                <span className="text-slate-500 block">
                  {currentClient.city}{currentClient.country ? `, ${currentClient.country}` : ''}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Items Section */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Detalle de Productos, Servicios y Honorarios
            </h2>
            <p className="text-xs text-slate-500">
              Agregue líneas de cotización con imágenes referenciales o seleccione directamente desde su catálogo.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Show product images toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={showProductImages}
                onChange={(e) => setShowProductImages(e.target.checked)}
                className="w-3.5 h-3.5 text-blue-600 rounded"
              />
              <span className="font-semibold">Incluir imágenes en documento</span>
            </label>

            {/* Quick Catalog Adder */}
            {products.length > 0 && (
              <div className="relative inline-block text-left">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const found = products.find((p) => p.id === e.target.value);
                    if (found) {
                      handleAddItem(found);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 font-medium text-slate-700 cursor-pointer"
                >
                  <option value="" disabled>
                    + Agregar desde Catálogo...
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code ? `[${p.code}] ` : ''}{p.name} - {formatCurrency(p.unitPrice, company.currency)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={() => handleAddItem()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar Ítem</span>
            </button>
          </div>
        </div>

        {/* Tax Mode Selection Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Percent className="w-4 h-4 text-blue-600" />
              <span>Modalidad de Impuestos ({taxName}):</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                pricesIncludeTax
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  : 'bg-blue-100 text-blue-800 border border-blue-300'
              }`}>
                {pricesIncludeTax ? `Precios con ${taxName} Incluido` : `Precios Más ${taxName} al total`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {pricesIncludeTax
                ? `Los precios unitarios son montos finales al cliente. El sistema desglosa automáticamente la base neta y el ${taxName} (${company.defaultTaxRate}%).`
                : `Los precios unitarios son netos. El sistema sumará el ${taxName} (${company.defaultTaxRate}%) al subtotal neto al calcular el total.`}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-300 shrink-0 shadow-2xs">
            <button
              type="button"
              onClick={() => handleTogglePricesIncludeTax(false)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                !pricesIncludeTax
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              + {taxName} al total
            </button>
            <button
              type="button"
              onClick={() => handleTogglePricesIncludeTax(true)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                pricesIncludeTax
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              ✓ {taxName} Ya Incluido
            </button>
          </div>
        </div>

        {/* Line Items List */}
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 transition-all hover:border-slate-300 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-700">Línea de cotización</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDuplicateItem(idx)}
                    className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Duplicar ítem"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded transition-colors cursor-pointer"
                    title="Eliminar ítem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Row Inputs with Image Thumbnail */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                {/* Product Image Thumbnail / Upload */}
                <div className="sm:col-span-2 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-lg border border-slate-300 bg-white flex items-center justify-center overflow-hidden relative shadow-2xs group mb-1">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt="Foto ítem"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300" />
                    )}
                  </div>
                  <label className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer">
                    {item.imageUrl ? 'Cambiar foto' : '+ Subir foto'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleItemImageUpload(idx, e)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Código / SKU
                  </label>
                  <input
                    type="text"
                    placeholder="SRV-01"
                    value={item.code}
                    onChange={(e) => updateItem(idx, 'code', e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Nombre o Título del Servicio / Producto *
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Desarrollo de Sistema Web / Consultoría"
                    value={item.name}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900"
                    required
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Vincular Catálogo (Opcional)
                  </label>
                  <select
                    value={item.productId || ''}
                    onChange={(e) => handleSelectProductForRow(idx, e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2 py-1.5 text-slate-700"
                  >
                    <option value="">Seleccionar producto/servicio...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrency(p.unitPrice, company.currency)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description textarea */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Descripción Detallada / Alcance
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles técnicos, especificaciones, entregables o características del producto..."
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-700"
                />
              </div>

              {/* Quantities and pricing */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Unidad
                  </label>
                  <input
                    type="text"
                    placeholder="Unid, Horas, etc."
                    value={item.unit}
                    onChange={(e) => updateItem(idx, 'unit', e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-800 text-center"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value) || 0)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 text-right font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Precio Unit. ({company.currency.symbol}) {pricesIncludeTax ? `(Inc. ${taxName})` : '(Neto)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value) || 0)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 text-right font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Desc. %
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discountPercent}
                    onChange={(e) => updateItem(idx, 'discountPercent', Number(e.target.value) || 0)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-slate-900 text-right"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1 bg-white p-2 rounded-md border border-slate-200 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    {pricesIncludeTax ? `Total (Inc. ${taxName})` : 'Total Línea'}
                  </span>
                  <span className="text-sm font-bold text-slate-900 tabular-nums">
                    {formatCurrency(pricesIncludeTax ? item.total : item.subtotal, company.currency)}
                  </span>
                  {pricesIncludeTax && (
                    <span className="text-[10px] text-slate-400 block tabular-nums">
                      Neto: {formatCurrency(item.subtotal, company.currency)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Aggregate Financial Summary Box */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-t border-slate-200 pt-4">
          <div className="text-xs space-y-1">
            <span className="font-bold text-slate-700 block">Condición tributaria del documento:</span>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-medium ${
              pricesIncludeTax
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-blue-50 text-blue-800 border-blue-300'
            }`}>
              <Percent className="w-3.5 h-3.5" />
              <span>
                {pricesIncludeTax
                  ? `Precios con ${taxName} (${company.defaultTaxRate}%) ya incluido en cada ítem`
                  : `Precios más ${taxName} (${company.defaultTaxRate}%) calculado sobre el subtotal`}
              </span>
            </div>
          </div>

          <div className="w-full sm:w-80 bg-slate-50 rounded-xl p-4 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>{pricesIncludeTax ? 'Total Bruto de Lista:' : 'Subtotal Bruto:'}</span>
              <span className="font-semibold tabular-nums">{formatCurrency(subtotalGross, company.currency)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>Descuento Comercial:</span>
                <span className="font-semibold tabular-nums">- {formatCurrency(discountTotal, company.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-medium border-t border-slate-200 pt-1.5">
              <span>Base Imponible (Subtotal Neto):</span>
              <span className="tabular-nums font-semibold">{formatCurrency(subtotalNet, company.currency)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>{taxName} ({company.defaultTaxRate}%){pricesIncludeTax ? ' Incluido' : ''}:</span>
              <span className="font-semibold tabular-nums">{formatCurrency(taxTotal, company.currency)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-black border-t-2 border-slate-900 pt-2 text-slate-900">
              <span>TOTAL COTIZADO:</span>
              <span className="text-base font-extrabold text-blue-700 tabular-nums">
                {formatCurrency(total, company.currency)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Specific Commercial Terms & Conditions Block */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Términos, Condiciones y Métodos de Pago del Documento</span>
            </h2>
            <p className="text-xs text-slate-500">
              Seleccione los métodos de pago a mostrar (Transferencia, Yape, Plin) y cargue plantillas por rubro.
            </p>
          </div>

          {/* Template Picker */}
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleApplyTermsTemplate(e.target.value);
                  e.target.value = '';
                }
              }}
              className="text-xs bg-amber-50/70 hover:bg-amber-100/70 border border-amber-300 rounded-lg px-3 py-1.5 font-medium text-amber-900 cursor-pointer"
            >
              <option value="" disabled>
                Cargar Plantilla por Rubro...
              </option>
              {termsTemplates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.sector})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Exclusive Payment Options for this Client */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/80 pb-3">
            <div>
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Medios y Condiciones de Pago Ofrecidos al Cliente:</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Seleccione qué canales y condiciones de pago habilita de forma exclusiva para <strong className="text-slate-800">{currentClient?.name || 'este cliente'}</strong> en esta cotización.
              </p>
            </div>

            {/* Exclusive Offer Toggle */}
            <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
              paymentMethodsConfig.isExclusiveOffer
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
            }`}>
              <input
                type="checkbox"
                checked={!!paymentMethodsConfig.isExclusiveOffer}
                onChange={(e) => {
                  const isChecked = e.target.checked;
                  setPaymentMethodsConfig({
                    ...paymentMethodsConfig,
                    isExclusiveOffer: isChecked,
                    exclusiveTitle: isChecked
                      ? (paymentMethodsConfig.exclusiveTitle || `Condición Exclusiva para ${currentClient?.name || 'Cliente'}`)
                      : '',
                  });
                }}
                className="hidden"
              />
              <Star className={`w-3.5 h-3.5 ${paymentMethodsConfig.isExclusiveOffer ? 'text-amber-100 fill-amber-100' : 'text-amber-500'}`} />
              <span>{paymentMethodsConfig.isExclusiveOffer ? '⭐ Oferta de Pago Exclusiva Activa' : 'Activar como Pago Exclusivo'}</span>
            </label>
          </div>

          {/* Exclusive Offer Configuration Card */}
          {paymentMethodsConfig.isExclusiveOffer && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 space-y-3 transition-all animate-fadeIn">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-600 fill-amber-500" />
                  <span>Configuración del Acuerdo o Facilidad Exclusiva</span>
                </span>
                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-300">
                  Visible en PDF para el Cliente
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block mb-1">
                  Plantillas de Condiciones Preferenciales:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    {
                      label: '100% Contado / Despacho Inmediato',
                      title: 'Acuerdo Especial: 100% Contado con Entrega Prioritaria',
                      terms: '100% al aprobar la cotización para despacho y ejecución prioritaria.',
                    },
                    {
                      label: '50% Anticipo / 50% Entrega',
                      title: 'Modalidad Escalonada: 50% Anticipo y 50% Contra Entrega',
                      terms: '50% de anticipo para inicio de producción y 50% restante contra entrega conforme.',
                    },
                    {
                      label: 'Crédito Exclusivo 15 Días',
                      title: 'Crédito Comercial Preferencial a 15 Días',
                      terms: 'Crédito comercial exclusivo a 15 días posteriores a la emisión de factura.',
                    },
                    {
                      label: 'Crédito Exclusivo 30 Días',
                      title: 'Crédito Comercial Preferencial a 30 Días',
                      terms: 'Crédito comercial exclusivo a 30 días posteriores a la emisión de factura.',
                    },
                    {
                      label: '100% Contra Entrega / Conformidad',
                      title: 'Pago Contra Entrega a Conformidad',
                      terms: 'Pago íntegro tras recepción y conformidad técnica de los entregables.',
                    },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setPaymentTerms(preset.terms);
                        setPaymentMethodsConfig({
                          ...paymentMethodsConfig,
                          exclusiveTitle: preset.title,
                          exclusiveNote: `Condición especial otorgada a ${currentClient?.name || 'cliente'}: ${preset.terms}`,
                        });
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-amber-100 text-amber-900 rounded-md border border-amber-300 transition-colors cursor-pointer shadow-2xs"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Título del Acuerdo Exclusivo
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Condición Preferencial Cliente VIP 2026"
                    value={paymentMethodsConfig.exclusiveTitle || ''}
                    onChange={(e) =>
                      setPaymentMethodsConfig({
                        ...paymentMethodsConfig,
                        exclusiveTitle: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-900 font-semibold focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nota o Instrucción de Pago Exclusiva
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Se han habilitado exclusivamente los pagos por Transferencia Bancaria y Yape con confirmación directa."
                    value={paymentMethodsConfig.exclusiveNote || ''}
                    onChange={(e) =>
                      setPaymentMethodsConfig({
                        ...paymentMethodsConfig,
                        exclusiveNote: e.target.value,
                      })
                    }
                    className="w-full text-xs bg-white border border-amber-300 rounded-lg px-3 py-2 text-slate-800 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Methods Checkboxes Grid */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Seleccione qué canales de pago están disponibles para este cliente:
              </span>
              <span className="text-[11px] font-semibold text-blue-700">
                {[
                  paymentMethodsConfig.showBankTransfer,
                  paymentMethodsConfig.showYape,
                  paymentMethodsConfig.showPlin,
                  paymentMethodsConfig.showCash,
                  paymentMethodsConfig.showCard,
                  paymentMethodsConfig.showCredit,
                  paymentMethodsConfig.showCustomWallets,
                ].filter(Boolean).length} canal(es) activo(s)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {/* 1. Bank Transfer */}
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                paymentMethodsConfig.showBankTransfer
                  ? 'bg-blue-50/80 border-blue-300 shadow-2xs'
                  : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={paymentMethodsConfig.showBankTransfer}
                  onChange={(e) =>
                    setPaymentMethodsConfig({
                      ...paymentMethodsConfig,
                      showBankTransfer: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-blue-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block flex items-center gap-1">
                    🏦 Transferencia Bancaria
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {company.bankInfo.bankName || 'Banco'} - Cta: {company.bankInfo.accountNumber || 'Configurada'}
                  </span>
                </div>
              </label>

              {/* 2. Yape */}
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                paymentMethodsConfig.showYape
                  ? 'bg-purple-50/80 border-purple-300 shadow-2xs'
                  : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={paymentMethodsConfig.showYape}
                  onChange={(e) =>
                    setPaymentMethodsConfig({
                      ...paymentMethodsConfig,
                      showYape: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-purple-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-purple-900 block flex items-center gap-1">
                    🟣 Billetera Yape
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {company.digitalWallets?.yape?.phone ? `Tel: ${company.digitalWallets.yape.phone}` : 'Disponible'}
                  </span>
                </div>
              </label>

              {/* 3. Plin */}
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                paymentMethodsConfig.showPlin
                  ? 'bg-cyan-50/80 border-cyan-300 shadow-2xs'
                  : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={paymentMethodsConfig.showPlin}
                  onChange={(e) =>
                    setPaymentMethodsConfig({
                      ...paymentMethodsConfig,
                      showPlin: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-cyan-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-cyan-900 block flex items-center gap-1">
                    🔵 Billetera Plin
                  </span>
                  <span className="text-[11px] text-slate-500 block truncate">
                    {company.digitalWallets?.plin?.phone ? `Tel: ${company.digitalWallets.plin.phone}` : 'Disponible'}
                  </span>
                </div>
              </label>

              {/* 4. Cash / Contra Entrega */}
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                paymentMethodsConfig.showCash
                  ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs'
                  : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={!!paymentMethodsConfig.showCash}
                  onChange={(e) =>
                    setPaymentMethodsConfig({
                      ...paymentMethodsConfig,
                      showCash: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-emerald-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block flex items-center gap-1">
                    💵 Efectivo / Contra Entrega
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Abono directo al recibir servicio
                  </span>
                </div>
              </label>

              {/* 5. Card / POS / Link */}
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                paymentMethodsConfig.showCard
                  ? 'bg-indigo-50/80 border-indigo-300 shadow-2xs'
                  : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={!!paymentMethodsConfig.showCard}
                  onChange={(e) =>
                    setPaymentMethodsConfig({
                      ...paymentMethodsConfig,
                      showCard: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-indigo-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block flex items-center gap-1">
                    💳 Tarjeta Débito / Crédito
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    POS o enlace seguro de pago
                  </span>
                </div>
              </label>

              {/* 6. Direct Commercial Credit */}
              <label className={`flex items-start gap-2.5 p-3 rounded-lg border cursor-pointer transition-all ${
                paymentMethodsConfig.showCredit
                  ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                  : 'bg-white border-slate-200 opacity-70 hover:opacity-100'
              }`}>
                <input
                  type="checkbox"
                  checked={!!paymentMethodsConfig.showCredit}
                  onChange={(e) =>
                    setPaymentMethodsConfig({
                      ...paymentMethodsConfig,
                      showCredit: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-amber-600 rounded mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-bold text-amber-900 block flex items-center gap-1">
                    📑 Crédito Comercial Directo
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Factura a plazo acordado
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Forma y Condiciones de Pago
            </label>
            <input
              type="text"
              placeholder="Ej: 50% de anticipo al aceptar y 50% contra entrega final."
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Plazo de Entrega o Ejecución
            </label>
            <input
              type="text"
              placeholder="Ej: 10 a 15 días hábiles a partir de la confirmación."
              value={deliveryTime}
              onChange={(e) => setDeliveryTime(e.target.value)}
              className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Cláusulas Legales, Garantía y Condiciones Específicas
          </label>
          <textarea
            rows={5}
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 leading-relaxed focus:bg-white"
            placeholder="Ingrese los términos específicos, acuerdos de confidencialidad, garantías, etc."
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Notas u Observaciones Comerciales para el Cliente
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-800"
            placeholder="Agradecemos su preferencia o comentarios de coordinación..."
          />
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="sticky bottom-4 z-10 bg-slate-900/90 backdrop-blur-sm text-white p-4 rounded-xl shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              Total de la Cotización
            </span>
            <span className="text-lg font-black tabular-nums text-white">
              {formatCurrency(total, company.currency)}
            </span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            ({items.length} {items.length === 1 ? 'ítem' : 'ítems'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Descartar
          </button>
          <button
            type="button"
            onClick={() => handleSaveInternal(false)}
            className="px-4 py-2 text-xs font-bold text-slate-900 bg-slate-200 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => handleSaveInternal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Generar y Ver PDF</span>
          </button>
        </div>
      </div>

      {/* Modal: Quick Create Client */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Registrar Nuevo Cliente</span>
              </h3>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateClientSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre Comercial o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Inversiones Globales SAC"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {company.taxIdLabel || 'RUC'} / Identificación Fiscal
                  </label>
                  <input
                    type="text"
                    placeholder={`Ej: ${company.taxIdLabel === 'RUC' ? '20601234567' : '76.842.190-K'}`}
                    value={newClientTaxId}
                    onChange={(e) => setNewClientTaxId(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ing. Carlos Pérez"
                    value={newClientContact}
                    onChange={(e) => setNewClientContact(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@cliente.com"
                    value={newClientEmail}
                    onChange={(e) => setNewClientEmail(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+51 987 654 321"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dirección y Ciudad
                </label>
                <input
                  type="text"
                  placeholder="Av. Javier Prado 1200, Lima"
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs"
                >
                  Guardar y Seleccionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
