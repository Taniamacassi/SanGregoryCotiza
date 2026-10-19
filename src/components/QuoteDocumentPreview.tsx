import React, { useState } from 'react';
import { Quote, QuoteTheme } from '../types';
import { formatCurrency } from '../utils/storage';
import { numberToSpanishWords } from '../utils/numberToWords';
import {
  Printer,
  ArrowLeft,
  Share2,
  FileCheck,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  FileText,
  Copy,
  Check,
  Palette,
  ExternalLink,
  Smartphone,
  QrCode,
  Image as ImageIcon,
  Star,
  Banknote,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react';

interface Props {
  quote: Quote;
  onBack: () => void;
  onEdit: (quote: Quote) => void;
  onUpdateStatus?: (newStatus: Quote['status']) => void;
  onOpenGoogleSheets?: () => void;
  onSyncQuoteToSheets?: (quote: Quote) => Promise<void>;
}

export const QuoteDocumentPreview: React.FC<Props> = ({
  quote,
  onBack,
  onEdit,
  onUpdateStatus,
  onOpenGoogleSheets,
  onSyncQuoteToSheets,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<QuoteTheme>(
    quote.templateTheme || 'corporate'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSavingToSheets, setIsSavingToSheets] = useState(false);
  const [sheetsSavedSuccess, setSheetsSavedSuccess] = useState(false);
  const [displayImages, setDisplayImages] = useState(quote.showProductImages !== false);

  const { companySnapshot: comp, clientSnapshot: cli, items, currency } = quote;
  const taxName = quote.taxName || comp.taxName || 'IGV';

  const hasAnyItemImage =
    displayImages && items.some((it) => !!it.imageUrl);

  // Payment methods and exclusive offer decisions for this quotation/client
  const showYape =
    comp.digitalWallets?.yape?.enabled &&
    comp.digitalWallets?.yape?.phone &&
    (quote.paymentMethodsConfig?.showYape ?? true);

  const showPlin =
    comp.digitalWallets?.plin?.enabled &&
    comp.digitalWallets?.plin?.phone &&
    (quote.paymentMethodsConfig?.showPlin ?? true);

  const showBank =
    quote.paymentMethodsConfig?.showBankTransfer ?? true;

  const showCash =
    quote.paymentMethodsConfig?.showCash ?? false;

  const showCard =
    quote.paymentMethodsConfig?.showCard ?? false;

  const showCredit =
    quote.paymentMethodsConfig?.showCredit ?? false;

  const isExclusive =
    quote.paymentMethodsConfig?.isExclusiveOffer ?? false;

  const exclusiveTitle =
    quote.paymentMethodsConfig?.exclusiveTitle;

  const exclusiveNote =
    quote.paymentMethodsConfig?.exclusiveNote;

  const hasAnyPaymentChannel =
    showBank || showYape || showPlin || showCash || showCard || showCredit;

  // Theme styling configurations
  const themeStyles = {
    corporate: {
      headerBg: 'bg-slate-900 text-white',
      accentColor: 'text-blue-700',
      badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
      tableHeaderBg: 'bg-slate-100 text-slate-800',
      totalBoxBg: 'bg-slate-900 text-white',
      borderAccent: 'border-blue-600',
      pillAccent: 'border-slate-300',
    },
    slate: {
      headerBg: 'bg-zinc-800 text-white',
      accentColor: 'text-zinc-900',
      badgeBg: 'bg-zinc-100 text-zinc-900 border-zinc-300',
      tableHeaderBg: 'bg-zinc-100 text-zinc-900',
      totalBoxBg: 'bg-zinc-800 text-white',
      borderAccent: 'border-zinc-700',
      pillAccent: 'border-zinc-300',
    },
    emerald: {
      headerBg: 'bg-emerald-950 text-white',
      accentColor: 'text-emerald-700',
      badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      tableHeaderBg: 'bg-emerald-50/70 text-emerald-900',
      totalBoxBg: 'bg-emerald-950 text-white',
      borderAccent: 'border-emerald-600',
      pillAccent: 'border-emerald-300',
    },
    minimal: {
      headerBg: 'bg-white text-slate-900 border-b-2 border-slate-900',
      accentColor: 'text-slate-900',
      badgeBg: 'bg-slate-50 text-slate-900 border-slate-300',
      tableHeaderBg: 'bg-slate-50 text-slate-900 border-b border-slate-300',
      totalBoxBg: 'bg-slate-100 text-slate-900 border border-slate-300',
      borderAccent: 'border-slate-900',
      pillAccent: 'border-slate-200',
    },
  }[selectedTheme];

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `Cotización ${quote.folio} para ${cli.name}\nTotal: ${formatCurrency(
      quote.total,
      currency
    )}\nValidez hasta: ${quote.validUntil}\nEmisor: ${comp.name}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const message = encodeURIComponent(
      `Hola ${cli.contactPerson || cli.name}, adjuntamos los detalles de la Cotización *${quote.folio}* de *${comp.name}* por un valor total de *${formatCurrency(
        quote.total,
        currency
      )}*. Válida hasta el ${quote.validUntil}. ¡Quedamos atentos a sus comentarios!`
    );
    const phone = cli.phone?.replace(/[^0-9]/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const statusLabels: Record<Quote['status'], { label: string; bg: string; text: string }> = {
    borrador: { label: 'Borrador', bg: 'bg-amber-50', text: 'text-amber-800' },
    enviada: { label: 'Enviada', bg: 'bg-blue-50', text: 'text-blue-800' },
    aprobada: { label: 'Aprobada', bg: 'bg-emerald-50', text: 'text-emerald-800' },
    rechazada: { label: 'Rechazada', bg: 'bg-rose-50', text: 'text-rose-800' },
    vencida: { label: 'Vencida', bg: 'bg-slate-100', text: 'text-slate-700' },
    facturada: { label: 'Facturada', bg: 'bg-purple-50', text: 'text-purple-800' },
  };

  return (
    <div className="min-h-screen bg-slate-100 pb-16">
      {/* Action Toolbar (Hidden during print) */}
      <div className="no-print sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs px-4 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver</span>
            </button>
            <div className="h-4 w-px bg-slate-300 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{quote.folio}</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-md ${
                  statusLabels[quote.status]?.bg
                } ${statusLabels[quote.status]?.text}`}
              >
                {statusLabels[quote.status]?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Theme switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <Palette className="w-3.5 h-3.5 text-slate-500 ml-1 mr-0.5" />
              <button
                onClick={() => setSelectedTheme('corporate')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTheme === 'corporate'
                    ? 'bg-white shadow-xs text-blue-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Corporativo
              </button>
              <button
                onClick={() => setSelectedTheme('slate')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTheme === 'slate'
                    ? 'bg-white shadow-xs text-zinc-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pizarra
              </button>
              <button
                onClick={() => setSelectedTheme('emerald')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTheme === 'emerald'
                    ? 'bg-white shadow-xs text-emerald-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Esmeralda
              </button>
              <button
                onClick={() => setSelectedTheme('minimal')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  selectedTheme === 'minimal'
                    ? 'bg-white shadow-xs text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Limpio
              </button>
            </div>

            {/* Toggle show/hide images */}
            {items.some((it) => !!it.imageUrl) && (
              <button
                onClick={() => setDisplayImages(!displayImages)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                  displayImages
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
                title="Mostrar u ocultar fotos en la cotización"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{displayImages ? 'Fotos Activas' : 'Sin Fotos'}</span>
              </button>
            )}

            {/* Quick Status dropdown if provided */}
            {onUpdateStatus && (
              <select
                value={quote.status}
                onChange={(e) => onUpdateStatus(e.target.value as Quote['status'])}
                className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 hover:border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              >
                <option value="borrador">Borrador</option>
                <option value="enviada">Enviada</option>
                <option value="aprobada">Aprobada</option>
                <option value="rechazada">Rechazada</option>
                <option value="vencida">Vencida</option>
                <option value="facturada">Facturada</option>
              </select>
            )}

            <button
              onClick={() => onEdit(quote)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editar</span>
            </button>

            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              title="Compartir por WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {onSyncQuoteToSheets && (
              <button
                onClick={async () => {
                  setIsSavingToSheets(true);
                  try {
                    await onSyncQuoteToSheets(quote);
                    setSheetsSavedSuccess(true);
                    setTimeout(() => setSheetsSavedSuccess(false), 3500);
                  } finally {
                    setIsSavingToSheets(false);
                  }
                }}
                disabled={isSavingToSheets}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Guardar o actualizar esta cotización en Google Sheets"
              >
                <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-600 ${isSavingToSheets ? 'animate-pulse' : ''}`} />
                <span>
                  {sheetsSavedSuccess
                    ? '¡Guardado en Sheets!'
                    : isSavingToSheets
                    ? 'Guardando...'
                    : 'Google Sheets'}
                </span>
              </button>
            )}

            <button
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              title="Copiar resumen comercial"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copiedLink ? 'Copiado' : 'Copiar'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Printable Document Canvas */}
      <div className="max-w-4xl mx-auto mt-6 px-4">
        <div className="printable-document-area bg-white shadow-lg rounded-xl border border-slate-200 p-8 sm:p-12 transition-all">
          
          {/* Header Block: Company Details & Document Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
            <div className="space-y-3 max-w-md">
              {comp.logoUrl ? (
                <img
                  src={comp.logoUrl}
                  alt={comp.name}
                  className="h-16 max-w-[220px] object-contain"
                />
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 bg-slate-900 text-white rounded-lg flex items-center justify-center font-extrabold text-xl tracking-tight">
                    {comp.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                      {comp.name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium">{comp.activity}</p>
                  </div>
                </div>
              )}

              <div className="text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">{comp.legalName}</p>
                <p className="font-mono text-slate-700">
                  <span className="font-bold">{comp.taxIdLabel || 'RUC'}:</span> <span className="font-semibold">{comp.taxId}</span>
                </p>
                <p className="flex items-center gap-1.5 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{comp.address}, {comp.city}, {comp.country}</span>
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-slate-500">
                  {comp.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {comp.phone}
                    </span>
                  )}
                  {comp.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {comp.email}
                    </span>
                  )}
                  {comp.website && (
                    <span className="font-medium text-slate-600">
                      {comp.website}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Document Folio & Key Dates Block */}
            <div className="sm:text-right w-full sm:w-auto">
              <div className="inline-block sm:text-right">
                <div className="text-2xl font-black text-slate-900 tracking-tight">
                  COTIZACIÓN
                </div>
                <div className="text-lg font-mono font-bold text-blue-700">
                  {quote.folio}
                </div>
              </div>

              <div className="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 space-y-1.5 sm:text-right inline-block min-w-[200px]">
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-slate-500">Fecha de Emisión:</span>
                  <span className="font-semibold tabular-nums">{quote.issueDate}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3">
                  <span className="text-slate-500">Válida Hasta:</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{quote.validUntil}</span>
                </div>
                <div className="flex justify-between sm:justify-end gap-3 border-t border-slate-200 pt-1">
                  <span className="text-slate-500">Moneda:</span>
                  <span className="font-bold">{currency.code} ({currency.symbol})</span>
                </div>
              </div>

              {/* Tax Inclusion Condition Badge */}
              <div className="mt-2 flex sm:justify-end">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                    quote.pricesIncludeTax
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-blue-50 text-blue-800 border-blue-300'
                  }`}
                >
                  <span>
                    {quote.pricesIncludeTax
                      ? `✓ Precios con ${taxName} (${comp.defaultTaxRate}%) Incluido`
                      : `+ Precios más ${taxName} (${comp.defaultTaxRate}%)`}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Client Recipient Details */}
          <div className="mt-6 bg-slate-50/70 border border-slate-200 rounded-xl p-5 print-avoid-break">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Cotizado para / Datos del Cliente
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {cli.name}
                </h3>
                {cli.taxId && (
                  <p className="text-slate-600 font-mono">
                    <span className="font-medium text-slate-500">{cli.taxIdLabel || comp.taxIdLabel || 'RUC'}:</span> {cli.taxId}
                  </p>
                )}
                {cli.contactPerson && (
                  <p className="text-slate-600 mt-1">
                    <span className="font-medium text-slate-500">Atención:</span> {cli.contactPerson}
                  </p>
                )}
              </div>
              <div className="space-y-1 text-slate-600 md:text-right">
                {cli.address && (
                  <p>
                    <span className="font-medium text-slate-500">Dirección:</span> {cli.address}{cli.city ? `, ${cli.city}` : ''}
                  </p>
                )}
                {cli.email && (
                  <p>
                    <span className="font-medium text-slate-500">Email:</span> {cli.email}
                  </p>
                )}
                {cli.phone && (
                  <p>
                    <span className="font-medium text-slate-500">Teléfono:</span> {cli.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mt-8 overflow-x-auto print-avoid-break">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${themeStyles.tableHeaderBg} border-b border-slate-300`}>
                  <th className="py-2.5 px-3 font-bold text-slate-700 w-10 text-center">#</th>
                  {hasAnyItemImage && (
                    <th className="py-2.5 px-2 font-bold text-slate-700 w-14 text-center">Foto</th>
                  )}
                  <th className="py-2.5 px-3 font-bold text-slate-700">Descripción del Producto / Servicio</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 text-center w-20">Unidad</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 text-right w-16">Cant.</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 text-right w-24">
                    P. Unitario {quote.pricesIncludeTax ? `(Inc. ${taxName})` : ''}
                  </th>
                  {quote.discountTotal > 0 && (
                    <th className="py-2.5 px-3 font-bold text-slate-700 text-right w-16">Desc.</th>
                  )}
                  <th className="py-2.5 px-3 font-bold text-slate-700 text-right w-28">
                    {quote.pricesIncludeTax ? `Total (Inc. ${taxName})` : 'Subtotal'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 text-center text-slate-400 font-mono tabular-nums">
                      {idx + 1}
                    </td>

                    {/* Optional Product Reference Image column */}
                    {hasAnyItemImage && (
                      <td className="py-2.5 px-2 text-center">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-11 h-11 object-cover rounded-md border border-slate-200 mx-auto"
                          />
                        ) : (
                          <div className="w-11 h-11 bg-slate-50 border border-slate-200 rounded-md flex items-center justify-center text-slate-300 mx-auto">
                            <ImageIcon className="w-4 h-4 opacity-40" />
                          </div>
                        )}
                      </td>
                    )}

                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 text-[13px]">{item.name}</div>
                      {item.code && (
                        <span className="text-[11px] font-mono text-slate-400 mr-2">
                          [{item.code}]
                        </span>
                      )}
                      {item.description && (
                        <p className="text-slate-600 text-xs mt-1 whitespace-pre-line leading-relaxed">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium">
                      {item.unit || 'Unid'}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-800 tabular-nums">
                      {item.quantity}
                    </td>
                    <td className="py-3 px-3 text-right text-slate-700 tabular-nums">
                      {formatCurrency(item.unitPrice, currency)}
                    </td>
                    {quote.discountTotal > 0 && (
                      <td className="py-3 px-3 text-right text-slate-500 tabular-nums">
                        {item.discountPercent > 0 ? `${item.discountPercent}%` : '-'}
                      </td>
                    )}
                    <td className="py-3 px-3 text-right font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(quote.pricesIncludeTax ? item.total : item.subtotal, currency)}
                      {quote.pricesIncludeTax && (
                        <span className="text-[10px] text-slate-400 block font-normal tabular-nums">
                          Base: {formatCurrency(item.subtotal, currency)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals & Financial Breakdown */}
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-slate-200 pt-6 print-avoid-break">
            {/* Amount in words & notes */}
            <div className="w-full sm:max-w-md space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700">
                <span className="font-bold text-slate-500 block mb-0.5">SON:</span>
                <span className="font-semibold text-slate-900 tracking-wide uppercase">
                  {numberToSpanishWords(quote.total)} {currency.code}
                </span>
              </div>

              {quote.notes && (
                <div className="text-xs text-slate-600">
                  <span className="font-bold text-slate-700 block mb-1">Notas u Observaciones:</span>
                  <p className="italic bg-amber-50/50 p-2.5 rounded border border-amber-200/60 text-slate-700">
                    {quote.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Calculations Card */}
            <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>{quote.pricesIncludeTax ? 'Total Bruto de Lista:' : 'Subtotal Bruto:'}</span>
                <span className="font-medium tabular-nums">{formatCurrency(quote.subtotalGross, currency)}</span>
              </div>
              {quote.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Descuento Comercial:</span>
                  <span className="font-medium tabular-nums">- {formatCurrency(quote.discountTotal, currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-700 font-medium border-t border-slate-200 pt-1.5">
                <span>Base Imponible (Subtotal Neto):</span>
                <span className="tabular-nums font-semibold">{formatCurrency(quote.subtotalNet, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>
                  {taxName} ({comp.defaultTaxRate}%){quote.pricesIncludeTax ? ' Incluido' : ''}:
                </span>
                <span className="font-medium tabular-nums">{formatCurrency(quote.taxTotal, currency)}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black border-t-2 border-slate-900 pt-2 text-slate-900">
                <span className="uppercase tracking-tight">TOTAL A PAGAR:</span>
                <span className="text-base font-extrabold tabular-nums text-blue-700">
                  {formatCurrency(quote.total, currency)}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 italic text-center">
                {quote.pricesIncludeTax
                  ? `* Los precios unitarios de esta propuesta ya incluyen el ${taxName} (${comp.defaultTaxRate}%).`
                  : `* Precios expresados en valores netos. Sujetos al ${taxName} (${comp.defaultTaxRate}%).`}
              </div>
            </div>
          </div>

          {/* Payment Methods (Exclusive Offer or Standard) */}
          {hasAnyPaymentChannel && (
            <div className="mt-8 border-t border-slate-200 pt-6 space-y-4 print-avoid-break">
              {isExclusive ? (
                <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-5 space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-amber-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                        <Star className="w-4 h-4 fill-white" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-amber-950 uppercase tracking-tight text-xs sm:text-sm flex items-center gap-2">
                          <span>Condición y Medios de Pago Exclusivos</span>
                        </h4>
                        <p className="text-xs text-amber-900 font-bold">
                          {exclusiveTitle || `Acuerdo Comercial Preferencial para ${cli.name}`}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-200 text-amber-900 border border-amber-300 shrink-0">
                      Exclusivo: {cli.name}
                    </span>
                  </div>

                  {exclusiveNote && (
                    <div className="bg-white/95 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 font-medium">
                      <span className="font-bold text-amber-900 block mb-0.5">Nota de Pago Acordada:</span>
                      {exclusiveNote}
                    </div>
                  )}

                  <div>
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-2.5">
                      Canales de pago autorizados para esta propuesta:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                      {/* Digital Wallets: Yape & Plin Block */}
                      {(showYape || showPlin) && (
                        <div className="bg-white rounded-xl p-4 border border-amber-200 space-y-3 shadow-2xs">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                            <span>Billeteras Móviles Digitales</span>
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* YAPE CARD */}
                            {showYape && (
                              <div className="bg-purple-50/40 border border-purple-200 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-bold text-[11px]">
                                    Yape
                                  </span>
                                  {comp.digitalWallets?.yape?.qrCodeUrl && (
                                    <span className="text-[10px] text-purple-700 font-medium">QR Escaneable</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Número:</span>
                                  <span className="font-mono font-bold text-sm text-slate-900">
                                    {comp.digitalWallets?.yape?.phone}
                                  </span>
                                </div>
                                {comp.digitalWallets?.yape?.holderName && (
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">Titular:</span>
                                    <span className="font-medium text-slate-700 truncate block">
                                      {comp.digitalWallets.yape.holderName}
                                    </span>
                                  </div>
                                )}
                                {comp.digitalWallets?.yape?.qrCodeUrl && (
                                  <div className="pt-1 text-center">
                                    <img
                                      src={comp.digitalWallets.yape.qrCodeUrl}
                                      alt="QR Yape"
                                      className="w-24 h-24 object-contain mx-auto border border-purple-100 rounded-md p-0.5 bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* PLIN CARD */}
                            {showPlin && (
                              <div className="bg-cyan-50/40 border border-cyan-200 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-bold text-[11px]">
                                    Plin
                                  </span>
                                  {comp.digitalWallets?.plin?.qrCodeUrl && (
                                    <span className="text-[10px] text-cyan-700 font-medium">QR Escaneable</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Número:</span>
                                  <span className="font-mono font-bold text-sm text-slate-900">
                                    {comp.digitalWallets?.plin?.phone}
                                  </span>
                                </div>
                                {comp.digitalWallets?.plin?.holderName && (
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">Titular:</span>
                                    <span className="font-medium text-slate-700 truncate block">
                                      {comp.digitalWallets.plin.holderName}
                                    </span>
                                  </div>
                                )}
                                {comp.digitalWallets?.plin?.qrCodeUrl && (
                                  <div className="pt-1 text-center">
                                    <img
                                      src={comp.digitalWallets.plin.qrCodeUrl}
                                      alt="QR Plin"
                                      className="w-24 h-24 object-contain mx-auto border border-cyan-100 rounded-md p-0.5 bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bank Transfer Details Block */}
                      {showBank && (
                        <div className="bg-white rounded-xl p-4 border border-amber-200 text-slate-700 space-y-1.5 shadow-2xs">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-2">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <span>Transferencia Bancaria</span>
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Banco:</span>
                            <span className="font-semibold text-slate-900">{comp.bankInfo.bankName || 'A convenir'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tipo de Cuenta:</span>
                            <span className="font-semibold text-slate-900">{comp.bankInfo.accountType || 'Corriente'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Número de Cuenta:</span>
                            <span className="font-mono font-bold text-slate-900">{comp.bankInfo.accountNumber || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Titular:</span>
                            <span className="font-medium text-slate-800 text-right">{comp.bankInfo.beneficiaryName || comp.legalName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{comp.taxIdLabel || 'RUC'}:</span>
                            <span className="font-mono font-medium text-slate-800">{comp.bankInfo.beneficiaryTaxId || comp.taxId}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1">
                            <span className="text-slate-500">Enviar comprobante a:</span>
                            <span className="font-medium text-blue-700">{comp.bankInfo.notifyEmail || comp.email}</span>
                          </div>
                        </div>
                      )}

                      {/* Cash Card */}
                      {showCash && (
                        <div className="bg-white rounded-xl p-4 border border-amber-200 text-slate-700 space-y-1.5 shadow-2xs">
                          <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-1">
                            <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Efectivo / Pago Contra Entrega</span>
                          </span>
                          <p className="text-slate-600">
                            Autorizado para pago en efectivo al momento de la entrega o recepción de conformidad.
                          </p>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Moneda: {currency.code} ({currency.symbol})
                          </div>
                        </div>
                      )}

                      {/* Card / POS */}
                      {showCard && (
                        <div className="bg-white rounded-xl p-4 border border-amber-200 text-slate-700 space-y-1.5 shadow-2xs">
                          <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-1">
                            <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Tarjeta Débito / Crédito / Link Web</span>
                          </span>
                          <p className="text-slate-600">
                            Aceptación de tarjetas de crédito o débito mediante terminal POS móvil o link de pago seguro.
                          </p>
                        </div>
                      )}

                      {/* Credit Agreement */}
                      {showCredit && (
                        <div className="bg-white rounded-xl p-4 border border-amber-200 text-slate-700 space-y-1.5 shadow-2xs">
                          <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-1">
                            <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                            <span>Crédito Comercial Directo Autorizado</span>
                          </span>
                          <p className="text-slate-600">
                            Condición de crédito directo aprobada para {cli.name}.
                          </p>
                          {quote.paymentTerms && (
                            <div className="text-[11px] text-amber-900 font-bold bg-amber-50 p-2 rounded border border-amber-200">
                              Plazo: {quote.paymentTerms}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Modalidades y Medios de Pago Habilitados para {cli.name}</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Digital Wallets: Yape & Plin Block */}
                    {(showYape || showPlin) && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1">
                            <Smartphone className="w-3.5 h-3.5 text-purple-600" />
                            <span>Billeteras Móviles Digitales</span>
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* YAPE CARD */}
                            {showYape && (
                              <div className="bg-white border border-purple-200 rounded-lg p-3 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-bold text-[11px]">
                                    Yape
                                  </span>
                                  {comp.digitalWallets?.yape?.qrCodeUrl && (
                                    <span className="text-[10px] text-purple-700 font-medium">QR Escaneable</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Número:</span>
                                  <span className="font-mono font-bold text-sm text-slate-900">
                                    {comp.digitalWallets?.yape?.phone}
                                  </span>
                                </div>
                                {comp.digitalWallets?.yape?.holderName && (
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">Titular:</span>
                                    <span className="font-medium text-slate-700 truncate block">
                                      {comp.digitalWallets.yape.holderName}
                                    </span>
                                  </div>
                                )}
                                {comp.digitalWallets?.yape?.qrCodeUrl && (
                                  <div className="pt-1 text-center">
                                    <img
                                      src={comp.digitalWallets.yape.qrCodeUrl}
                                      alt="QR Yape"
                                      className="w-24 h-24 object-contain mx-auto border border-purple-100 rounded-md p-0.5 bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            {/* PLIN CARD */}
                            {showPlin && (
                              <div className="bg-white border border-cyan-200 rounded-lg p-3 space-y-2 shadow-2xs">
                                <div className="flex items-center justify-between">
                                  <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-bold text-[11px]">
                                    Plin
                                  </span>
                                  {comp.digitalWallets?.plin?.qrCodeUrl && (
                                    <span className="text-[10px] text-cyan-700 font-medium">QR Escaneable</span>
                                  )}
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Número:</span>
                                  <span className="font-mono font-bold text-sm text-slate-900">
                                    {comp.digitalWallets?.plin?.phone}
                                  </span>
                                </div>
                                {comp.digitalWallets?.plin?.holderName && (
                                  <div>
                                    <span className="text-slate-400 text-[10px] block">Titular:</span>
                                    <span className="font-medium text-slate-700 truncate block">
                                      {comp.digitalWallets.plin.holderName}
                                    </span>
                                  </div>
                                )}
                                {comp.digitalWallets?.plin?.qrCodeUrl && (
                                  <div className="pt-1 text-center">
                                    <img
                                      src={comp.digitalWallets.plin.qrCodeUrl}
                                      alt="QR Plin"
                                      className="w-24 h-24 object-contain mx-auto border border-cyan-100 rounded-md p-0.5 bg-white"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Details Block */}
                    {showBank && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-700 space-y-1.5">
                          <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-2">
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                            <span>Transferencia Bancaria</span>
                          </span>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Banco:</span>
                            <span className="font-semibold text-slate-900">{comp.bankInfo.bankName || 'A convenir'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tipo de Cuenta:</span>
                            <span className="font-semibold text-slate-900">{comp.bankInfo.accountType || 'Corriente'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Número de Cuenta:</span>
                            <span className="font-mono font-bold text-slate-900">{comp.bankInfo.accountNumber || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Titular:</span>
                            <span className="font-medium text-slate-800 text-right">{comp.bankInfo.beneficiaryName || comp.legalName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">{comp.taxIdLabel || 'RUC'}:</span>
                            <span className="font-mono font-medium text-slate-800">{comp.bankInfo.beneficiaryTaxId || comp.taxId}</span>
                          </div>
                          <div className="flex justify-between border-t border-slate-200 pt-1">
                            <span className="text-slate-500">Enviar comprobante a:</span>
                            <span className="font-medium text-blue-700">{comp.bankInfo.notifyEmail || comp.email}</span>
                          </div>
                          {comp.bankInfo.notes && (
                            <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-200">
                              * {comp.bankInfo.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cash Card */}
                    {showCash && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-700 space-y-1.5">
                        <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-1">
                          <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Efectivo / Pago Contra Entrega</span>
                        </span>
                        <p className="text-slate-600">
                          Habilitado para cancelación en efectivo al momento de la entrega o conformidad.
                        </p>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Moneda: {currency.code} ({currency.symbol})
                        </div>
                      </div>
                    )}

                    {/* Card / POS */}
                    {showCard && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-700 space-y-1.5">
                        <span className="font-bold text-indigo-900 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-1">
                          <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Tarjeta Débito / Crédito / Link Web</span>
                        </span>
                        <p className="text-slate-600">
                          Aceptación de tarjetas bancarias mediante terminal de cobro POS o enlace seguro de pago.
                        </p>
                      </div>
                    )}

                    {/* Credit Agreement */}
                    {showCredit && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-slate-700 space-y-1.5">
                        <span className="font-bold text-amber-900 text-[11px] uppercase tracking-wider flex items-center gap-1 mb-1">
                          <FileCheck className="w-3.5 h-3.5 text-amber-600" />
                          <span>Crédito Comercial Directo Acordado</span>
                        </span>
                        <p className="text-slate-600">
                          Línea de crédito comercial autorizada para este cliente.
                        </p>
                        {quote.paymentTerms && (
                          <div className="text-[11px] text-amber-900 font-semibold bg-amber-50 p-2 rounded border border-amber-200">
                            Condición: {quote.paymentTerms}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Specific Terms & Commercial Conditions */}
          <div className="mt-8 border-t border-slate-200 pt-6 text-xs print-avoid-break space-y-3">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span>Condiciones Comerciales y Términos</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-slate-700 space-y-2">
                {quote.paymentTerms && (
                  <div>
                    <span className="font-semibold text-slate-900 block">Forma de Pago:</span>
                    <span>{quote.paymentTerms}</span>
                  </div>
                )}
                {quote.deliveryTime && (
                  <div>
                    <span className="font-semibold text-slate-900 block">Plazo de Entrega / Ejecución:</span>
                    <span>{quote.deliveryTime}</span>
                  </div>
                )}
                {quote.validUntil && (
                  <div>
                    <span className="font-semibold text-slate-900 block">Validez de la Oferta:</span>
                    <span>Vigente hasta el {quote.validUntil} ({quote.validityDays || 15} días).</span>
                  </div>
                )}
              </div>

              {quote.termsAndConditions && (
                <div className="text-slate-600 leading-relaxed text-[11px] bg-white p-3 rounded-lg border border-slate-200 whitespace-pre-line">
                  <span className="font-bold text-slate-800 block mb-1">Cláusulas Específicas:</span>
                  {quote.termsAndConditions}
                </div>
              )}
            </div>
          </div>

          {/* Signatures and Acceptance Block */}
          <div className="mt-12 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-8 print-avoid-break">
            {/* Issuer Signature */}
            <div className="text-center sm:text-left flex flex-col items-center sm:items-start">
              <div className="w-56 border-b border-slate-400 pb-2 mb-2 min-h-[48px] flex items-end justify-center sm:justify-start">
                {comp.signatorySignatureUrl ? (
                  <img
                    src={comp.signatorySignatureUrl}
                    alt="Firma Emisor"
                    className="max-h-12 object-contain"
                  />
                ) : (
                  <span className="font-serif italic text-slate-400 text-sm">Firma Autorizada</span>
                )}
              </div>
              <p className="font-bold text-xs text-slate-900">{comp.signatoryName || comp.name}</p>
              <p className="text-[11px] text-slate-500">{comp.signatoryTitle || 'Representante Legal'}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{comp.legalName}</p>
            </div>

            {/* Client Acceptance */}
            <div className="text-center sm:text-right flex flex-col items-center sm:items-end">
              <div className="w-56 border-b border-slate-400 pb-2 mb-2 min-h-[48px] flex items-end justify-center sm:justify-end">
                <span className="font-serif italic text-slate-300 text-xs">Firma Aceptación y Timbre</span>
              </div>
              <p className="font-bold text-xs text-slate-900">{cli.contactPerson || cli.name}</p>
              <p className="text-[11px] text-slate-500">Aceptación Conforme del Cliente</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Fecha: ____ / ____ / ________</p>
            </div>
          </div>

          {/* Footer watermark/note */}
          <div className="mt-10 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 flex justify-between items-center print-avoid-break">
            <span>Documento emitido con CotizaPro · Validez legal según términos estipulados</span>
            <span className="font-mono">{quote.folio} · Página 1 de 1</span>
          </div>

        </div>
      </div>
    </div>
  );
};
