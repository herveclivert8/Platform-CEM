import { useTranslation } from "react-i18next";
import { Landmark } from "lucide-react";
import { CopyButton } from "./donationUi";
import { formatAmount, type BankTransferAccount, type Currency } from "../../types/donation";

/**
 * Bank account (RIB) set by the Super Admin, with copy buttons, shown to donors and members who
 * pay by transfer. The transfer is then recorded by an admin once it reaches the account.
 */
export function BankAccountDetails({
  account,
  amount,
  currency,
}: {
  account: BankTransferAccount;
  /** Amount to transfer, shown with a copy button when given */
  amount?: number;
  currency?: Currency;
}) {
  const { t } = useTranslation();
  const rows: { label: string; value: string; mono?: boolean }[] = [
    account.accountNumber && { label: t("donation.bank_account_number"), value: account.accountNumber, mono: true },
    account.iban && { label: t("donation.bank_iban"), value: account.iban, mono: true },
    account.swift && { label: t("donation.bank_swift"), value: account.swift, mono: true },
  ].filter((row): row is { label: string; value: string; mono: boolean } => Boolean(row));

  return (
    <div className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Landmark className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{account.bankName || t("donation.method_transfer")}</p>
          {account.holder && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.holder}</p>}
        </div>
      </div>
      <dl className="divide-y divide-slate-100 dark:divide-slate-700">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{row.label}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              <span className="break-all font-mono text-sm font-bold tracking-wide text-slate-900 dark:text-white">{row.value}</span>
              <CopyButton value={row.value.replace(/\s/g, "")} />
            </dd>
          </div>
        ))}
        {amount !== undefined && currency && (
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <dt className="text-xs text-slate-500 dark:text-slate-400">{t("donation.amount_to_transfer")}</dt>
            <dd className="flex items-center gap-2">
              <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{formatAmount(amount, currency)}</span>
              <CopyButton value={String(amount)} />
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
