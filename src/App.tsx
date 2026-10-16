import React, { useState, useEffect } from 'react';
import {
  Quote,
  Client,
  Product,
  CompanyProfile,
  TermsTemplate,
  QuoteStatus,
} from './types';
import {
  getCompanyProfile,
  saveCompanyProfile,
  getClients,
  saveClients,
  upsertClient,
  deleteClient as removeClient,
  getProducts,
  saveProducts,
  upsertProduct,
  deleteProduct as removeProduct,
  getQuotes,
  saveQuotes,
  upsertQuote,
  deleteQuote as removeQuote,
  getTermsTemplates,
  saveTermsTemplates,
  getNextFolio,
} from './utils/storage';
import { DashboardView } from './components/DashboardView';
import { QuotesListView } from './components/QuotesListView';
import { QuoteBuilderView } from './components/QuoteBuilderView';
import { QuoteDocumentPreview } from './components/QuoteDocumentPreview';
import { ClientsView } from './components/ClientsView';
import { ProductsView } from './components/ProductsView';
import { CompanySettingsView } from './components/CompanySettingsView';
import {
  FileText,
  Plus,
  Building2,
  Users,
  Package,
  Layers,
  Settings,
  Menu,
  X,
} from 'lucide-react';

type ActiveView =
  | 'dashboard'
  | 'quotes'
  | 'builder'
  | 'preview'
  | 'clients'
  | 'products'
  | 'company-settings';

