import React, { useState } from 'react';
import {
  CompanyProfile,
  TermsTemplate,
  CurrencyConfig,
  CustomDigitalWallet,
  SecurityConfig,
} from '../types';
import {
  Building2,
  Upload,
  Save,
  Check,
  CreditCard,
  DollarSign,
  FileText,
  RotateCcw,
  Download,
  AlertTriangle,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Globe,
  Trash2,
  Plus,
  QrCode,
  Smartphone,
  Layers,
  Database,
  HardDrive,
  FileSpreadsheet,
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  RefreshCw,
  Eraser,
} from 'lucide-react';
import {
  exportAllData,
  importAllData,
  resetToDemoData,
} from '../utils/storage';
import { ConfirmModal } from './ConfirmModal';

interface Props {
  company: CompanyProfile;
  termsTemplates: TermsTemplate[];
  securityConfig: SecurityConfig;
  quotesCount?: number;
  clientsCount?: number;
  productsCount?: number;
  onSaveCompany: (updated: CompanyProfile) => void;
  onSaveTermsTemplates: (templates: TermsTemplate[]) => void;
  onSaveSecurityConfig: (security: SecurityConfig) => void;
  onClearAllCleanSlate?: () => void;
  onClearQuotes?: () => void;
  onClearProducts?: () => void;
  onClearClients?: () => void;
  onRestoreDemo?: () => void;
  onLogout?: () => void;
}

