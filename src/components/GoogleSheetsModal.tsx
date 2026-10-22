import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Quote, Client, Product, CompanyProfile, GoogleSheetsConfig } from '../types';
import {
  googleSignIn,
  getAccessToken,
  logoutGoogle,
  initAuth,
} from '../utils/googleAuth';
import {
  createQuotesSpreadsheet,
  getSpreadsheetInfo,
  syncAllDataToSpreadsheet,
  extractSpreadsheetId,
  restoreFromGoogleSheets,
  parseExcelWorkbook,
} from '../utils/googleSheetsService';
import {
  getGoogleSheetsConfig,
  saveGoogleSheetsConfig,
  restoreDatasetFromExternal,
} from '../utils/storage';
import { GoogleSignInButton } from './GoogleSignInButton';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Link2,
  CheckCircle2,
  AlertTriangle,
  X,
  LogOut,
  User as UserIcon,
  HelpCircle,
  Table,
  ArrowDownToLine,
  ArrowUpFromLine,
  Upload,
  Layers,
  Package,
  Users,
  Check,
  FileUp,
  Database,
  FileText,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotes: Quote[];
  clients: Client[];
  products: Product[];
  company: CompanyProfile;
  onConfigChange?: (config: GoogleSheetsConfig | null) => void;
  onRestoreData?: (
    quotes: Quote[],
    clients: Client[],
    products: Product[],
    mode: 'overwrite' | 'merge'
  ) => void;
}

