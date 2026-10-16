import React, { useState } from 'react';
import { Quote, QuoteStatus, CompanyProfile } from '../types';
import { formatCurrency } from '../utils/storage';
import {
  Search,
  Plus,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Share2,
  Calendar,
  Building,
  CheckCircle,
  Clock,
  Send,
  XCircle,
  FileText,
  Filter,
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  company: CompanyProfile;
  onCreateNew: () => void;
  onViewQuote: (quote: Quote) => void;
  onEditQuote: (quote: Quote) => void;
  onDuplicateQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onUpdateStatus: (id: string, status: QuoteStatus) => void;
}

export const QuotesListView: React.FC<Props> = ({
  quotes,
  company,
  onCreateNew,
  onViewQuote,
  onEditQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onUpdateStatus,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.folio.toLowerCase().includes(search.toLowerCase()) ||
      q.clientSnapshot?.name.toLowerCase().includes(search.toLowerCase()) ||
      q.items.some((it) => it.name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statusConfigs: Record<
    QuoteStatus,
    { label: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    borrador: {
      label: 'Borrador',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: <Clock className="w-3 h-3 text-amber-600" />,
    },
    enviada: {
      label: 'Enviada',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      icon: <Send className="w-3 h-3 text-blue-600" />,
    },
    aprobada: {
      label: 'Aprobada',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      icon: <CheckCircle className="w-3 h-3 text-emerald-600" />,
    },
    rechazada: {
      label: 'Rechazada',
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-800',
      icon: <XCircle className="w-3 h-3 text-rose-600" />,
    },
    vencida: {
      label: 'Vencida',
      bg: 'bg-slate-100 border-slate-200',
      text: 'text-slate-700',
      icon: <Clock className="w-3 h-3 text-slate-500" />,
    },
    facturada: {
      label: 'Facturada',
      bg: 'bg-purple-50 border-purple-200',
      text: 'text-purple-800',
      icon: <CheckCircle className="w-3 h-3 text-purple-600" />,
    },
  };

  const handleShareWhatsApp = (q: Quote) => {
    const message = encodeURIComponent(
      `Hola ${q.clientSnapshot?.name}, le compartimos la cotización ${q.folio} por un monto de ${formatCurrency(
        q.total,
        q.currency
      )}. Vigente hasta el ${q.validUntil}. ¡Quedamos atentos a cualquier consulta!`
    );
    const phone = q.clientSnapshot?.phone?.replace(/[^0-9]/g, '') || '';
    const url = phone ? `https://wa.me/${phone}?text=${message}` : `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  // Status counts for segment filter
  const counts = {
    all: quotes.length,
    borrador: quotes.filter((q) => q.status === 'borrador').length,
    enviada: quotes.filter((q) => q.status === 'enviada').length,
    aprobada: quotes.filter((q) => q.status === 'aprobada').length,
    facturada: quotes.filter((q) => q.status === 'facturada').length,
    vencida: quotes.filter((q) => q.status === 'vencida').length,
    rechazada: quotes.filter((q) => q.status === 'rechazada').length,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Action */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Administración de Cotizaciones
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestione el historial comercial, controle estados de negociación y exporte documentos para impresión o PDF.
          </p>
        </div>

        <button
          onClick={onCreateNew}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Cotización</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        {/* Segmented status buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Todas', count: counts.all },
            { id: 'borrador', label: 'Borradores', count: counts.borrador },
            { id: 'enviada', label: 'Enviadas', count: counts.enviada },
            { id: 'aprobada', label: 'Aprobadas', count: counts.aprobada },
            { id: 'facturada', label: 'Facturadas', count: counts.facturada },
            { id: 'vencida', label: 'Vencidas', count: counts.vencida },
            { id: 'rechazada', label: 'Rechazadas', count: counts.rechazada },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por folio (ej. COT-2026-101), nombre de cliente o descripción de ítem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Quotations Table */}
      {filteredQuotes.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            {search || statusFilter !== 'all'
              ? 'No se encontraron cotizaciones con los filtros aplicados'
              : 'Aún no tiene cotizaciones generadas'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {search || statusFilter !== 'all'
              ? 'Intente buscar con otros términos o restablezca el filtro de estado.'
              : 'Comience creando su primera cotización para un cliente y personalice los términos comerciales.'}
          </p>
          <div className="pt-2">
            <button
              onClick={onCreateNew}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Nueva Cotización</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">Folio / Número</th>
                  <th className="py-3 px-4">Cliente / Receptor</th>
                  <th className="py-3 px-4">Fechas</th>
                  <th className="py-3 px-4 text-center">Ítems</th>
                  <th className="py-3 px-4 text-right">Monto Total</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotes.map((q) => {
                  const statusCfg = statusConfigs[q.status] || statusConfigs.borrador;
                  return (
                    <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Folio */}
                      <td className="py-3 px-4">
                        <button
                          onClick={() => onViewQuote(q)}
                          className="font-mono font-bold text-blue-700 hover:text-blue-900 text-[13px] hover:underline cursor-pointer"
                        >
                          {q.folio}
                        </button>
                        <div className="text-[11px] text-slate-400">
                          {q.clientSnapshot?.taxId ? `${company.taxIdLabel || 'RUC'}: ${q.clientSnapshot.taxId}` : 'Sin ID'}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {q.clientSnapshot?.name || 'Cliente sin nombre'}
                        </div>
                        {q.clientSnapshot?.contactPerson && (
                          <div className="text-[11px] text-slate-500 truncate">
                            Atn: {q.clientSnapshot.contactPerson}
                          </div>
                        )}
                      </td>

                      {/* Dates */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-medium tabular-nums">
                          Emisión: {q.issueDate}
                        </div>
                        <div className="text-[11px] text-slate-500 tabular-nums">
                          Válida hasta: {q.validUntil}
                        </div>
                      </td>

                      {/* Items Count */}
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-semibold text-slate-700">
                          {q.items.length}
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          {q.items.length === 1 ? 'concepto' : 'conceptos'}
                        </span>
                      </td>

                      {/* Total */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900 tabular-nums text-sm">
                          {formatCurrency(q.total, q.currency)}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums flex items-center justify-end gap-1.5 mt-0.5">
                          <span>Neto: {formatCurrency(q.subtotalNet, q.currency)}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              q.pricesIncludeTax
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                            title={q.pricesIncludeTax ? 'Precios con impuesto incluido' : 'Precios más impuesto'}
                          >
                            {q.pricesIncludeTax ? 'Inc. Imp.' : '+ Imp.'}
                          </span>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3 px-4 text-center">
                        <div className="inline-block relative">
                          <select
                            value={q.status}
                            onChange={(e) =>
                              onUpdateStatus(q.id, e.target.value as QuoteStatus)
                            }
                            className={`text-[11px] font-semibold border rounded-md px-2 py-1 pr-6 cursor-pointer focus:outline-hidden ${statusCfg.bg} ${statusCfg.text}`}
                          >
                            <option value="borrador">Borrador</option>
                            <option value="enviada">Enviada</option>
                            <option value="aprobada">Aprobada</option>
                            <option value="facturada">Facturada</option>
                            <option value="vencida">Vencida</option>
                            <option value="rechazada">Rechazada</option>
                          </select>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewQuote(q)}
                            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Ver documento para impresión o PDF"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onEditQuote(q)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Editar cotización"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleShareWhatsApp(q)}
                            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                            title="Enviar por WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onDuplicateQuote(q)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="Duplicar cotización"
                          >
                            <Copy className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `¿Está seguro de eliminar permanentemente la cotización ${q.folio}?`
                                )
                              ) {
                                onDeleteQuote(q.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="Eliminar cotización"
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
