import React from 'react';
import { Quote, Client, Product, CompanyProfile } from '../types';
import { formatCurrency } from '../utils/storage';
import { formatDateShort } from '../utils/dateUtils';
import {
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Plus,
  Users,
  Package,
  Building2,
  ArrowRight,
  Eye,
  Send,
  Sparkles,
} from 'lucide-react';

interface Props {
  quotes: Quote[];
  clients: Client[];
  products: Product[];
  company: CompanyProfile;
  onCreateQuote: () => void;
  onViewQuote: (quote: Quote) => void;
  onNavigate: (view: 'quotes' | 'clients' | 'products' | 'company-settings') => void;
}

export const DashboardView: React.FC<Props> = ({
  quotes,
  clients,
  products,
  company,
  onCreateQuote,
  onViewQuote,
  onNavigate,
}) => {
  // Aggregate Metrics
  const totalQuoted = quotes.reduce((acc, q) => acc + q.total, 0);

  const approvedQuotes = quotes.filter(
    (q) => q.status === 'aprobada' || q.status === 'facturada'
  );
  const totalApproved = approvedQuotes.reduce((acc, q) => acc + q.total, 0);

  const pendingQuotes = quotes.filter(
    (q) => q.status === 'enviada' || q.status === 'borrador'
  );
  const totalPending = pendingQuotes.reduce((acc, q) => acc + q.total, 0);

  const conversionRate =
    quotes.length > 0
      ? Math.round((approvedQuotes.length / quotes.length) * 100)
      : 0;

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome & Company Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          {company.logoUrl ? (
            <img
              src={company.logoUrl}
              alt={company.name}
              className="w-12 h-12 object-contain rounded-lg border border-slate-100 p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
              {company.name.substring(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <span className="text-xs text-slate-500 font-mono">
                {company.taxId ? `(${company.taxIdLabel || 'RUC'}: ${company.taxId})` : ''}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {company.activity || 'Sistema de Emisión de Cotizaciones y Presupuestos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onNavigate('company-settings')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Configurar Empresa
          </button>
          <button
            onClick={onCreateQuote}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cotización</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Quoted */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Cotizado
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {formatCurrency(totalQuoted, company.currency)}
          </div>
          <p className="text-xs text-slate-500">
            En {quotes.length} documentos emitidos
          </p>
        </div>

        {/* Approved Quoted */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Cotizaciones Aprobadas
            </span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700 tabular-nums">
            {formatCurrency(totalApproved, company.currency)}
          </div>
          <p className="text-xs text-emerald-600 font-medium">
            Tasa de cierre: {conversionRate}% ({approvedQuotes.length} ganadas)
          </p>
        </div>

        {/* Pending Quotes */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              En Negociación / Enviadas
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800 tabular-nums">
            {formatCurrency(totalPending, company.currency)}
          </div>
          <p className="text-xs text-slate-500">
            {pendingQuotes.length} pendientes de respuesta
          </p>
        </div>

        {/* Clients and Catalog */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Base de Datos
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tabular-nums">
            {clients.length} <span className="text-sm font-normal text-slate-500">clientes</span>
          </div>
          <p className="text-xs text-slate-500">
            y {products.length} productos / servicios en catálogo
          </p>
        </div>
      </div>

      {/* Main Split: Recent Quotes & Quick Access Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Quotes Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Últimas Cotizaciones Generadas
            </h2>
            <button
              onClick={() => onNavigate('quotes')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentQuotes.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No hay cotizaciones recientes para mostrar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="pb-2">Folio</th>
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Fecha</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2 text-center">Estado</th>
                    <th className="pb-2 text-right">Ver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentQuotes.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 font-mono font-bold text-blue-700">
                        {q.folio}
                      </td>
                      <td className="py-2.5 font-medium text-slate-800 max-w-[180px] truncate">
                        {q.clientSnapshot?.name || 'Cliente'}
                      </td>
                      <td className="py-2.5 text-slate-500 tabular-nums">
                        {formatDateShort(q.issueDate)}
                      </td>
                      <td className="py-2.5 text-right font-bold text-slate-900 tabular-nums">
                        <div>{formatCurrency(q.total, q.currency)}</div>
                        <span className={`text-[10px] font-semibold px-1 py-0.2 rounded ${
                          q.pricesIncludeTax ? 'text-emerald-700 bg-emerald-50' : 'text-blue-700 bg-blue-50'
                        }`}>
                          {q.pricesIncludeTax ? 'Inc. Imp.' : '+ Imp.'}
                        </span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-[11px] font-semibold capitalize px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {q.status}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => onViewQuote(q)}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="Ver documento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Operations & Fast Guides (1 Col) */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              Accesos Rápidos
            </h3>
            
            <div className="space-y-2 text-xs">
              <button
                onClick={onCreateQuote}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 font-semibold border border-blue-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Crear Cotización para Cliente</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
              </button>

              <button
                onClick={() => onNavigate('clients')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium border border-slate-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Gestionar Cartera de Clientes</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{clients.length}</span>
              </button>

              <button
                onClick={() => onNavigate('products')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium border border-slate-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Catálogo de Productos y Servicios</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">{products.length}</span>
              </button>

              <button
                onClick={() => onNavigate('company-settings')}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 font-medium border border-slate-200 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Razón Social, Logo & Términos</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Multirubro Information Card */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-xs space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>Adaptable a Cualquier Rubro</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              CotizaPro permite personalizar la razón social, logo, términos legales, moneda y formato de pago tanto de manera global como individual en cada cotización generada.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
