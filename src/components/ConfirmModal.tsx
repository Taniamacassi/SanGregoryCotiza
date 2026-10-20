import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Check, ShieldAlert } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  details?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  requireConfirmWord?: string; // e.g., "BORRAR" or "LIMPIAR" for destructive bulk actions
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  details,
  confirmLabel = 'Eliminar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  requireConfirmWord,
  onConfirm,
  onClose,
}) => {
  const [inputWord, setInputWord] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInputWord('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = !requireConfirmWord || inputWord.trim().toUpperCase() === requireConfirmWord.toUpperCase();

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-150 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header decoration bar */}
        <div
          className={`h-1.5 w-full ${
            variant === 'danger'
              ? 'bg-rose-500'
              : variant === 'warning'
              ? 'bg-amber-500'
              : 'bg-blue-600'
          }`}
        />

        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {variant === 'danger' ? (
                <Trash2 className="w-5 h-5" />
              ) : variant === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldAlert className="w-5 h-5" />
              )}
            </div>

            <div className="flex-1 pr-6">
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{message}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {details && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 leading-relaxed font-mono">
              {details}
            </div>
          )}

          {requireConfirmWord && (
            <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl space-y-2">
              <label className="block text-[11px] font-semibold text-rose-900">
                Escriba <strong className="font-mono underline text-rose-700">{requireConfirmWord}</strong> para confirmar:
              </label>
              <input
                type="text"
                autoFocus
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder={requireConfirmWord}
                className="w-full px-3 py-2 bg-white border border-rose-300 rounded-lg text-xs font-mono font-bold text-rose-900 uppercase focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                variant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800'
                  : variant === 'warning'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
