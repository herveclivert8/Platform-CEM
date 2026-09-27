import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

interface RejectDialogProps {
  open: boolean;
  projectTitle: string;
  isPending: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/** Refusal needs a reason: it is sent to the branch admin in their notification. */
export function RejectDialog({ open, projectTitle, isPending, onConfirm, onCancel }: RejectDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const trimmed = reason.trim();

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={onCancel} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 id="reject-dialog-title" className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          {t("admin.projects.reject_title", { title: projectTitle })}
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {t("admin.projects.reject_text")}
        </p>
        <textarea
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder={t("admin.projects.reject_placeholder")}
          className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-red-500 focus:ring-2 focus:ring-red-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="ghost" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-red-600 font-semibold text-white hover:bg-red-700"
            disabled={trimmed.length < 3 || isPending}
            onClick={() => onConfirm(trimmed)}
          >
            {isPending ? "…" : t("admin.projects.reject")}
          </Button>
        </div>
      </div>
    </div>
  );
}
