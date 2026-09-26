import { useState } from "react";
import { isAxiosError } from "axios";
import { AlertCircle, Check, Mail, X } from "lucide-react";
import clsx from "clsx";
import { Drawer } from "../Drawer";
import { Button } from "../../ui/Button";
import { CopyButton, OperatorMark } from "../../donation/donationUi";
import { useConfirmDonation, useRejectDonation } from "../../../hooks/useAdminDonations";
import { OPERATOR_LABELS, formatAmount, formatDateTime, formatMgPhone, type Donation } from "../../../types/donation";
import { useTranslation } from "react-i18next";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

const REJECTION_REASON_KEYS = ["reason_not_found", "reason_other_number", "reason_not_received", "reason_duplicate"];

interface VerifyDonationDrawerProps {
  donation: Donation | null;
  onClose: () => void;
  /** Called with the updated donation once it has been confirmed or rejected. */
  onDone: (updated: Donation) => void;
}

export function VerifyDonationDrawer({ donation, onClose, onDone }: VerifyDonationDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer open={donation !== null} onClose={onClose} title={t("admin.donations.verify_title")}>
      {donation && <VerifyForm key={donation.id} donation={donation} onDone={onDone} />}
    </Drawer>
  );
}

function VerifyForm({ donation, onDone }: { donation: Donation; onDone: (updated: Donation) => void }) {
  const { t } = useTranslation();
  const operatorLabel = donation.mobileOperator ? OPERATOR_LABELS[donation.mobileOperator] : t("admin.donations.method_mobile");
  const declared = donation.declaredAmount ?? donation.amount;

  const [checks, setChecks] = useState([false, false, false, false]);
  const [receivedAmount, setReceivedAmount] = useState(String(declared));
  const [reference, setReference] = useState(donation.transactionReference ?? "");
  const [mode, setMode] = useState<"confirm" | "reject">("confirm");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirmDonation();
  const reject = useRejectDonation();

  const checklist = [
    t("admin.donations.check_reference", { ref: donation.transactionReference ?? "", operator: operatorLabel }),
    t("admin.donations.check_sender", { phone: formatMgPhone(donation.donorPhone) }),
    t("admin.donations.check_amount", { amount: formatAmount(Number(receivedAmount) || 0, donation.currency) }),
    t("admin.donations.check_date"),
  ];
  const allChecked = checks.every(Boolean);

  const handleConfirm = async () => {
    setError(null);
    try {
      const updated = await confirm.mutateAsync({
        id: donation.id,
        amount: Number(receivedAmount) !== donation.amount ? Number(receivedAmount) : undefined,
        transactionReference: reference !== donation.transactionReference ? reference : undefined,
      });
      onDone(updated);
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      setError(status === 409 ? t("admin.donations.ref_in_use") : t("admin.donations.confirm_failed"));
    }
  };

  const handleReject = async () => {
    setError(null);
    try {
      const updated = await reject.mutateAsync({ id: donation.id, reason: reason.trim() });
      onDone(updated);
    } catch {
      setError(t("admin.donations.reject_failed"));
    }
  };

  return (
    <div className="space-y-6">
      {/* What to look for */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          {donation.mobileOperator && <OperatorMark operator={donation.mobileOperator} />}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {donation.donorName || donation.donorEmail || t("admin.donations.donor")}
            </p>
            {donation.donorName && donation.donorEmail && (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">{donation.donorEmail}</p>
            )}
          </div>
          <p className="text-lg font-extrabold tabular-nums text-slate-900 dark:text-white">{formatAmount(declared, donation.currency)}</p>
        </div>
        <p className="px-4 pt-3 text-xs font-medium uppercase tracking-wide text-slate-400">
          {t("admin.donations.find_in_history", { operator: operatorLabel })}
        </p>
        <dl className="divide-y divide-slate-100 px-4 pb-1 text-sm dark:divide-slate-800">
          <Row label={t("admin.donations.reference")} value={donation.transactionReference} mono copy />
          <Row label={t("admin.donations.sender_number")} value={formatMgPhone(donation.donorPhone)} mono copy={donation.donorPhone ?? undefined} />
          <Row label={t("admin.donations.declared_amount_label")} value={formatAmount(declared, donation.currency)} />
          <Row label={t("admin.donations.declared_on")} value={formatDateTime(donation.createdAt)} />
        </dl>
      </div>

      {/* Mode switch */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        {(["confirm", "reject"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={clsx(
              "rounded-lg py-2 text-sm font-semibold transition-colors",
              mode === m ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400",
            )}
          >
            {m === "confirm" ? t("admin.donations.payment_found") : t("admin.donations.payment_not_found")}
          </button>
        ))}
      </div>

      {mode === "confirm" ? (
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{t("admin.donations.checks")}</legend>
            {checklist.map((label, i) => (
              <label
                key={i}
                className={clsx(
                  "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors",
                  checks[i]
                    ? "border-emerald-300 bg-emerald-50/60 text-slate-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-white"
                    : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300",
                )}
              >
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                  className="mt-0.5 h-4 w-4 accent-emerald-600"
                />
                {label}
              </label>
            ))}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.donations.received_amount")}</label>
              <input
                type="number"
                min={1}
                value={receivedAmount}
                onChange={(e) => setReceivedAmount(e.target.value)}
                className={clsx(inputClass, "tabular-nums")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.donations.reference_fix")}</label>
              <input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} className={clsx(inputClass, "font-mono")} />
            </div>
          </div>

          <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {donation.donorEmail
              ? t("admin.donations.thanks_will_be_sent", { email: donation.donorEmail })
              : t("admin.donations.no_email_future")}
          </p>

          {error && <ErrorBox message={error} />}

          <Button
            variant="secondary"
            className="w-full justify-center"
            disabled={!allChecked || !Number(receivedAmount) || !reference.trim() || confirm.isPending}
            onClick={handleConfirm}
            icon={<Check className="h-4 w-4" />}
          >
            {confirm.isPending ? "…" : t("admin.donations.confirm_button")}
          </Button>
          {!allChecked && <p className="-mt-3 text-center text-xs text-slate-400">{t("admin.donations.tick_all")}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-900 dark:text-white">{t("admin.donations.reject_reason")}</p>
            <div className="flex flex-wrap gap-2">
              {REJECTION_REASON_KEYS.map((key) => t(`admin.donations.${key}`)).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={clsx(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    reason === r
                      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                      : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300",
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("admin.donations.reason_placeholder")}
              className={clsx(inputClass, "mt-3 resize-none")}
            />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("admin.donations.reject_no_email")}</p>

          {error && <ErrorBox message={error} />}

          <button
            type="button"
            disabled={reason.trim().length < 3 || reject.isPending}
            onClick={handleReject}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" /> {reject.isPending ? "…" : t("admin.donations.reject_button")}
          </button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, mono, copy }: { label: string; value: string | null; mono?: boolean; copy?: boolean | string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="flex items-center gap-1.5">
        <span className={clsx("font-semibold text-slate-900 dark:text-white", mono && "font-mono")}>{value || "—"}</span>
        {copy && value && <CopyButton value={typeof copy === "string" ? copy : value} />}
      </dd>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {message}
    </div>
  );
}