export const CompanySettingsView: React.FC<Props> = ({
  company,
  termsTemplates,
  securityConfig,
  quotesCount = 0,
  clientsCount = 0,
  productsCount = 0,
  onSaveCompany,
  onSaveTermsTemplates,
  onSaveSecurityConfig,
  onClearAllCleanSlate,
  onClearQuotes,
  onClearProducts,
  onClearClients,
  onRestoreDemo,
  onLogout,
}) => {
  const [profile, setProfile] = useState<CompanyProfile>(() => {
    const copy = { ...company };
    if (!copy.taxIdLabel) copy.taxIdLabel = 'RUC';
    if (!copy.digitalWallets) {
      copy.digitalWallets = {
        yape: { enabled: true, phone: copy.phone || '', holderName: copy.legalName || copy.name, qrCodeUrl: '' },
        plin: { enabled: true, phone: copy.phone || '', holderName: copy.legalName || copy.name, qrCodeUrl: '' },
        otherWallets: [],
      };
    }
    return copy;
  });

  const [templates, setTemplates] = useState<TermsTemplate[]>([...termsTemplates]);
  const [localSecurity, setLocalSecurity] = useState<SecurityConfig>(securityConfig);
  const [showSecPin, setShowSecPin] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'payments' | 'fiscal' | 'terms' | 'backup' | 'security'>('profile');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    details?: string;
    confirmLabel?: string;
    variant?: 'danger' | 'warning' | 'primary';
    requireConfirmWord?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Handle Logo File Upload (converted to Base64 data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfile((prev) => ({ ...prev, logoUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // QR Code upload for Yape
  const handleYapeQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfile((prev) => ({
          ...prev,
          digitalWallets: {
            ...prev.digitalWallets,
            yape: { ...prev.digitalWallets.yape, qrCodeUrl: reader.result as string },
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // QR Code upload for Plin
  const handlePlinQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfile((prev) => ({
          ...prev,
          digitalWallets: {
            ...prev.digitalWallets,
            plin: { ...prev.digitalWallets.plin, qrCodeUrl: reader.result as string },
          },
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProfile((prev) => ({ ...prev, signatorySignatureUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAll = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    onSaveCompany(profile);
    onSaveTermsTemplates(templates);
    onSaveSecurityConfig(localSecurity);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Quick Country / Tax ID Preset Configurator
  const applyCountryPreset = (countryKey: string) => {
    if (countryKey === 'PE_RUC') {
      setProfile((prev) => ({
        ...prev,
        country: 'Perú',
        taxIdLabel: 'RUC',
        taxName: 'IGV',
        defaultTaxRate: 18,
        defaultPricesIncludeTax: false,
        currency: { code: 'PEN', symbol: 'S/.', position: 'prefix', decimals: 2 },
      }));
    } else if (countryKey === 'PE_RUS') {
      setProfile((prev) => ({
        ...prev,
        country: 'Perú',
        taxIdLabel: 'RUS',
        taxName: 'IGV',
        defaultTaxRate: 0,
        defaultPricesIncludeTax: true,
        currency: { code: 'PEN', symbol: 'S/.', position: 'prefix', decimals: 2 },
      }));
    } else if (countryKey === 'CL_RUT') {
      setProfile((prev) => ({
        ...prev,
        country: 'Chile',
        taxIdLabel: 'RUT',
        taxName: 'IVA',
        defaultTaxRate: 19,
        defaultPricesIncludeTax: false,
        currency: { code: 'CLP', symbol: '$', position: 'prefix', decimals: 0 },
      }));
    } else if (countryKey === 'MX_RFC') {
      setProfile((prev) => ({
        ...prev,
        country: 'México',
        taxIdLabel: 'RFC',
        taxName: 'IVA',
        defaultTaxRate: 16,
        defaultPricesIncludeTax: false,
        currency: { code: 'MXN', symbol: '$', position: 'prefix', decimals: 2 },
      }));
    } else if (countryKey === 'CO_NIT') {
      setProfile((prev) => ({
        ...prev,
        country: 'Colombia',
        taxIdLabel: 'NIT',
        taxName: 'IVA',
        defaultTaxRate: 19,
        defaultPricesIncludeTax: false,
        currency: { code: 'COP', symbol: '$', position: 'prefix', decimals: 0 },
      }));
    } else if (countryKey === 'ES_CIF') {
      setProfile((prev) => ({
        ...prev,
        country: 'España',
        taxIdLabel: 'CIF',
        taxName: 'IVA',
        defaultTaxRate: 21,
        defaultPricesIncludeTax: false,
        currency: { code: 'EUR', symbol: '€', position: 'suffix', decimals: 2 },
      }));
    } else if (countryKey === 'AR_CUIT') {
      setProfile((prev) => ({
        ...prev,
        country: 'Argentina',
        taxIdLabel: 'CUIT',
        taxName: 'IVA',
        defaultTaxRate: 21,
        defaultPricesIncludeTax: false,
        currency: { code: 'ARS', symbol: '$', position: 'prefix', decimals: 2 },
      }));
    } else if (countryKey === 'US_TAXID') {
      setProfile((prev) => ({
        ...prev,
        country: 'Estados Unidos',
        taxIdLabel: 'Tax ID',
        taxName: 'Sales Tax',
        defaultTaxRate: 0,
        defaultPricesIncludeTax: false,
        currency: { code: 'USD', symbol: '$', position: 'prefix', decimals: 2 },
      }));
    }
  };

  const handleDownloadBackup = () => {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_cotizapro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const success = importAllData(reader.result);
        if (success) {
          alert('¡Datos restaurados con éxito! La página se actualizará.');
          window.location.reload();
        } else {
          alert('Error al leer el archivo de respaldo. Verifique el formato.');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (
      window.confirm(
        '¿Está seguro de restablecer toda la aplicación a los datos de demostración originales? Se perderán las modificaciones no respaldadas.'
      )
    ) {
      resetToDemoData();
      alert('Datos restablecidos. Se recargará la aplicación.');
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Configuración de la Empresa
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure la razón social, tipo de identificación tributaria (RUC, RUS, RUT, RFC, NIT), logo, billeteras digitales (Yape, Plin) y transferencias.
          </p>
        </div>

        <button
          onClick={() => handleSaveAll()}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? '¡Cambios Guardados!' : 'Guardar Configuración'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 pt-2 rounded-t-xl text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Razón Social & Identidad</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4 text-purple-600" />
          <span>Billeteras (Yape, Plin) & Bancos</span>
        </button>

        <button
          onClick={() => setActiveTab('fiscal')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'fiscal'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Moneda, Folios e Impuestos</span>
        </button>

        <button
          onClick={() => setActiveTab('terms')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'terms'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Términos y Condiciones por Rubro</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'backup'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span>Respaldos & Datos</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-3 px-4 font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Seguridad & Acceso RUC</span>
        </button>
      </div>

      {/* Tab 1: Profile & Commercial Identity */}
      {activeTab === 'profile' && (
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 shadow-xs space-y-6">
          {/* Quick Country / Identification Preset Bar */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2.5">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Ajuste Rápido de País y Tipo de Razón Social / Impuesto:</span>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {[
                { key: 'PE_RUC', label: '🇵🇪 Perú: RUC (S/. · IGV 18%)' },
                { key: 'PE_RUS', label: '🇵🇪 Perú: RUS (Régimen Único Simplificado)' },
                { key: 'CL_RUT', label: '🇨🇱 Chile: RUT ($ · IVA 19%)' },
                { key: 'MX_RFC', label: '🇲🇽 México: RFC ($ · IVA 16%)' },
                { key: 'CO_NIT', label: '🇨🇴 Colombia: NIT ($ · IVA 19%)' },
                { key: 'ES_CIF', label: '🇪🇸 España: CIF / NIF (€ · IVA 21%)' },
                { key: 'AR_CUIT', label: '🇦🇷 Argentina: CUIT ($ · IVA 21%)' },
                { key: 'US_TAXID', label: '🌐 Internacional: Tax ID (USD $)' },
              ].map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => applyCountryPreset(c.key)}
                  className="px-2.5 py-1 bg-white hover:bg-blue-100/70 border border-blue-300 rounded-md font-medium text-slate-700 transition-colors cursor-pointer text-[11px]"
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Logo Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-6">
            <div className="w-32 h-24 bg-white border border-slate-300 rounded-lg flex items-center justify-center overflow-hidden p-2 relative shadow-xs shrink-0">
              {profile.logoUrl ? (
                <img
                  src={profile.logoUrl}
                  alt="Logo Empresa"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Building2 className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <span className="text-[10px] font-medium block">Sin Logo</span>
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs flex-1">
              <h3 className="font-bold text-slate-800">
                Logotipo Oficial de la Empresa
              </h3>
              <p className="text-slate-500 text-[11px]">
                Aparecerá en el encabezado de todas las cotizaciones impresas o exportadas a PDF.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-md font-semibold text-slate-700 cursor-pointer shadow-xs">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Archivo de Logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                {profile.logoUrl && (
                  <button
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, logoUrl: '' }))}
                    className="text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    Quitar logo
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Legal and Commercial Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Nombre de Fantasía / Nombre Comercial *
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                placeholder="Ej: Nova Soluciones Digitales"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Razón Social Completa (Datos Legales) *
              </label>
              <input
                type="text"
                value={profile.legalName}
                onChange={(e) => setProfile({ ...profile, legalName: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-semibold"
                placeholder="Ej: Nova Soluciones SAC / SpA / SA de CV"
              />
            </div>

            {/* Configurable Tax ID Label & Value */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tipo de Razón / ID *
                </label>
                <input
                  type="text"
                  value={profile.taxIdLabel || 'RUC'}
                  onChange={(e) =>
                    setProfile({ ...profile, taxIdLabel: e.target.value.toUpperCase() })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-2 text-slate-900 font-bold font-mono text-center"
                  placeholder="RUC / RUS / RUT"
                  title="Ejemplo: RUC, RUS, RUT, RFC, NIT, CIF, CUIT, DNI"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  RUC, RUS, RUT, etc.
                </span>
              </div>
              <div className="col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Número de {profile.taxIdLabel || 'RUC'} *
                </label>
                <input
                  type="text"
                  value={profile.taxId}
                  onChange={(e) => setProfile({ ...profile, taxId: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  placeholder="Ej: 20608421901"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Giro Comercial / Actividad / Rubro *
              </label>
              <input
                type="text"
                value={profile.activity}
                onChange={(e) => setProfile({ ...profile, activity: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                placeholder="Ej: Consultoría, Venta de Equipos, Construcción, etc."
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="border-t border-slate-200 pt-5 space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm">
              Información de Contacto y Ubicación
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Dirección Física
                </label>
                <input
                  type="text"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Av. Javier Prado Este 4200, Of. 702"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Ciudad / Comuna
                </label>
                <input
                  type="text"
                  value={profile.city}
                  onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Lima"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={profile.country}
                  onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Perú / Chile / México / Colombia..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="contacto@empresa.com"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Teléfono Comercial
                </label>
                <input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="+51 1 654 3210"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  value={profile.whatsapp}
                  onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="+51 984 321 000"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Sitio Web
                </label>
                <input
                  type="text"
                  value={profile.website}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="www.miempresa.com"
                />
              </div>
            </div>
          </div>

          {/* Representative & Signature */}
          <div className="border-t border-slate-200 pt-5 space-y-4 text-xs">
            <h3 className="font-bold text-slate-800 text-sm">
              Firma Autorizada y Representante
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre del Emisor / Representante
                </label>
                <input
                  type="text"
                  value={profile.signatoryName}
                  onChange={(e) => setProfile({ ...profile, signatoryName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Ej: Rodrigo Morales Valenzuela"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cargo o Título Profesional
                </label>
                <input
                  type="text"
                  value={profile.signatoryTitle}
                  onChange={(e) => setProfile({ ...profile, signatoryTitle: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Ej: Director Comercial & Operaciones"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-4">
              <div>
                <span className="font-bold text-slate-800 block">Firma Digital / Timbre (Opcional)</span>
                <span className="text-slate-500 text-[11px]">
                  Cargue una imagen con su firma o sello para que aparezca impresa en el bloque de firma.
                </span>
              </div>
              <div className="flex items-center gap-3">
                {profile.signatorySignatureUrl && (
                  <img
                    src={profile.signatorySignatureUrl}
                    alt="Firma"
                    className="h-10 max-w-[120px] object-contain border p-1 bg-white rounded"
                  />
                )}
                <label className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 rounded-md font-semibold text-slate-700 cursor-pointer text-xs shadow-xs">
                  Subir Firma
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSignatureUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Payments (Digital Wallets Yape, Plin & Bank Transfer) */}
      {activeTab === 'payments' && (
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-purple-600" />
              <span>Billeteras Digitales (Yape, Plin) y Transferencia Bancaria</span>
            </h3>
            <p className="text-slate-500 mt-0.5">
              Configure los números, titulares y códigos QR de sus billeteras para que los clientes puedan pagar escaneando directamente desde la cotización.
            </p>
          </div>

          {/* Billeteras Digitales: Yape & Plin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* YAPE CARD */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 border border-purple-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-700 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    Y
                  </div>
                  <div>
                    <h4 className="font-bold text-purple-950 text-sm">Yape</h4>
                    <span className="text-[11px] text-purple-700">Billetera Digital Móvil</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.digitalWallets?.yape?.enabled ?? true}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        digitalWallets: {
                          ...profile.digitalWallets,
                          yape: {
                            ...profile.digitalWallets.yape,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="font-bold text-purple-900">Activo en cotizaciones</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Número de Celular Yape *
                  </label>
                  <input
                    type="text"
                    value={profile.digitalWallets?.yape?.phone || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        digitalWallets: {
                          ...profile.digitalWallets,
                          yape: {
                            ...profile.digitalWallets.yape,
                            phone: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Ej: 984 321 000"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre del Titular Yape
                  </label>
                  <input
                    type="text"
                    value={profile.digitalWallets?.yape?.holderName || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        digitalWallets: {
                          ...profile.digitalWallets,
                          yape: {
                            ...profile.digitalWallets.yape,
                            holderName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Ej: Nexus Soluciones SAC o Carlos Pérez"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                {/* QR Code Upload for Yape */}
                <div className="pt-2 border-t border-purple-200/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white border border-purple-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {profile.digitalWallets?.yape?.qrCodeUrl ? (
                        <img
                          src={profile.digitalWallets.yape.qrCodeUrl}
                          alt="QR Yape"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-6 h-6 text-purple-400" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">
                        Código QR de Yape
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Para escanear desde la cotización
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-2.5 py-1.5 bg-white border border-purple-300 hover:bg-purple-50 text-purple-900 font-semibold rounded-md cursor-pointer text-[11px] shadow-2xs">
                      Subir QR
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleYapeQrUpload}
                        className="hidden"
                      />
                    </label>
                    {profile.digitalWallets?.yape?.qrCodeUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            digitalWallets: {
                              ...profile.digitalWallets,
                              yape: { ...profile.digitalWallets.yape, qrCodeUrl: '' },
                            },
                          })
                        }
                        className="text-rose-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PLIN CARD */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-100/50 border border-cyan-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                    P
                  </div>
                  <div>
                    <h4 className="font-bold text-cyan-950 text-sm">Plin</h4>
                    <span className="text-[11px] text-cyan-700">Interbancario Móvil (BBVA/Scotiabank/Interbank)</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.digitalWallets?.plin?.enabled ?? true}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        digitalWallets: {
                          ...profile.digitalWallets,
                          plin: {
                            ...profile.digitalWallets.plin,
                            enabled: e.target.checked,
                          },
                        },
                      })
                    }
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <span className="font-bold text-cyan-900">Activo en cotizaciones</span>
                </label>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Número de Celular Plin *
                  </label>
                  <input
                    type="text"
                    value={profile.digitalWallets?.plin?.phone || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        digitalWallets: {
                          ...profile.digitalWallets,
                          plin: {
                            ...profile.digitalWallets.plin,
                            phone: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Ej: 984 321 000"
                    className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre del Titular Plin
                  </label>
                  <input
                    type="text"
                    value={profile.digitalWallets?.plin?.holderName || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        digitalWallets: {
                          ...profile.digitalWallets,
                          plin: {
                            ...profile.digitalWallets.plin,
                            holderName: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="Ej: Nexus Soluciones SAC o Carlos Pérez"
                    className="w-full bg-white border border-cyan-200 rounded-lg px-3 py-2 text-slate-900"
                  />
                </div>

                {/* QR Code Upload for Plin */}
                <div className="pt-2 border-t border-cyan-200/60 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white border border-cyan-200 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                      {profile.digitalWallets?.plin?.qrCodeUrl ? (
                        <img
                          src={profile.digitalWallets.plin.qrCodeUrl}
                          alt="QR Plin"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-6 h-6 text-cyan-500" />
                      )}
                    </div>
                    <div>
                      <span className="font-bold text-slate-800 block text-[11px]">
                        Código QR de Plin
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Para escanear desde la cotización
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="px-2.5 py-1.5 bg-white border border-cyan-300 hover:bg-cyan-50 text-cyan-900 font-semibold rounded-md cursor-pointer text-[11px] shadow-2xs">
                      Subir QR
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePlinQrUpload}
                        className="hidden"
                      />
                    </label>
                    {profile.digitalWallets?.plin?.qrCodeUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            digitalWallets: {
                              ...profile.digitalWallets,
                              plin: { ...profile.digitalWallets.plin, qrCodeUrl: '' },
                            },
                          })
                        }
                        className="text-rose-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Transfer Details Section */}
          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>Datos para Transferencia Bancaria Directa</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre de la Entidad Bancaria
                </label>
                <input
                  type="text"
                  value={profile.bankInfo.bankName}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankInfo: { ...profile.bankInfo, bankName: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Ej: BCP / BBVA / Interbank / Banco Santander"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tipo de Cuenta
                </label>
                <input
                  type="text"
                  value={profile.bankInfo.accountType}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankInfo: { ...profile.bankInfo, accountType: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Ej: Cuenta Corriente Soles / Dólares"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Número de Cuenta / CCI
                </label>
                <input
                  type="text"
                  value={profile.bankInfo.accountNumber}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankInfo: { ...profile.bankInfo, accountNumber: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                  placeholder="Ej: 193-8472910-0-54 (CCI: 002-193...)"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre del Titular de la Cuenta
                </label>
                <input
                  type="text"
                  value={profile.bankInfo.beneficiaryName}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankInfo: { ...profile.bankInfo, beneficiaryName: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="Ej: Nexus Soluciones SAC"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {profile.taxIdLabel || 'RUC'} del Titular
                </label>
                <input
                  type="text"
                  value={profile.bankInfo.beneficiaryTaxId}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankInfo: { ...profile.bankInfo, beneficiaryTaxId: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono"
                  placeholder="Ej: 20608421901"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Correo para Envío de Comprobantes
                </label>
                <input
                  type="email"
                  value={profile.bankInfo.notifyEmail}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      bankInfo: { ...profile.bankInfo, notifyEmail: e.target.value },
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                  placeholder="pagos@empresa.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Instrucciones Adicionales de Pago
              </label>
              <input
                type="text"
                value={profile.bankInfo.notes || ''}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    bankInfo: { ...profile.bankInfo, notes: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                placeholder="Ej: Enviar comprobante con el número de cotización en el asunto o mensaje."
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Fiscal, Currency & Folio */}
      {activeTab === 'fiscal' && (
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Moneda, Impuestos y Consecutivo de Cotizaciones
            </h3>
            <p className="text-slate-500 mt-0.5">
              Adapte el sistema al estándar contable de su país.
            </p>
          </div>

          {/* Currency Configuration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Código Moneda
              </label>
              <input
                type="text"
                value={profile.currency.code}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    currency: { ...profile.currency, code: e.target.value.toUpperCase() },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Símbolo
              </label>
              <input
                type="text"
                value={profile.currency.symbol}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    currency: { ...profile.currency, symbol: e.target.value },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold text-center"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Posición
              </label>
              <select
                value={profile.currency.position}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    currency: {
                      ...profile.currency,
                      position: e.target.value as 'prefix' | 'suffix',
                    },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
              >
                <option value="prefix">Prefijo (S/. 1,000 o $ 1,000)</option>
                <option value="suffix">Sufijo (1.000 €)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Decimales
              </label>
              <input
                type="number"
                min="0"
                max="4"
                value={profile.currency.decimals}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    currency: {
                      ...profile.currency,
                      decimals: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-center"
              />
            </div>
          </div>

          {/* Tax and Folios */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200 pt-5">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tasa IGV / IVA / Impuesto por Defecto (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={profile.defaultTaxRate}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    defaultTaxRate: Number(e.target.value) || 0,
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-bold"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Ej: 18% (IGV Perú), 19% (Chile/Col), 16% (México), 0% (Exento/RUS)
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Prefijo de Folio de Cotización
              </label>
              <input
                type="text"
                value={profile.quotePrefix}
                onChange={(e) =>
                  setProfile({ ...profile, quotePrefix: e.target.value })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
                placeholder="COT-"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Ejemplo: COT-2026-101
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Siguiente Número Consecutivo
              </label>
              <input
                type="number"
                min="1"
                value={profile.nextQuoteNumber}
                onChange={(e) =>
                  setProfile({
                    ...profile,
                    nextQuoteNumber: Number(e.target.value) || 101,
                  })
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Terms and Conditions Templates */}
      {activeTab === 'terms' && (
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Plantillas de Términos y Condiciones por Rubro
            </h3>
            <p className="text-slate-500 mt-0.5">
              Defina las cláusulas que se cargan automáticamente según el rubro o servicio cotizado.
            </p>
          </div>

          {/* Default values that apply to all new quotes */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
              Condiciones Predeterminadas Generales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Forma de Pago Predeterminada
                </label>
                <input
                  type="text"
                  value={profile.defaultPaymentTerms}
                  onChange={(e) =>
                    setProfile({ ...profile, defaultPaymentTerms: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Plazo de Entrega Predeterminado
                </label>
                <input
                  type="text"
                  value={profile.defaultDeliveryTime}
                  onChange={(e) =>
                    setProfile({ ...profile, defaultDeliveryTime: e.target.value })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-600 mb-1">
                  Días de Validez Predeterminados
                </label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={profile.defaultValidityDays}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      defaultValidityDays: Number(e.target.value) || 15,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-center font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">
                Cláusulas y Términos Legales Base
              </label>
              <textarea
                rows={4}
                value={profile.defaultTerms}
                onChange={(e) => setProfile({ ...profile, defaultTerms: e.target.value })}
                className="w-full font-mono bg-white border border-slate-300 rounded-lg p-3 text-slate-900"
              />
            </div>
          </div>

          {/* List of Industry Templates */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-slate-800 text-sm">
                Biblioteca de Plantillas por Rubro ({templates.length})
              </h4>
              <button
                type="button"
                onClick={() => {
                  const newTpl: TermsTemplate = {
                    id: 'tpl-' + Date.now(),
                    name: 'Nueva Plantilla de Rubro',
                    sector: 'Personalizado',
                    paymentTerms: '50% anticipo y 50% contra entrega.',
                    deliveryTime: '10 días hábiles.',
                    validityDays: 15,
                    terms: '1. Validez de oferta: 15 días.\n2. Forma de pago: Transferencia electrónica o Billetera Digital.',
                    notes: '',
                  };
                  setTemplates([...templates, newTpl]);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Plantilla</span>
              </button>
            </div>

            <div className="space-y-4">
              {templates.map((tpl, idx) => (
                <div
                  key={tpl.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Nombre de la Plantilla
                        </label>
                        <input
                          type="text"
                          value={tpl.name}
                          onChange={(e) => {
                            const updated = [...templates];
                            updated[idx].name = e.target.value;
                            setTemplates(updated);
                          }}
                          className="w-full font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Rubro o Sector
                        </label>
                        <input
                          type="text"
                          value={tpl.sector}
                          onChange={(e) => {
                            const updated = [...templates];
                            updated[idx].sector = e.target.value;
                            setTemplates(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar la plantilla "${tpl.name}"?`)) {
                          setTemplates(templates.filter((_, i) => i !== idx));
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                      title="Eliminar plantilla"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Términos, Cláusulas y Condiciones Específicas
                    </label>
                    <textarea
                      rows={3}
                      value={tpl.terms}
                      onChange={(e) => {
                        const updated = [...templates];
                        updated[idx].terms = e.target.value;
                        setTemplates(updated);
                      }}
                      className="w-full font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-slate-800"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Backup and Data */}
      {activeTab === 'backup' && (
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 shadow-xs space-y-6 text-xs">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Almacenamiento y Copia de Seguridad
            </h3>
            <p className="text-slate-500 mt-0.5">
              Conozca dónde se guardan sus datos y gestione copias de seguridad locales y en la nube.
            </p>
          </div>

          {/* Architecture Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <HardDrive className="w-4 h-4 text-blue-600" />
                <span>1. Almacenamiento Local</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Toda la información operativa (datos de la empresa, catálogo de productos, clientes y cotizaciones) se almacena de forma instantánea y privada en el <strong>LocalStorage de su navegador</strong>. Funciona sin internet y permanece guardada en este equipo.
              </p>
              <div className="text-[10px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200">
                cotizapro_company_v1<br />
                cotizapro_products_v1<br />
                cotizapro_clients_v1<br />
                cotizapro_quotes_v1
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>2. Nube (Google Sheets)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Mediante el botón de <strong>Google Sheets</strong> en la barra superior, puede sincronizar y respaldar cotizaciones, partidas de ítems, directorio de clientes y el catálogo completo en una hoja de cálculo en su Google Drive.
              </p>
              <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200 font-medium">
                Pestañas: Cotizaciones, Items Cotizados, Clientes y Catálogo de Productos.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Database className="w-4 h-4 text-purple-600" />
                <span>3. Archivo Portátil (JSON)</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Puede descargar un archivo `.json` que contiene un volcado íntegro de la base de datos para transferirlo a otra computadora, guardar un respaldo en un disco externo o restaurarlo en cualquier momento.
              </p>
              <div className="text-[11px] text-purple-800 bg-purple-50 p-2 rounded border border-purple-200 font-medium">
                Ideal para copias de seguridad periódicas y migración entre equipos.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Download Backup */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                Descargar Respaldo Completo
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Genera un archivo `.json` que contiene todos sus clientes, cotizaciones históricas, catálogo de productos y datos de su empresa.
              </p>
              <button
                type="button"
                onClick={handleDownloadBackup}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Exportar Base de Datos JSON</span>
              </button>
            </div>

            {/* Restore Backup */}
            <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">
                Restaurar desde Respaldo
              </h4>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Cargue un archivo `.json` generado previamente para restaurar toda la información guardada.
              </p>
              <label className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer shadow-xs">
                <Upload className="w-4 h-4" />
                <span>Seleccionar Archivo de Respaldo</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleUploadBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Clean Slate & Reset Data Management */}
          <div className="p-6 border border-slate-200 bg-slate-50/70 rounded-xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Eraser className="w-4 h-4 text-rose-600" />
              <span>Centro de Data Limpia & Gestión de Datos</span>
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Utilice estas opciones para eliminar las cotizaciones, clientes o productos de prueba y comenzar a operar con su empresa 100% limpia.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Total Clean Slate */}
              <div className="p-4 bg-white border border-rose-200 rounded-xl space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Limpieza Total a Cero (Data Limpia)</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Elimina simultáneamente todas las cotizaciones, clientes y productos demo para comenzar su negocio con una base de datos vacía y limpia.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: '¿Limpieza Total a Cero (Data Limpia)?',
                      message: 'Esta acción eliminará simultáneamente todas las cotizaciones, clientes y catálogo de productos. Su configuración de empresa permanecerá intacta.',
                      details: `Se eliminarán: ${quotesCount} cotizaciones, ${clientsCount} clientes y ${productsCount} productos.`,
                      confirmLabel: 'Vaciar Todo (Data Limpia)',
                      variant: 'danger',
                      requireConfirmWord: 'LIMPIAR',
                      onConfirm: () => {
                        if (onClearAllCleanSlate) {
                          onClearAllCleanSlate();
                        }
                      },
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Limpiar Todo (Data Limpia)</span>
                </button>
              </div>

              {/* Restore Demo Data */}
              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>Restablecer Datos de Demostración</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Si desea explorar ejemplos o volver a cargar datos de muestra completos, puede restaurar los registros demo en cualquier momento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: '¿Restablecer datos de demostración?',
                      message: 'Se cargarán las cotizaciones, clientes y catálogo de ejemplo iniciales.',
                      confirmLabel: 'Restablecer Demostración',
                      variant: 'primary',
                      onConfirm: () => {
                        if (onRestoreDemo) {
                          onRestoreDemo();
                        } else {
                          resetToDemoData();
                          window.location.reload();
                        }
                      },
                    });
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer text-xs border border-slate-300"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Cargar Datos de Demostración</span>
                </button>
              </div>
            </div>

            {/* Granular Module Cleaning */}
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 block mb-2">
                Limpieza Selectiva por Módulo:
              </span>
              <div className="flex flex-wrap gap-2">
                {onClearQuotes && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: '¿Vaciar Historial de Cotizaciones?',
                        message: 'Se eliminarán todas las cotizaciones registradas para dejar el historial en blanco.',
                        details: `Total: ${quotesCount} cotizaciones.`,
                        confirmLabel: 'Vaciar Cotizaciones',
                        variant: 'danger',
                        requireConfirmWord: 'LIMPIAR',
                        onConfirm: onClearQuotes,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-semibold rounded-lg border border-rose-200 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar solo Cotizaciones ({quotesCount})</span>
                  </button>
                )}

                {onClearProducts && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: '¿Vaciar Catálogo de Productos?',
                        message: 'Se eliminarán todos los productos y servicios para comenzar el catálogo desde cero.',
                        details: `Total: ${productsCount} productos.`,
                        confirmLabel: 'Vaciar Catálogo',
                        variant: 'danger',
                        requireConfirmWord: 'LIMPIAR',
                        onConfirm: onClearProducts,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-semibold rounded-lg border border-rose-200 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar solo Catálogo ({productsCount})</span>
                  </button>
                )}

                {onClearClients && (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        isOpen: true,
                        title: '¿Vaciar Directorio de Clientes?',
                        message: 'Se eliminarán todos los clientes guardados en el directorio.',
                        details: `Total: ${clientsCount} clientes.`,
                        confirmLabel: 'Vaciar Clientes',
                        variant: 'danger',
                        requireConfirmWord: 'LIMPIAR',
                        onConfirm: onClearClients,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 font-semibold rounded-lg border border-rose-200 text-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Vaciar solo Clientes ({clientsCount})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Security & RUC Access */}
      {activeTab === 'security' && (
        <div className="bg-white p-6 rounded-b-xl border border-slate-200 border-t-0 shadow-xs space-y-6 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Seguridad & Control de Acceso por RUC
              </h3>
              <p className="text-slate-500 mt-0.5">
                Configure el acceso por RUC, clave de seguridad y bloqueo de pantalla para proteger la información comercial.
              </p>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Bloquear y Cerrar Sesión</span>
              </button>
            )}
          </div>

          {/* Toggle Require RUC Login */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Exigir Login con RUC al iniciar la aplicación</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Cuando esté activado, solicitará el RUC y la clave de acceso antes de permitir visualizar cotizaciones, catálogo de precios o clientes.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={localSecurity.requireRucLogin}
                onChange={(e) => {
                  const updated = { ...localSecurity, requireRucLogin: e.target.checked };
                  setLocalSecurity(updated);
                  onSaveSecurityConfig(updated);
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RUC Configuration Card */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>RUC Principal de Acceso</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Este es el RUC registrado para la empresa emisora. Se utiliza como identificación para acceder al sistema.
              </p>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-sm font-bold text-slate-800 flex items-center justify-between">
                <span>{profile.taxId || '20608421901'}</span>
                <span className="text-[10px] font-sans font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  RUC Activo
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Para modificar el RUC oficial o razón social, diríjase a la pestaña <strong>Razón Social & Identidad</strong>.
              </p>
            </div>

            {/* PIN / Password Card */}
            <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <KeyRound className="w-4 h-4 text-amber-600" />
                <span>Clave o PIN de Seguridad</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Código requerido al ingresar con el RUC. Recomendado: 4 a 8 caracteres numéricos o alfanuméricos.
              </p>
              <div className="relative">
                <input
                  type={showSecPin ? 'text' : 'password'}
                  value={localSecurity.accessPin}
                  onChange={(e) => {
                    setLocalSecurity({ ...localSecurity, accessPin: e.target.value });
                  }}
                  placeholder="PIN de acceso"
                  className="w-full pr-10 pl-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:bg-white focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSecPin(!showSecPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showSecPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSaveSecurityConfig(localSecurity);
                  setSavedSuccess(true);
                  setTimeout(() => setSavedSuccess(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Guardar Nueva Clave</span>
              </button>
            </div>
          </div>

          {/* Roles & Permissions summary */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h4 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Perfiles y Roles de Usuario Soportados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block text-xs">Administrador General</span>
                <span className="text-[11px] text-slate-500">Acceso total a cotizaciones, cartera de clientes, catálogo, ajustes fiscales, sincronización con Google Sheets y seguridad.</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="font-bold text-slate-900 block text-xs">Asesor Comercial / Ventas</span>
                <span className="text-[11px] text-slate-500">Enfocado en la creación ágil de cotizaciones, visualización del catálogo y envío de propuestas a clientes.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
