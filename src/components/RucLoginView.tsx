import React, { useState } from 'react';
import { CompanyProfile, RucAuthSession, SecurityConfig } from '../types';
import {
  ShieldCheck,
  Building2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';

interface Props {
  company: CompanyProfile;
  securityConfig: SecurityConfig;
  onLoginSuccess: (session: RucAuthSession) => void;
}

export const RucLoginView: React.FC<Props> = ({
  company,
  securityConfig,
  onLoginSuccess,
}) => {
  const [rucInput, setRucInput] = useState<string>(company.taxId || '20608421901');
  const [pinInput, setPinInput] = useState<string>('');
  const [userName, setUserName] = useState<string>('Administrador');
  const [role, setRole] = useState<'admin' | 'ventas'>('admin');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const cleanRuc = rucInput.replace(/\D/g, '');

  const handleQuickFill = () => {
    setRucInput(company.taxId || '20608421901');
    setPinInput(securityConfig.accessPin || '1234');
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cleanRuc.length !== 11) {
      setError('El RUC debe tener exactamente 11 dígitos numéricos.');
      return;
    }

    // Verify PIN if configured
    const expectedPin = securityConfig.accessPin || '1234';
    if (expectedPin && pinInput !== expectedPin) {
      setError(`Clave o PIN de acceso incorrecto. (PIN inicial por defecto: ${expectedPin})`);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const session: RucAuthSession = {
        ruc: cleanRuc,
        businessName: cleanRuc === company.taxId ? (company.legalName || company.name) : `Empresa RUC ${cleanRuc}`,
        userName: userName.trim() || (role === 'admin' ? 'Administrador General' : 'Asesor Comercial'),
        role,
        loginAt: new Date().toISOString(),
        rememberMe,
      };

      onLoginSuccess(session);
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-3 ring-4 ring-blue-500/20">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            CotizaPro <span className="text-blue-400 font-medium text-lg">Enterprise</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sistema de Cotizaciones & Gestión Comercial Protegido
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-6 sm:p-8 text-slate-900">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Acceso por RUC
              </h2>
              <p className="text-xs text-slate-500">
                Ingrese con el RUC de su empresa
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Lock className="w-3 h-3" />
              Seguro
            </span>
          </div>

          {/* Quick Credential Preset Suggestion */}
          <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 text-xs">
              <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-slate-800 block">
                  {company.name || 'Empresa Registrada'}
                </span>
                <span className="text-slate-500 text-[11px]">
                  RUC: <strong className="text-slate-700 font-mono">{company.taxId || '20608421901'}</strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer shrink-0 inline-flex items-center gap-1"
              title="Autocompletar con los datos de esta empresa"
            >
              <Sparkles className="w-3 h-3" />
              Autocompletar
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* RUC Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Número de RUC (11 dígitos)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  maxLength={11}
                  value={rucInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setRucInput(val);
                    if (error) setError(null);
                  }}
                  placeholder="Ej: 20608421901"
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none tracking-wider"
                  required
                />
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
                <span>{cleanRuc.length}/11 dígitos</span>
                {cleanRuc.length === 11 && (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    ✓ Formato RUC válido
                  </span>
                )}
              </div>
            </div>

            {/* PIN / Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Clave o PIN de Acceso
                </label>
                <span className="text-[10px] text-slate-400">
                  Default: <strong className="font-mono text-slate-600">{securityConfig.accessPin || '1234'}</strong>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ingrese PIN de 4 a 6 dígitos"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Profile / Role Selector */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setUserName('Administrador');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  Administrador
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Control total & Ajustes
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('ventas');
                  setUserName('Asesor Comercial');
                }}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  role === 'ventas'
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50 text-slate-700'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  Ventas / Asesor
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Cotizaciones y Catálogo
                </div>
              </button>
            </div>

            {/* Remember session checkbox */}
            <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span>Recordar sesión en este equipo</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando Credenciales...</span>
                </>
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Login Option */}
          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setRucInput(company.taxId || '20608421901');
                setPinInput(securityConfig.accessPin || '1234');
                setTimeout(() => {
                  const session: RucAuthSession = {
                    ruc: company.taxId || '20608421901',
                    businessName: company.legalName || company.name,
                    userName: 'Administrador General',
                    role: 'admin',
                    loginAt: new Date().toISOString(),
                    rememberMe: true,
                  };
                  onLoginSuccess(session);
                }, 100);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer inline-flex items-center gap-1"
            >
              <span>Acceso Rápido Directo con RUC Empresarial</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Security / Sunat Badge Footer */}
        <div className="mt-4 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-center gap-2 text-center">
          <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>
            Control de Acceso Tributario por RUC • Sesión Encriptada Localmente
          </span>
        </div>
      </div>
    </div>
  );
};
