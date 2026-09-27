import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { AlertTriangle, Bell, CheckCircle2, LogOut, X, XCircle } from "lucide-react";
import { useToastStore, type Toast } from "../../store/toastStore";
import { useLogout } from "../../hooks/useAuth";
import type { NotificationType } from "../../types/notification";

const TONES: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  info: { icon: Bell, className: "text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300" },
  success: { icon: CheckCircle2, className: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/15 dark:text-emerald-400" },
  warning: { icon: AlertTriangle, className: "text-orange-600 bg-orange-50 dark:bg-orange-500/15 dark:text-orange-400" },
  error: { icon: XCircle, className: "text-red-600 bg-red-50 dark:bg-red-500/15 dark:text-red-400" },
};

/**
 * Back-office messages, bottom-right: real-time notifications (useNotificationStream) and
 * confirmations after an action (useSuccessToast), which also offer to sign out.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  return (
    <div aria-live="polite" className="fixed bottom-5 right-5 z-[110] flex w-96 max-w-[calc(100vw-2.5rem)] flex-col gap-2.5">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const { t } = useTranslation();
  const dismiss = useToastStore((s) => s.dismiss);
  const navigate = useNavigate();
  const logout = useLogout();
  const { icon: Icon, className } = TONES[toast.tone] ?? TONES.info;

  const text = (
    <>
      <p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>
      {toast.message && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.message}</p>}
    </>
  );

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-lg animate-fade-in-up dark:border-slate-800 dark:bg-slate-900">
      <span className={clsx("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", className)}>
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {toast.actionUrl ? (
          <button
            type="button"
            className="block w-full text-left"
            onClick={() => {
              dismiss(toast.id);
              navigate(toast.actionUrl!);
            }}
          >
            {text}
          </button>
        ) : (
          <div role="status">{text}</div>
        )}
        {toast.offerLogout && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              {t("common.stay_signed_in")}
            </button>
            <button
              type="button"
              onClick={() => {
                dismiss(toast.id);
                logout();
              }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <LogOut className="h-3 w-3" aria-hidden /> {t("common.sign_out")}
            </button>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label={t("common.close")}
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
