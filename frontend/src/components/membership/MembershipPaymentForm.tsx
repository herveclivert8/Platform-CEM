import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Banknote, CreditCard, Lock, Smartphone } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { CopyButton, Field, OperatorMark, Spinner } from "../donation/donationUi";
import { fieldClass } from "../donation/donationConstants";
import { usePaymentOptions } from "../../hooks/useDonations";
import { usePayMembership } from "../../hooks/useMembership";
import { apiErrorMessage } from "../../lib/api";
import { formatCardNumber, formatExpiry, tokenizeCard, validateCard } from "../../lib/payments/card";
import { DONATION_CURRENCIES, formatAmount, normalizeMgPhone, type Currency, type MobileOperator } from "../../types/donation";
import type { MembershipFees, MembershipPaymentKind, MembershipPaymentMethod } from "../../types/membership";

interface MembershipPaymentFormProps {
  kind: MembershipPaymentKind;
  fees: MembershipFees;
  onDone: () => void;
}

const METHOD_ICONS: Record<MembershipPaymentMethod, typeof CreditCard> = {
  CARD: CreditCard,
  MOBILE_MONEY: Smartphone,
  CASH: Banknote,
};

/** Pays the registration fee or a monthly fee: card (online), Mobile Money (declared) or cash at the branch. */
export function MembershipPaymentForm({ kind, fees, onDone }: MembershipPaymentFormProps) {
  const { t } = useTranslation();
  const { data: options } = usePaymentOptions();
  const pay = usePayMembership();
  const [currency, setCurrency] = useState<Currency>("MGA");
  const [method, setMethod] = useState<MembershipPaymentMethod>("CARD");
  const [error, setError] = useState<string | null>(null);

  // Card
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  // Mobile Money (always in ariary)
  const accounts = options?.mobileMoney.accounts ?? [];
  const [operator, setOperator] = useState<MobileOperator | null>(null);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");

  const cardEnabled = options?.card.enabled ?? false;
  const methods: MembershipPaymentMethod[] = [
    ...(cardEnabled ? (["CARD"] as const) : []),
    ...(currency === "MGA" && accounts.length > 0 ? (["MOBILE_MONEY"] as const) : []),
    "CASH",
  ];
  const activeMethod = methods.includes(method) ? method : "CASH";
  const account = accounts.find((a) => a.operator === operator) ?? accounts[0];
  const amount = fees[kind][activeMethod === "MOBILE_MONEY" ? "MGA" : currency];
  const amountLabel = formatAmount(amount, activeMethod === "MOBILE_MONEY" ? "MGA" : currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (activeMethod === "CARD") {
        if (validateCard({ number, expiry, cvc })) {
          setError(t("membership.card_invalid"));
          return;
        }
        const token = tokenizeCard({ number, expiry, cvc });
        if (!token) {
          setError(t("donation.card_not_test"));
          return;
        }
        await pay.mutateAsync({ method: "CARD", kind, currency, paymentToken: token });
      } else if (activeMethod === "MOBILE_MONEY") {
        const senderPhone = normalizeMgPhone(phone);
        if (!senderPhone) {
          setError(t("donation.error_phone"));
          return;
        }
        await pay.mutateAsync({
          method: "MOBILE_MONEY",
          kind,
          operator: account.operator,
          senderPhone,
          transactionReference: reference.replace(/\s/g, "").toUpperCase(),
        });
      } else {
        await pay.mutateAsync({ method: "CASH", kind, currency });
      }
      onDone();
    } catch (err) {
      setError(apiErrorMessage(err, t("donation.payment_failed")));
    }
  };

  const tabClass = (active: boolean) =>
    clsx(
      "flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-semibold transition-colors sm:text-sm",
      active
        ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label={t("membership.currency")}>
        <div className="grid grid-cols-3 gap-2" role="radiogroup">
          {DONATION_CURRENCIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={c === currency} onClick={() => setCurrency(c)} className={tabClass(c === currency)}>
              {formatAmount(fees[kind][c], c)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("membership.method")} hint={currency !== "MGA" ? t("membership.mobile_money_mga_only") : undefined}>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${methods.length}, minmax(0, 1fr))` }} role="radiogroup">
          {methods.map((m) => {
            const Icon = METHOD_ICONS[m];
            return (
              <button key={m} type="button" role="radio" aria-checked={m === activeMethod} onClick={() => setMethod(m)} className={tabClass(m === activeMethod)}>
                <Icon className="h-4 w-4" aria-hidden />
                {t(`membership.methods.${m}`)}
              </button>
            );
          })}
        </div>
      </Field>

      {activeMethod === "CARD" && (
        <div className="space-y-3">
          <input
            aria-label={t("donation.card_number")}
            required
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder="1234 1234 1234 1234"
            value={number}
            onChange={(e) => setNumber(formatCardNumber(e.target.value))}
            className={clsx(fieldClass, "font-mono")}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              aria-label={t("donation.card_expiry")}
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={t("donation.card_expiry_placeholder")}
              value={expiry}
              onChange={(e) => setExpiry(formatExpiry(e.target.value))}
              className={clsx(fieldClass, "font-mono")}
            />
            <input
              aria-label="CVC"
              required
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVC"
              maxLength={4}
              value={cvc}
              onChange={(e) => setCvc(e.target.value.replace(/\D/g, ""))}
              className={clsx(fieldClass, "font-mono")}
            />
          </div>
          {options?.card.simulated && <p className="text-xs text-slate-500 dark:text-slate-400">{t("membership.test_card_hint")}</p>}
        </div>
      )}

      {activeMethod === "MOBILE_MONEY" && account && (
        <div className="space-y-3">
          {accounts.length > 1 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${accounts.length}, minmax(0, 1fr))` }}>
              {accounts.map((a) => (
                <button key={a.operator} type="button" onClick={() => setOperator(a.operator)} className={tabClass(a.operator === account.operator)}>
                  <OperatorMark operator={a.operator} size="sm" />
                  <span className="truncate">{a.label}</span>
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 dark:bg-slate-800/60">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("membership.mm_send_to", { amount: amountLabel })}</p>
              <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">{account.number}</p>
            </div>
            <CopyButton value={account.number.replace(/\s/g, "")} />
          </div>
          <Field label={t("membership.mm_phone")} htmlFor="mm-phone">
            <input id="mm-phone" type="tel" required placeholder="034 12 345 67" value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </Field>
          <Field label={t("membership.mm_reference")} htmlFor="mm-ref" hint={t("membership.mm_reference_hint")}>
            <input id="mm-ref" required minLength={4} value={reference} onChange={(e) => setReference(e.target.value)} className={clsx(fieldClass, "font-mono uppercase")} />
          </Field>
        </div>
      )}

      {activeMethod === "CASH" && (
        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          {t("membership.cash_text", { amount: amountLabel })}
        </p>
      )}

      {error && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <Button type="submit" variant="secondary" className="w-full justify-center" disabled={pay.isPending}>
        {pay.isPending ? (
          <>
            <Spinner className="h-4 w-4" /> {t("donation.processing")}
          </>
        ) : activeMethod === "CARD" ? (
          <>
            <Lock className="h-4 w-4" aria-hidden /> {t("donation.pay", { amount: amountLabel })}
          </>
        ) : activeMethod === "MOBILE_MONEY" ? (
          t("membership.declare_mm")
        ) : (
          t("membership.declare_cash")
        )}
      </Button>
    </form>
  );
}
