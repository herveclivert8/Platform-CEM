import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { Button } from "../ui/Button";
import { formatAmount, type DonationReceipt } from "../../types/donation";

interface DonationSuccessProps {
  receipt: DonationReceipt;
  branchName?: string;
  /** Card only: a thank-you email is sent right away. */
  emailSentTo?: string;
  onClose: () => void;
}

export function DonationSuccess({ receipt, branchName, emailSentTo, onClose }: DonationSuccessProps) {
  const { t } = useTranslation();
  const firstName = receipt.donorName?.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col items-center py-2 text-center">
      <div className="relative mb-5">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/30" aria-hidden />
        <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
          <Heart className="h-7 w-7 fill-current" aria-hidden />
        </span>
      </div>

      <h3 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {firstName ? t("donation.thanks_name", { name: firstName }) : t("donation.thanks")}
      </h3>
      <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
        {t("donation.thanks_message", { amount: formatAmount(receipt.amount, receipt.currency) })}
      </p>

      <dl className="mt-6 w-full divide-y divide-slate-100 rounded-xl border border-slate-200 text-sm dark:divide-slate-800 dark:border-slate-700">
        <div className="flex justify-between px-4 py-2.5">
          <dt className="text-slate-500 dark:text-slate-400">{t("donation.amount_label")}</dt>
          <dd className="font-semibold tabular-nums text-slate-900 dark:text-white">{formatAmount(receipt.amount, receipt.currency)}</dd>
        </div>
        <div className="flex justify-between px-4 py-2.5">
          <dt className="text-slate-500 dark:text-slate-400">{t("donation.beneficiary")}</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">{branchName ? `CEM — ${branchName}` : "Club Excellence Madagascar"}</dd>
        </div>
        <div className="flex justify-between px-4 py-2.5">
          <dt className="text-slate-500 dark:text-slate-400">{t("donation.payment_method")}</dt>
          <dd className="font-semibold text-slate-900 dark:text-white">
            {t(receipt.paymentMethod === "CARD" ? "donation.method_card" : "donation.method_mobile")}
          </dd>
        </div>
      </dl>

      {emailSentTo && (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">{t("donation.receipt_email", { email: emailSentTo })}</p>
      )}

      <Button variant="secondary" className="mt-6 w-full justify-center" onClick={onClose}>
        {t("donation.close")}
      </Button>
    </div>
  );
}
