import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "../../ui/Button";
import { OPERATOR_LABELS, formatAmount, formatDateTime, type Donation } from "../../../types/donation";
import { Trans, useTranslation } from "react-i18next";

interface DeleteDonationDialogProps {
  donation: Donation | null;
  pending: boolean;
  onConfirm: (donation: Donation) => void;
  onCancel: () => void;
}

/**
 * Two-step confirmation: deleting a donation is irreversible, so the admin first reviews
 * which donation it is, then explicitly confirms the permanent deletion.
 */
export function DeleteDonationDialog({ donation, pending, onConfirm, onCancel }: DeleteDonationDialogProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<1 | 2>(1);

  // Back to step 1 whenever another donation is targeted
  useEffect(() => setStep(1), [donation?.id]);

  useEffect(() => {
    if (!donation) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [donation, onCancel]);

  if (!donation) return null;

  const amount = formatAmount(donation.amount, donation.currency);
  const method =
    donation.paymentMethod === "MOBILE_MONEY" && donation.mobileOperator
      ? OPERATOR_LABELS[donation.mobileOperator]
      : donation.paymentMethod === "CARD"
        ? t("admin.donations.method_card")
        : t("admin.donations.method_transfer");

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={onCancel} aria-hidden />

      <div
        key={step}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-donation-title"
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400">
            {step === 1 ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">{t("admin.donations.step", { step })}</p>
            <h2 id="delete-donation-title" className="mt-0.5 text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {step === 1 ? t("admin.donations.delete_question") : t("admin.donations.delete_final")}
            </h2>
          </div>
        </div>

        {step === 1 ? (
          <>
            <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
              <Row label={t("admin.donations.donor")} value={donation.donorName || donation.donorEmail || t("admin.donations.not_provided")} />
              <Row label={t("admin.donations.amount")} value={amount} />
              <Row label={t("admin.donations.method")} value={method} />
              {donation.transactionReference && <Row label={t("admin.donations.reference")} value={donation.transactionReference} mono />}
              <Row label={t("admin.donations.date")} value={formatDateTime(donation.createdAt)} />
            </dl>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={onCancel}>
                {t("common.cancel")}
              </Button>
              <Button variant="ghost" className="border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => setStep(2)}>
                {t("admin.donations.continue")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              <Trans
                i18nKey="admin.donations.will_be_erased"
                values={{
                  amount,
                  ref: donation.transactionReference
                    ? ` (${t("admin.donations.ref", { ref: donation.transactionReference })})`
                    : "",
                }}
                components={{
                  strong: <strong className="text-slate-900 dark:text-white" />,
                  danger: <strong className="text-red-600 dark:text-red-400" />,
                }}
              />
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={onCancel} disabled={pending}>
                {t("common.cancel")}
              </Button>
              <button
                type="button"
                autoFocus
                disabled={pending}
                onClick={() => onConfirm(donation)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> {pending ? t("admin.donations.deleting") : t("admin.donations.delete_forever")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 px-4 py-2.5">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className={`text-right font-semibold text-slate-900 dark:text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
