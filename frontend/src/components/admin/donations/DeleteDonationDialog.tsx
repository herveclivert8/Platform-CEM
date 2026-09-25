import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "../../ui/Button";
import { OPERATOR_LABELS, formatAmount, formatDateTime, type Donation } from "../../../types/donation";

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
        ? "Carte bancaire"
        : "Virement (ancien)";

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
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">Étape {step} sur 2</p>
            <h2 id="delete-donation-title" className="mt-0.5 text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {step === 1 ? "Supprimer ce don ?" : "Confirmer la suppression définitive"}
            </h2>
          </div>
        </div>

        {step === 1 ? (
          <>
            <dl className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
              <Row label="Donateur" value={donation.donorName || donation.donorEmail || "Non renseigné"} />
              <Row label="Montant" value={amount} />
              <Row label="Moyen" value={method} />
              {donation.transactionReference && <Row label="Référence" value={donation.transactionReference} mono />}
              <Row label="Date" value={formatDateTime(donation.createdAt)} />
            </dl>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={onCancel}>
                Annuler
              </Button>
              <Button variant="ghost" className="border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => setStep(2)}>
                Continuer
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Le don de <strong className="text-slate-900 dark:text-white">{amount}</strong>
              {donation.transactionReference && (
                <>
                  {" "}
                  (réf. <span className="font-mono">{donation.transactionReference}</span>)
                </>
              )}{" "}
              sera effacé. <strong className="text-red-600 dark:text-red-400">Cette action est irréversible.</strong>
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <Button variant="ghost" onClick={onCancel} disabled={pending}>
                Annuler
              </Button>
              <button
                type="button"
                autoFocus
                disabled={pending}
                onClick={() => onConfirm(donation)}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" /> {pending ? "Suppression…" : "Oui, supprimer définitivement"}
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
