import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info, 
  WifiOff, 
  X, 
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import { ToastMessage, ConfirmDialogOptions } from '../../utils/notificationSystem';

export const UniversalToastContainer: React.FC<{ isDark?: boolean }> = ({ isDark = true }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<ToastMessage>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => [...prev.slice(-4), newToast]); // Keep max 5 toasts on screen

        if (newToast.duration && newToast.duration > 0) {
          setTimeout(() => {
            setToasts((current) => current.filter((t) => t.id !== newToast.id));
          }, newToast.duration);
        }
      }
    };

    const handleConfirm = (e: Event) => {
      const customEvent = e as CustomEvent<ConfirmDialogOptions>;
      if (customEvent.detail) {
        setConfirmDialog(customEvent.detail);
      }
    };

    window.addEventListener('akwaaba:toast', handleToast);
    window.addEventListener('akwaaba:confirm-dialog', handleConfirm);

    return () => {
      window.removeEventListener('akwaaba:toast', handleToast);
      window.removeEventListener('akwaaba:confirm-dialog', handleConfirm);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      case 'offline':
        return <WifiOff className="w-5 h-5 text-orange-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-cyan-400 shrink-0" />;
    }
  };

  const getToastBorderColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-emerald-500/40 bg-emerald-950/40 shadow-emerald-500/10';
      case 'error': return 'border-rose-500/40 bg-rose-950/40 shadow-rose-500/10';
      case 'warning': return 'border-amber-500/40 bg-amber-950/40 shadow-amber-500/10';
      case 'offline': return 'border-orange-500/40 bg-orange-950/40 shadow-orange-500/10';
      default: return 'border-cyan-500/40 bg-cyan-950/40 shadow-cyan-500/10';
    }
  };

  return (
    <>
      {/* Toast Stack - Floating Top-Right (Tablet / Desktop) or Top-Center (Mobile) */}
      <div 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
        aria-live="polite"
        role="region"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-slide-in-right ${getToastBorderColor(toast.type)} ${
              isDark ? 'bg-slate-900/90 text-white' : 'bg-white/95 text-slate-900 border-slate-300'
            }`}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0 pr-1">
              <div className="text-xs font-bold leading-tight">{toast.title}</div>
              {toast.message && (
                <div className={`text-[11px] mt-0.5 leading-snug line-clamp-3 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {toast.message}
                </div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Confirmation Modal Dialog (Zero native browser confirm()) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div 
            className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl space-y-4 animate-scale-in ${
              isDark ? 'bg-slate-900 border-slate-700/80 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${
                confirmDialog.isDestructive
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}>
                {confirmDialog.isDestructive ? <ShieldAlert className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">{confirmDialog.title}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Please confirm your operational action</p>
              </div>
            </div>

            <div className={`text-xs leading-relaxed p-3.5 rounded-xl border ${
              isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              {confirmDialog.message}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirmDialog.onCancel) confirmDialog.onCancel();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition active:scale-95 cursor-pointer ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {confirmDialog.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shadow-md cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-[#FF4500] hover:bg-[#E03E00] text-white'
                }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
