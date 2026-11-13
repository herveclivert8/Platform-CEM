import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import { Button } from "../ui/Button";
import { BankAccountDetails } from "./BankAccountDetails";
import type { BankTransferAccount, Currency } from "../../types/donation";

/**
 * Donation by bank transfer: the donor makes the transfer from their bank. Nothing is sent from
 * the site; an admin records the donation once the transfer reaches the account.
 */
export function BankTransferStep({
  account,
  amount,
  currency,
  onClose,
}: {
  account: BankTransferAccount;
  amount: number;
  currency: Currency;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300">{t("donation.transfer_intro")}</p>
      <BankAccountDetails account={account} amount={amount} currency={currency} />
      <p className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        <Info className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <span>{t("donation.transfer_after")}</span>
      </p>
      <Button type="button" variant="secondary" className="w-full justify-center" onClick={onClose}>
        {t("donation.transfer_done")}
      </Button>
    </div>
  );
}