export const GoogleSheetsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotes,
  clients,
  products,
  company,
  onConfigChange,
  onRestoreData,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(
    () => getGoogleSheetsConfig()
  );

  const [activeTab, setActiveTab] = useState<'create' | 'link' | 'excel'>('create');
  const [newSheetTitle, setNewSheetTitle] = useState(
    () => `Cotizaciones y Ventas - ${company.name || 'Mi Empresa'}`
  );
  const [existingInput, setExistingInput] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Confirmation dialog state for destructive/overwrite operations
  const [showConfirmSync, setShowConfirmSync] = useState(false);

  // State for Restoration Review Modal
  const [restorePreview, setRestorePreview] = useState<{
    quotes: Quote[];
    clients: Client[];
    products: Product[];
    stats: { quotes: number; items: number; clients: number; products: number };
    sourceName: string;
  } | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');

  useEffect(() => {
    // Listen to auth state
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasToken(!!token);
      },
      () => {
        setHasToken(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasToken(true);
        setSuccessMessage('¡Sesión iniciada con Google exitosamente!');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'No se pudo iniciar sesión con Google. Intente nuevamente.'
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setHasToken(false);
    setSuccessMessage('Sesión cerrada.');
  };

  const handleCreateSheet = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingText('Creando hoja de cálculo en Google Drive...');

    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
        if (loginRes) setCurrentUser(loginRes.user);
      }
      if (!token) throw new Error('Se requiere iniciar sesión con Google para crear la hoja.');

      const result = await createQuotesSpreadsheet(newSheetTitle, token);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: result.id,
        spreadsheetUrl: result.url,
        spreadsheetTitle: result.title,
        lastSyncedAt: new Date().toISOString(),
        autoSyncOnSave: sheetsConfig?.autoSyncOnSave ?? true,
      };

      saveGoogleSheetsConfig(newConfig);
      setSheetsConfig(newConfig);
      if (onConfigChange) onConfigChange(newConfig);

      // Auto-populate with initial data
      setLoadingText('Sincronizando datos iniciales...');
      await syncAllDataToSpreadsheet(result.id, quotes, clients, products, token);

      setSuccessMessage(
        `¡Hoja de cálculo creada con éxito con ${quotes.length} cotización(es), ${products.length} producto(s) y ${clients.length} cliente(s) sincronizados!`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al crear la hoja de cálculo en Google.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleLinkExistingSheet = async () => {
    if (!existingInput.trim()) {
      setErrorMessage('Por favor ingrese el ID o la URL de la hoja de cálculo.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingText('Verificando acceso a la hoja de Google...');

    try {
      const sheetId = extractSpreadsheetId(existingInput);
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
        if (loginRes) setCurrentUser(loginRes.user);
      }
      if (!token) throw new Error('Se requiere iniciar sesión con Google.');

      const info = await getSpreadsheetInfo(sheetId, token);
      const newConfig: GoogleSheetsConfig = {
        spreadsheetId: sheetId,
        spreadsheetUrl: info.url,
        spreadsheetTitle: info.title,
        lastSyncedAt: sheetsConfig?.lastSyncedAt,
        autoSyncOnSave: sheetsConfig?.autoSyncOnSave ?? true,
      };

      saveGoogleSheetsConfig(newConfig);
      setSheetsConfig(newConfig);
      if (onConfigChange) onConfigChange(newConfig);

      setSuccessMessage(`¡Hoja "${info.title}" vinculada correctamente!`);
      setExistingInput('');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'No se pudo verificar la hoja de cálculo. Verifique que exista y tenga permisos.'
      );
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleToggleAutoSync = () => {
    if (!sheetsConfig) return;
    const updated: GoogleSheetsConfig = {
      ...sheetsConfig,
      autoSyncOnSave: !sheetsConfig.autoSyncOnSave,
    };
    saveGoogleSheetsConfig(updated);
    setSheetsConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  // Synchronize data to Google Sheets
  const handleConfirmFullSync = async () => {
    setShowConfirmSync(false);
    if (!sheetsConfig) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingText('Sincronizando cotizaciones y catálogo hacia Google Sheets...');

    try {
      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
        if (loginRes) setCurrentUser(loginRes.user);
      }
      if (!token) throw new Error('Se requiere iniciar sesión con Google.');

      const res = await syncAllDataToSpreadsheet(
        sheetsConfig.spreadsheetId,
        quotes,
        clients,
        products,
        token
      );

      const updated: GoogleSheetsConfig = {
        ...sheetsConfig,
        lastSyncedAt: new Date().toISOString(),
      };
      saveGoogleSheetsConfig(updated);
      setSheetsConfig(updated);
      if (onConfigChange) onConfigChange(updated);

      setSuccessMessage(
        `¡Sincronización completa! Se actualizaron ${res.quotesCount} cotizaciones, ${res.itemsCount} ítems, ${res.clientsCount} clientes y ${res.productsCount} productos en Google Sheets.`
      );
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al sincronizar con Google Sheets.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Restore data FROM Google Sheets
  const handleStartRestoreFromGoogleSheets = async (sheetIdToRestore?: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingText('Consultando pestañas y registros en Google Sheets...');

    try {
      const targetId = sheetIdToRestore || sheetsConfig?.spreadsheetId;
      if (!targetId) {
        throw new Error('Debe vincular o especificar una hoja de cálculo para restaurar.');
      }

      let token = await getAccessToken();
      if (!token) {
        const loginRes = await googleSignIn();
        token = loginRes?.accessToken || null;
        if (loginRes) setCurrentUser(loginRes.user);
      }
      if (!token) throw new Error('Se requiere iniciar sesión con Google para leer la hoja.');

      const result = await restoreFromGoogleSheets(targetId, token, company);

      if (
        result.stats.quotes === 0 &&
        result.stats.clients === 0 &&
        result.stats.products === 0
      ) {
        throw new Error(
          'La hoja de cálculo no contiene datos en las pestañas requeridas ("Cotizaciones", "Clientes" o "Catálogo de Productos").'
        );
      }

      setRestorePreview({
        ...result,
        sourceName: sheetsConfig?.spreadsheetTitle || `Google Sheet (${targetId})`,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al leer y restaurar desde Google Sheets.');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // Restore data FROM Excel (.xlsx) file
  const handleUploadExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsLoading(true);
    setLoadingText(`Leyendo archivo Excel "${file.name}"...`);

    try {
      const buffer = await file.arrayBuffer();
      const result = parseExcelWorkbook(buffer, company);

      if (
        result.stats.quotes === 0 &&
        result.stats.clients === 0 &&
        result.stats.products === 0
      ) {
        throw new Error(
          'El archivo Excel no contiene pestañas reconocibles ("Cotizaciones", "Clientes", "Catálogo de Productos") o filas con información.'
        );
      }

      setRestorePreview({
        ...result,
        sourceName: file.name,
      });
    } catch (err: any) {
      console.error(err);
      setErrorMessage(
        err.message || 'Error al procesar el archivo Excel. Verifique el formato del archivo.'
      );
    } finally {
      setIsLoading(false);
      setLoadingText('');
      e.target.value = '';
    }
  };

  // Execute restore apply
  const handleApplyRestore = () => {
    if (!restorePreview) return;
    try {
      restoreDatasetFromExternal(
        restorePreview.quotes,
        restorePreview.clients,
        restorePreview.products,
        restoreMode
      );

      if (onRestoreData) {
        onRestoreData(
          restorePreview.quotes,
          restorePreview.clients,
          restorePreview.products,
          restoreMode
        );
      }

      setSuccessMessage(
        `¡Restauración exitosa! Se han restaurado ${restorePreview.stats.quotes} cotizaciones, ${restorePreview.stats.clients} clientes y ${restorePreview.stats.products} productos en modo ${
          restoreMode === 'overwrite' ? 'Data Limpia (Reemplazo Total)' : 'Combinar datos'
        }.`
      );
      setRestorePreview(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error al aplicar los datos restaurados.');
    }
  };

  const handleDisconnectSheet = () => {
    if (window.confirm('¿Está seguro de desvincular la hoja de cálculo actual de la aplicación?')) {
      saveGoogleSheetsConfig(null);
      setSheetsConfig(null);
      if (onConfigChange) onConfigChange(null);
      setSuccessMessage('Hoja de cálculo desvinculada.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Sincronización & Restauración Cloud / Excel</h2>
              <p className="text-xs text-emerald-100">
                Sincronice bidireccionalmente y restaure cotizaciones, clientes y catálogo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Atención: </span>
                {errorMessage}
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
              <button
                onClick={() => setSuccessMessage(null)}
                className="text-emerald-500 hover:text-emerald-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading status indicator */}
          {isLoading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 text-blue-800 text-xs font-semibold animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
              <span>{loadingText || 'Procesando operación...'}</span>
            </div>
          )}

          {/* 1. Google Account Connection Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Google User'}
                  className="w-10 h-10 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500 font-medium">Cuenta de Google</div>
                <div className="text-sm font-bold text-slate-900">
                  {currentUser ? currentUser.displayName || currentUser.email : 'No conectado'}
                </div>
                {currentUser?.email && (
                  <div className="text-xs text-slate-500">{currentUser.email}</div>
                )}
              </div>
            </div>

            <div>
              {currentUser && hasToken ? (
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Desconectar cuenta</span>
                </button>
              ) : (
                <GoogleSignInButton
                  onClick={handleLogin}
                  loading={isLoggingIn}
                  label={currentUser ? 'Reconectar Google' : 'Conectar con Google'}
                />
              )}
            </div>
          </div>

          {/* 2. Active Linked Spreadsheet (if any) */}
          {sheetsConfig && (
            <div className="p-5 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Hoja de Cálculo Activa en la Nube
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {sheetsConfig.spreadsheetTitle}
                  </h3>
                  <p className="text-xs text-slate-600">
                    ID: <code className="bg-emerald-100/70 px-1 py-0.5 rounded text-[11px] font-mono">{sheetsConfig.spreadsheetId}</code>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={sheetsConfig.spreadsheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <span>Abrir en Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={handleDisconnectSheet}
                    title="Desvincular esta hoja"
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tabs Included Badge */}
              <div className="pt-2 border-t border-emerald-200/70 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Pestañas sincronizadas:</span>
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-800 font-medium flex items-center gap-1">
                  <Table className="w-3 h-3 text-emerald-600" /> Cotizaciones
                </span>
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-800 font-medium flex items-center gap-1">
                  <Table className="w-3 h-3 text-emerald-600" /> Items Cotizados
                </span>
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-800 font-medium flex items-center gap-1">
                  <Table className="w-3 h-3 text-emerald-600" /> Clientes
                </span>
                <span className="px-2 py-0.5 bg-white border border-emerald-200 rounded text-emerald-800 font-medium flex items-center gap-1">
                  <Table className="w-3 h-3 text-emerald-600" /> Catálogo de Productos
                </span>
              </div>

              {/* Bidirectional Actions: Push or Pull */}
              <div className="pt-3 border-t border-emerald-200/70 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sheetsConfig.autoSyncOnSave ?? true}
                    onChange={handleToggleAutoSync}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 font-medium">
                    Sincronización automática al crear o editar cotizaciones
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowConfirmSync(true)}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <ArrowUpFromLine className="w-3.5 h-3.5" />
                    <span>Subir Data Actual a Google Sheets</span>
                  </button>

                  <button
                    onClick={() => handleStartRestoreFromGoogleSheets()}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-800 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Restaurar Todo desde Google Sheets</span>
                  </button>
                </div>
              </div>

              {sheetsConfig.lastSyncedAt && (
                <div className="text-[11px] text-slate-500">
                  Última sincronización:{' '}
                  <span className="font-medium text-slate-700">
                    {new Date(sheetsConfig.lastSyncedAt).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 3. Setup New / Link / Restore from Excel */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap border-b border-slate-200 gap-4">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'create'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <PlusCircle className="w-4 h-4" />
                <span>Crear Nueva Hoja</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('link')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'link'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Link2 className="w-4 h-4" />
                <span>Vincular por ID o URL</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('excel')}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'excel'
                    ? 'border-emerald-600 text-emerald-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Restaurar desde Archivo Excel (.xlsx)</span>
              </button>
            </div>

            {activeTab === 'create' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre de la nueva Hoja de Cálculo en Google Drive
                  </label>
                  <input
                    type="text"
                    value={newSheetTitle}
                    onChange={(e) => setNewSheetTitle(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                    placeholder="Ej: Cotizaciones y Presupuestos 2026"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Se creará en su Google Drive con 4 pestañas estructuradas: <strong>Cotizaciones</strong>, <strong>Items Cotizados</strong>, <strong>Clientes</strong> y <strong>Catálogo de Productos</strong>.
                  </p>
                </div>

                <button
                  onClick={handleCreateSheet}
                  disabled={isLoading || !newSheetTitle.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isLoading ? 'Creando en Google Drive...' : 'Crear y Sincronizar en Google Sheets'}</span>
                </button>
              </div>
            )}

            {activeTab === 'link' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    URL o ID de la Hoja de Google Sheets
                  </label>
                  <input
                    type="text"
                    value={existingInput}
                    onChange={(e) => setExistingInput(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono text-[11px]"
                    placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit..."
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Pegue el enlace del navegador de su hoja de cálculo. Puede vincularla para sincronización continua o leer y restaurar sus datos directamente.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleLinkExistingSheet}
                    disabled={isLoading || !existingInput.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Link2 className="w-4 h-4" />
                    <span>{isLoading ? 'Verificando acceso...' : 'Vincular para Sincronización'}</span>
                  </button>

                  <button
                    onClick={() => {
                      try {
                        const id = extractSpreadsheetId(existingInput.trim());
                        handleStartRestoreFromGoogleSheets(id);
                      } catch (err: any) {
                        setErrorMessage(err.message || 'ID o enlace de hoja inválido.');
                      }
                    }}
                    disabled={isLoading || !existingInput.trim()}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    <span>Leer y Restaurar Datos desde esta Hoja</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'excel' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Restaurar Base de Datos desde Excel (.xlsx / .xls)</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    Cargue un libro de Excel previamente exportado desde Google Sheets o su sistema de gestión. Reconoce pestañas como <strong>Cotizaciones</strong>, <strong>Items Cotizados</strong>, <strong>Clientes</strong> y <strong>Catálogo de Productos</strong> para reconstruir la base completa.
                  </p>
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800 mb-1">
                    Haga clic para seleccionar o arrastre su archivo Excel
                  </p>
                  <p className="text-[11px] text-slate-500 mb-4">
                    Formatos admitidos: .xlsx, .xls
                  </p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer shadow-xs">
                    <FileUp className="w-4 h-4" />
                    <span>Seleccionar Archivo Excel (.xlsx)</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                      onChange={handleUploadExcel}
                      disabled={isLoading}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Information & Fields Mapping Guide */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <HelpCircle className="w-4 h-4 text-emerald-600" />
              <span>¿Cómo funciona la restauración de datos?</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-1 list-disc pl-5">
              <li>
                <strong>Sincronización Bidireccional:</strong> Puede subir sus registros actuales a Google Sheets o restaurar toda la base desde una hoja de cálculo o archivo Excel.
              </li>
              <li>
                <strong>Opción "Data Limpia":</strong> Le permite vaciar los registros previos del navegador y dejar únicamente lo restaurado de la hoja de cálculo de Google o Excel.
              </li>
              <li>
                <strong>Reconstrucción Inteligente:</strong> Las cotizaciones se vinculan automáticamente con sus partidas desglosadas y con sus clientes por RUC o Razón Social.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Destructive / Full Synchronization */}
      {showConfirmSync && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  ¿Confirmar sincronización con Google Sheets?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Esta acción actualizará los registros en la hoja de cálculo{' '}
                  <strong className="text-slate-800">
                    "{sheetsConfig?.spreadsheetTitle}"
                  </strong>
                  , escribiendo {quotes.length} cotización(es), {products.length} producto(s) y {clients.length} cliente(s).
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-800">
              Las filas existentes serán actualizadas para reflejar el estado actual de las cotizaciones y productos del sistema.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSync(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmFullSync}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Confirmar y Sincronizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restoration Review Preview Modal */}
      {restorePreview && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-5 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Confirmar Restauración de Base de Datos
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Origen: {restorePreview.sourceName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRestorePreview(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Found metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-lg font-black text-slate-900">{restorePreview.stats.quotes}</div>
                <div className="text-[11px] text-slate-500 font-medium">Cotizaciones</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-lg font-black text-slate-900">{restorePreview.stats.items}</div>
                <div className="text-[11px] text-slate-500 font-medium">Items de Partidas</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-lg font-black text-slate-900">{restorePreview.stats.clients}</div>
                <div className="text-[11px] text-slate-500 font-medium">Clientes</div>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                <div className="text-lg font-black text-slate-900">{restorePreview.stats.products}</div>
                <div className="text-[11px] text-slate-500 font-medium">Productos</div>
              </div>
            </div>

            {/* Mode selection: Data Limpia (Overwrite) vs Merge */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Seleccione el modo de restauración:
              </label>

              <div className="space-y-2">
                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    restoreMode === 'overwrite'
                      ? 'border-rose-400 bg-rose-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="overwrite"
                    checked={restoreMode === 'overwrite'}
                    onChange={() => setRestoreMode('overwrite')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>Data Limpia (Reemplazo Total)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        Recomendado para restauración completa
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Borra los registros locales actuales de cotizaciones, clientes y productos, y establece exactamente los que vienen de la hoja/Excel.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    restoreMode === 'merge'
                      ? 'border-blue-400 bg-blue-50/50 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="restoreMode"
                    value="merge"
                    checked={restoreMode === 'merge'}
                    onChange={() => setRestoreMode('merge')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-slate-900">
                      Combinar con datos locales existentes
                    </div>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Conserva los datos locales no coincidentes y actualiza/agrega los registros importados según Folio, ID o SKU.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Preview sample quotes if available */}
            {restorePreview.quotes.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-700">
                  Muestra de cotizaciones detectadas ({Math.min(3, restorePreview.quotes.length)} de {restorePreview.quotes.length}):
                </span>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 text-[11px]">
                  {restorePreview.quotes.slice(0, 3).map((q) => (
                    <div key={q.id || q.folio} className="p-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-800">{q.folio}</span>
                        <span className="text-slate-600 truncate max-w-[200px]">
                          {q.clientSnapshot?.name || 'Cliente sin nombre'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-700">
                          {(typeof q.currency === 'object' ? q.currency?.symbol || q.currency?.code : q.currency) || '$'} {q.total?.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-2">
                          ({q.items?.length || 0} ítems)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRestorePreview(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyRestore}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg transition-colors cursor-pointer shadow-md"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Restauración ({restoreMode === 'overwrite' ? 'Data Limpia' : 'Combinar'})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
