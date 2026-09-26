import { useEffect } from "react";
import { CheckCircle2, Info, X } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

export interface ToastMessage {
  /** Changes on every new message, so the same text shown twice restarts the timer. */
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "neutral";
}

const DURATION_MS = 5000;

/** Short feedback message, bottom-right, auto-dismissed. */
export function Toast({ toast, onClose }: { toast: ToastMessage | null; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(onClose, DURATION_MS);
    return () => clearTimeout(timeout);
  }, [toast, onClose]);

  if (!toast) return null;
  const success = toast.tone !== "neutral";

  return (
    <div
      key={toast.id}
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[110] flex w-[calc(100%-2rem)] max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl animate-fade-in-up dark:border-slate-700 dark:bg-slate-900"
    >
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          success ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
        )}
      >
        {success ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Info className="h-4.5 w-4.5" />}
      </span>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{toast.title}</p>
        {toast.description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{toast.description}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("common.close")}
        className="-mr-1 -mt-1 inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
