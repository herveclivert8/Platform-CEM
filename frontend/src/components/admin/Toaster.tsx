import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { AlertTriangle, Bell, CheckCircle2, X, XCircle } from "lucide-react";
import { useToastStore } from "../../store/toastStore";
import type { NotificationType } from "../../types/notification";

const TONES: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  info: { icon: Bell, className: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
  success: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400" },
  warning: { icon: AlertTriangle, className: "text-orange-600 bg-orange-50 dark:bg-orange-500/15 dark:text-orange-400" },
  error: { icon: XCircle, className: "text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400" },
};

/** Real-time notification toasts (fed by useNotificationStream), bottom-right of the back-office. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const navigate = useNavigate();

  return (
    <div aria-live="polite" className="fixed bottom-5 right-5 z-[110] flex w-96 max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
      {toasts.map((toast) => {
        const { icon: Icon, className } = TONES[toast.tone] ?? TONES.info;
        return (
          <div
            key={toast.id}
            className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
          >
            <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", className)}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                dismiss(toast.id);
                if (toast.actionUrl) navigate(toast.actionUrl);
              }}
            >
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>
            </button>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Fermer"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
