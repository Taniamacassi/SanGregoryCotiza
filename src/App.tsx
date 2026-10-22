import React, { useState, useEffect } from 'react';
import {
  Quote,
  Client,
  Product,
  CompanyProfile,
  TermsTemplate,
  QuoteStatus,
  GoogleSheetsConfig,
  RucAuthSession,
  SecurityConfig,
} from './types';
import {
  getCompanyProfile,
  saveCompanyProfile,
  getClients,
  saveClients,
  upsertClient,
  deleteClient as removeClient,
  deleteMultipleClients,
  clearClients,
  getProducts,
  saveProducts,
  upsertProduct,
  deleteProduct as removeProduct,
  deleteMultipleProducts,
  clearProducts,
  getQuotes,
  saveQuotes,
  upsertQuote,
  deleteQuote as removeQuote,
  deleteMultipleQuotes,
  clearQuotes,
  getTermsTemplates,
  saveTermsTemplates,
  clearAllCleanSlate,
  resetToDemoData,
  getNextFolio,
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  getAuthSession,
  saveAuthSession,
  clearAuthSession,
  getSecurityConfig,
  saveSecurityConfig,
} from './utils/storage';
import { getAccessToken, googleSignIn } from './utils/googleAuth';
import { saveQuoteToSpreadsheet } from './utils/googleSheetsService';
import { DashboardView } from './components/DashboardView';
import { QuotesListView } from './components/QuotesListView';
import { QuoteBuilderView } from './components/QuoteBuilderView';
import { QuoteDocumentPreview } from './components/QuoteDocumentPreview';
import { ClientsView } from './components/ClientsView';
import { ProductsView } from './components/ProductsView';
import { CompanySettingsView } from './components/CompanySettingsView';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { RucLoginView } from './components/RucLoginView';
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
  FileSpreadsheet,
  CheckCircle2,
  ShieldCheck,
  LogOut,
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

  // Google Sheets state & notification toast
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(getGoogleSheetsConfig);
  const [googleSheetsModalOpen, setGoogleSheetsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Security & RUC Auth State
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(getSecurityConfig);
  const [authSession, setAuthSession] = useState<RucAuthSession | null>(getAuthSession);

  const handleLoginSuccess = (session: RucAuthSession) => {
    saveAuthSession(session);
    setAuthSession(session);
    showToast(`¡Bienvenido! Sesión iniciada para ${session.businessName} (RUC: ${session.ruc})`);
  };

  const handleLogout = () => {
    clearAuthSession();
    setAuthSession(null);
    showToast('Sesión cerrada y pantalla bloqueada correctamente.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

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

    // Auto-sync in background if Google Sheets is connected
    const currentSheetsConfig = getGoogleSheetsConfig();
    if (currentSheetsConfig?.spreadsheetId && currentSheetsConfig.autoSyncOnSave !== false) {
      getAccessToken()
        .then((token) => {
          if (token) {
            saveQuoteToSpreadsheet(currentSheetsConfig.spreadsheetId, quote, token)
              .then(() => {
                const refreshed: GoogleSheetsConfig = {
                  ...currentSheetsConfig,
                  lastSyncedAt: new Date().toISOString(),
                };
                saveGoogleSheetsConfig(refreshed);
                setSheetsConfig(refreshed);
                showToast(`Cotización ${quote.folio} guardada en Google Sheets`);
              })
              .catch((err) => console.warn('Background auto-sync failed:', err));
          }
        })
        .catch((e) => console.warn('Token check error:', e));
    }
  };

  const handleSyncQuoteToSheets = async (quote: Quote) => {
    const currentSheetsConfig = getGoogleSheetsConfig();
    if (!currentSheetsConfig?.spreadsheetId) {
      setGoogleSheetsModalOpen(true);
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      const loginRes = await googleSignIn();
      token = loginRes?.accessToken || null;
    }
    if (!token) {
      setGoogleSheetsModalOpen(true);
      return;
    }

    try {
      await saveQuoteToSpreadsheet(currentSheetsConfig.spreadsheetId, quote, token);
      const refreshed: GoogleSheetsConfig = {
        ...currentSheetsConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      saveGoogleSheetsConfig(refreshed);
      setSheetsConfig(refreshed);
      showToast(`¡Cotización ${quote.folio} guardada en Google Sheets con éxito!`);
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar en Google Sheets: ' + (err.message || err));
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
    showToast('Cotización eliminada.');
  };

  const handleDeleteMultipleQuotes = (ids: string[]) => {
    const updated = deleteMultipleQuotes(ids);
    setQuotes(updated);
    if (selectedQuote && ids.includes(selectedQuote.id)) {
      setSelectedQuote(null);
      setCurrentView('quotes');
    }
    showToast(`${ids.length} cotizaciones eliminadas.`);
  };

  const handleClearAllQuotes = () => {
    clearQuotes();
    setQuotes([]);
    setSelectedQuote(null);
    showToast('Historial de cotizaciones vaciado (Data Limpia).');
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
    showToast('Cliente eliminado.');
  };

  const handleDeleteMultipleClients = (ids: string[]) => {
    const updated = deleteMultipleClients(ids);
    setClients(updated);
    showToast(`${ids.length} clientes eliminados.`);
  };

  const handleClearAllClients = () => {
    clearClients();
    setClients([]);
    showToast('Directorio de clientes vaciado (Data Limpia).');
  };

  // Handlers for Products
  const handleSaveProduct = (product: Product) => {
    const updated = upsertProduct(product);
    setProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = removeProduct(id);
    setProducts(updated);
    showToast('Producto eliminado.');
  };

  const handleDeleteMultipleProducts = (ids: string[]) => {
    const updated = deleteMultipleProducts(ids);
    setProducts(updated);
    showToast(`${ids.length} productos eliminados.`);
  };

  const handleClearAllProducts = () => {
    clearProducts();
    setProducts([]);
    showToast('Catálogo de productos vaciado (Data Limpia).');
  };

  const handleClearAllCleanSlate = () => {
    clearAllCleanSlate();
    setQuotes([]);
    setClients([]);
    setProducts([]);
    setSelectedQuote(null);
    showToast('¡Limpieza total completada! Cotizaciones, clientes y productos vaciados.');
  };

  const handleRestoreDemo = () => {
    resetToDemoData();
    setCompany(getCompanyProfile());
    setClients(getClients());
    setProducts(getProducts());
    setQuotes(getQuotes());
    setTermsTemplates(getTermsTemplates());
    showToast('Datos de demostración restaurados.');
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

  // RUC Access Gate: require login if enabled and no active session
  if (securityConfig.requireRucLogin && !authSession) {
    return (
      <RucLoginView
        company={company}
        securityConfig={securityConfig}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

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

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* RUC Auth Badge */}
            {authSession && (
              <div
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 font-mono shadow-2xs"
                title={`Sesión iniciada: ${authSession.userName} · ${authSession.businessName}`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">RUC: {authSession.ruc}</span>
                <span className="text-slate-400 font-sans font-medium text-[10px]">
                  ({authSession.role === 'admin' ? 'Admin' : 'Ventas'})
                </span>
              </div>
            )}

            {/* Google Sheets button with status dot */}
            <button
              onClick={() => setGoogleSheetsModalOpen(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs ${
                sheetsConfig
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
              title={sheetsConfig ? `Google Sheets conectado: ${sheetsConfig.spreadsheetTitle}` : 'Conectar Google Sheets'}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${sheetsConfig ? 'text-emerald-600' : 'text-slate-500'}`} />
              <span className="hidden sm:inline">Google Sheets</span>
              {sheetsConfig && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={handleStartCreateQuote}
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Cotización</span>
            </button>

            {/* Logout / Screen lock button */}
            {authSession && (
              <button
                onClick={handleLogout}
                className="hidden sm:inline-flex p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title={`Bloquear pantalla / Cerrar sesión (RUC: ${authSession.ruc})`}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

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
              Configuración de Empresa & Seguridad
            </button>
            <button
              onClick={() => {
                setGoogleSheetsModalOpen(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-slate-100 flex items-center justify-between text-emerald-700 font-bold"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Google Sheets</span>
              </div>
              {sheetsConfig && <span className="text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full font-semibold">Conectado</span>}
            </button>
            {authSession && (
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>RUC: {authSession.ruc} ({authSession.role})</span>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
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
            onDeleteMultipleQuotes={handleDeleteMultipleQuotes}
            onClearAllQuotes={handleClearAllQuotes}
            onUpdateStatus={handleUpdateQuoteStatus}
            onOpenGoogleSheets={() => setGoogleSheetsModalOpen(true)}
            onSyncQuoteToSheets={handleSyncQuoteToSheets}
            onRestoreDemo={handleRestoreDemo}
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
            onOpenGoogleSheets={() => setGoogleSheetsModalOpen(true)}
            onSyncQuoteToSheets={handleSyncQuoteToSheets}
          />
        )}

        {currentView === 'clients' && (
          <ClientsView
            clients={clients}
            quotes={quotes}
            company={company}
            onSaveClient={handleSaveClient}
            onDeleteClient={handleDeleteClient}
            onDeleteMultipleClients={handleDeleteMultipleClients}
            onClearAllClients={handleClearAllClients}
            onCreateQuoteForClient={handleStartCreateQuoteForClient}
            onRestoreDemo={handleRestoreDemo}
          />
        )}

        {currentView === 'products' && (
          <ProductsView
            products={products}
            company={company}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onDeleteMultipleProducts={handleDeleteMultipleProducts}
            onClearAllProducts={handleClearAllProducts}
            onRestoreDemo={handleRestoreDemo}
          />
        )}

        {currentView === 'company-settings' && (
          <CompanySettingsView
            company={company}
            termsTemplates={termsTemplates}
            securityConfig={securityConfig}
            quotesCount={quotes.length}
            clientsCount={clients.length}
            productsCount={products.length}
            onSaveCompany={handleSaveCompany}
            onSaveTermsTemplates={handleSaveTermsTemplates}
            onSaveSecurityConfig={(cfg) => {
              saveSecurityConfig(cfg);
              setSecurityConfig(cfg);
            }}
            onClearAllCleanSlate={handleClearAllCleanSlate}
            onClearQuotes={handleClearAllQuotes}
            onClearProducts={handleClearAllProducts}
            onClearClients={handleClearAllClients}
            onRestoreDemo={handleRestoreDemo}
            onLogout={handleLogout}
            onOpenGoogleSheets={() => setGoogleSheetsModalOpen(true)}
          />
        )}
      </main>

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={googleSheetsModalOpen}
        onClose={() => setGoogleSheetsModalOpen(false)}
        quotes={quotes}
        clients={clients}
        products={products}
        company={company}
        onConfigChange={(newCfg) => setSheetsConfig(newCfg)}
        onRestoreData={(newQuotes, newClients, newProducts, mode) => {
          setQuotes(newQuotes);
          setClients(newClients);
          setProducts(newProducts);
          showToast(
            `¡Restauración exitosa! ${newQuotes.length} cotizaciones, ${newClients.length} clientes y ${newProducts.length} productos actualizados (${mode === 'overwrite' ? 'Data Limpia' : 'Combinado'}).`
          );
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-medium border border-slate-700 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
