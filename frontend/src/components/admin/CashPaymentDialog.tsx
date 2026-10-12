import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote } from "lucide-react";
import { Button } from "../ui/Button";
import { useMembershipFees, useRecordCashPayment } from "../../hooks/useMembership";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { DONATION_CURRENCIES, formatAmount, type Currency } from "../../types/donation";
import type { AdminMember, MembershipPaymentKind } from "../../types/membership";

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

/** Records cash a member handed over at the branch counter: confirmed right away. */
export function CashPaymentDialog({ member, onClose }: { member: AdminMember | null; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: fees } = useMembershipFees();
  const record = useRecordCashPayment();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [kind, setKind] = useState<MembershipPaymentKind>("REGISTRATION");
  const [currency, setCurrency] = useState<Currency>("MGA");

  // Registration fee first; once paid, the monthly fee (only for an approved member)
  const kinds: MembershipPaymentKind[] = member
    ? [...(member.registrationPaid ? [] : (["REGISTRATION"] as const)), ...(member.membershipStatus === "ACTIVE" || member.membershipStatus === "SUSPENDED" ? (["MONTHLY"] as const) : [])]
    : [];

  useEffect(() => {
    if (!member) return;
    setKind(member.registrationPaid ? "MONTHLY" : "REGISTRATION");
    setCurrency("MGA");
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [member, onClose]);

  if (!member) return null;
  const name = `${member.firstName} ${member.lastName}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    record.mutate(
      { memberId: member.id, kind, currency },
      {
        onSuccess: () => {
          showSuccess(t("admin.members.cash_recorded"), name);
          onClose();
        },
        onError: showError,
      },
    );
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={onClose} aria-hidden />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-dialog-title"
        className="relative w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
      >
        <h2 id="cash-dialog-title" className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900 dark:text-white">
          <Banknote className="h-5 w-5 text-emerald-600" aria-hidden />
          {t("admin.members.cash_title", { name })}
        </h2>
        {kinds.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.members.cash_nothing_due")}</p>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("admin.members.cash_text")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("admin.members.cash_kind")}
                <select value={kind} onChange={(e) => setKind(e.target.value as MembershipPaymentKind)} className={`${selectClass} mt-1.5`}>
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {t(`membership.kinds.${k}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("membership.currency")}
                <select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className={`${selectClass} mt-1.5`}>
                  {DONATION_CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {fees ? formatAmount(fees[kind][c], c) : c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          {kinds.length > 0 && (
            <Button type="submit" variant="secondary" disabled={record.isPending || !kinds.includes(kind)}>
              {fees ? t("admin.members.cash_submit", { amount: formatAmount(fees[kind][currency], currency) }) : "…"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