export default function App() {
  const [company, setCompany] = useState<CompanyProfile>(getCompanyProfile);
  const [clients, setClients] = useState<Client[]>(getClients);
  const [products, setProducts] = useState<Product[]>(getProducts);
  const [quotes, setQuotes] = useState<Quote[]>(getQuotes);
  const [termsTemplates, setTermsTemplates] = useState<TermsTemplate[]>(getTermsTemplates);

  const [currentView, setCurrentView] = useState<ActiveView>('dashboard');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);

  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Handlers for Quote Lifecycle
  const handleStartCreateQuote = () => {
    setEditingQuote(null);
    setCurrentView('builder');
    setMobileMenuOpen(false);
  };

  const handleStartCreateQuoteForClient = (client: Client) => {
    const today = new Date().toISOString().split('T')[0];
    const { folio } = getNextFolio();
    const tempQuote: Quote = {
      id: '',
      folio,
      issueDate: today,
      validUntil: today,
      clientId: client.id,
      clientSnapshot: client,
      companySnapshot: company,
      items: [],
      currency: company.currency,
      subtotalGross: 0,
      discountTotal: 0,
      subtotalNet: 0,
      taxTotal: 0,
      total: 0,
      status: 'borrador',
      paymentTerms: company.defaultPaymentTerms,
      deliveryTime: company.defaultDeliveryTime,
      validityDays: company.defaultValidityDays || 15,
      termsAndConditions: company.defaultTerms,
      notes: company.defaultNotes,
      templateTheme: 'corporate',
      pricesIncludeTax: company.defaultPricesIncludeTax ?? false,
      taxName: company.taxName || 'IGV',
      showProductImages: true,
      paymentMethodsConfig: {
        showBankTransfer: true,
        showYape: company.digitalWallets?.yape?.enabled ?? true,
        showPlin: company.digitalWallets?.plin?.enabled ?? true,
        showCustomWallets: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingQuote(tempQuote);
    setCurrentView('builder');
    setMobileMenuOpen(false);
  };

  const handleEditQuote = (quote: Quote) => {
    setEditingQuote(quote);
    setCurrentView('builder');
  };

  const handleViewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setCurrentView('preview');
  };

  const handleSaveQuote = (quote: Quote, viewImmediately = false) => {
    const updated = upsertQuote(quote);
    setQuotes(updated);
    setCompany(getCompanyProfile()); // in case next folio incremented
    if (viewImmediately) {
      setSelectedQuote(quote);
      setCurrentView('preview');
    } else {
      setCurrentView('quotes');
    }
  };

  const handleDuplicateQuote = (original: Quote) => {
    const { folio } = getNextFolio();
    const today = new Date().toISOString().split('T')[0];
    const duplicated: Quote = {
      ...original,
      id: 'quote-' + Date.now(),
      folio,
      issueDate: today,
      status: 'borrador',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = upsertQuote(duplicated);
    setQuotes(updated);
    setSelectedQuote(duplicated);
    setCurrentView('preview');
  };

  const handleDeleteQuote = (id: string) => {
    const updated = removeQuote(id);
    setQuotes(updated);
    if (selectedQuote?.id === id) {
      setSelectedQuote(null);
      setCurrentView('quotes');
    }
  };

  const handleUpdateQuoteStatus = (id: string, newStatus: QuoteStatus) => {
    const target = quotes.find((q) => q.id === id);
    if (!target) return;
    const updatedRecord: Quote = {
      ...target,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    const updatedList = upsertQuote(updatedRecord);
    setQuotes(updatedList);
    if (selectedQuote?.id === id) {
      setSelectedQuote(updatedRecord);
    }
  };

  // Handlers for Clients
  const handleSaveClient = (client: Client) => {
    const updated = upsertClient(client);
    setClients(updated);
  };

  const handleDeleteClient = (id: string) => {
    const updated = removeClient(id);
    setClients(updated);
  };

  // Handlers for Products
  const handleSaveProduct = (product: Product) => {
    const updated = upsertProduct(product);
    setProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = removeProduct(id);
    setProducts(updated);
  };

  // Handlers for Company
  const handleSaveCompany = (updated: CompanyProfile) => {
    saveCompanyProfile(updated);
    setCompany(updated);
  };

  const handleSaveTermsTemplates = (tpls: TermsTemplate[]) => {
    saveTermsTemplates(tpls);
    setTermsTemplates(tpls);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Universal Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (4-5 Nav Links) - Zone 3 (1 Primary Action) */}
      <header className="no-print sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setMobileMenuOpen(false);
              }}
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 hover:opacity-90 cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                C
              </div>
              <span>CotizaPro</span>
            </button>
            <span className="hidden lg:inline text-xs text-slate-400 font-medium border-l border-slate-200 pl-3 truncate max-w-[200px]">
              {company.name}
            </span>
          </div>

          {/* Zone 2: 4-5 Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
                currentView === 'dashboard'
                  ? 'text-blue-700 border-b-2 border-blue-600 font-bold'
                  : 'text-slate-600'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => setCurrentView('quotes')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
                currentView === 'quotes' || currentView === 'builder' || currentView === 'preview'
                  ? 'text-blue-700 border-b-2 border-blue-600 font-bold'
                  : 'text-slate-600'
              }`}
            >
              Cotizaciones
            </button>
            <button
              onClick={() => setCurrentView('clients')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
                currentView === 'clients'
                  ? 'text-blue-700 border-b-2 border-blue-600 font-bold'
                  : 'text-slate-600'
              }`}
            >
              Clientes
            </button>
            <button
              onClick={() => setCurrentView('products')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
                currentView === 'products'
                  ? 'text-blue-700 border-b-2 border-blue-600 font-bold'
                  : 'text-slate-600'
              }`}
            >
              Catálogo
            </button>
            <button
              onClick={() => setCurrentView('company-settings')}
              className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 pb-1 cursor-pointer ${
                currentView === 'company-settings'
                  ? 'text-blue-700 border-b-2 border-blue-600 font-bold'
                  : 'text-slate-600'
              }`}
            >
              Empresa & Términos
            </button>
          </nav>

          {/* Zone 3: 1 Primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleStartCreateQuote}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Cotización</span>
            </button>

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-2 text-xs font-semibold text-slate-700">
            <button
              onClick={() => {
                setCurrentView('dashboard');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 block"
            >
              Resumen
            </button>
            <button
              onClick={() => {
                setCurrentView('quotes');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 block"
            >
              Cotizaciones
            </button>
            <button
              onClick={() => {
                setCurrentView('clients');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 block"
            >
              Clientes
            </button>
            <button
              onClick={() => {
                setCurrentView('products');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 block"
            >
              Catálogo de Productos
            </button>
            <button
              onClick={() => {
                setCurrentView('company-settings');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 block"
            >
              Configuración de Empresa
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentView === 'dashboard' && (
          <DashboardView
            quotes={quotes}
            clients={clients}
            products={products}
            company={company}
            onCreateQuote={handleStartCreateQuote}
            onViewQuote={handleViewQuote}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}

        {currentView === 'quotes' && (
          <QuotesListView
            quotes={quotes}
            company={company}
            onCreateNew={handleStartCreateQuote}
            onViewQuote={handleViewQuote}
            onEditQuote={handleEditQuote}
            onDuplicateQuote={handleDuplicateQuote}
            onDeleteQuote={handleDeleteQuote}
            onUpdateStatus={handleUpdateQuoteStatus}
          />
        )}

        {currentView === 'builder' && (
          <QuoteBuilderView
            initialQuote={editingQuote}
            company={company}
            clients={clients}
            products={products}
            termsTemplates={termsTemplates}
            onSave={handleSaveQuote}
            onCancel={() => setCurrentView('quotes')}
            onQuickCreateClient={handleSaveClient}
          />
        )}

        {currentView === 'preview' && selectedQuote && (
          <QuoteDocumentPreview
            quote={selectedQuote}
            onBack={() => setCurrentView('quotes')}
            onEdit={handleEditQuote}
            onUpdateStatus={(newStatus) =>
              handleUpdateQuoteStatus(selectedQuote.id, newStatus)
            }
          />
        )}

        {currentView === 'clients' && (
          <ClientsView
            clients={clients}
            quotes={quotes}
            company={company}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onCreateQuoteForClient={handleStartCreateQuoteForClient}
          />
        )}

        {currentView === 'products' && (
          <ProductsView
            products={products}
            company={company}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {currentView === 'company-settings' && (
          <CompanySettingsView
            company={company}
            termsTemplates={termsTemplates}
            onSaveCompany={handleSaveCompany}
            onSaveTermsTemplates={handleSaveTermsTemplates}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print bg-white border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>
            CotizaPro · Sistema de Generación y Gestión de Cotizaciones Multirubro
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            {company.legalName} · {company.taxIdLabel || 'RUC'}: {company.taxId}
          </span>
        </div>
      </footer>
    </div>
  );
}
