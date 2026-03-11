import { useUIStore } from '../../stores';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { ToastType } from '../../types';

const toastStyles: Record<ToastType, { bg: string; border: string; icon: typeof CheckCircle2; iconColor: string }> = {
  success: { bg: 'bg-success-500/10', border: 'border-success-500/30', icon: CheckCircle2, iconColor: 'text-success-400' },
  error: { bg: 'bg-danger-500/10', border: 'border-danger-500/30', icon: AlertCircle, iconColor: 'text-danger-400' },
  warning: { bg: 'bg-warning-500/10', border: 'border-warning-500/30', icon: AlertTriangle, iconColor: 'text-warning-400' },
  info: { bg: 'bg-primary-500/10', border: 'border-primary-500/30', icon: Info, iconColor: 'text-primary-400' },
};

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const style = toastStyles[toast.type];
        const Icon = style.icon;
        return (
          <div
            key={toast.id}
            className={`
              flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
              ${style.bg} ${style.border}
              shadow-lg animate-fade-in
            `}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.iconColor}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-surface-100">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-surface-400 mt-0.5">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-surface-500 hover:text-surface-300 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
