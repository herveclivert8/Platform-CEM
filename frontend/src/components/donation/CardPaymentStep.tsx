import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { AlertCircle, Lock, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { CardBrandMark, Field, Spinner } from "./donationUi";
import { fieldClass } from "./donationConstants";
import { useCardDonation } from "../../hooks/useDonations";
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  tokenizeCard,
  validateCard,
  type CardFieldError,
} from "../../lib/payments/card";
import { formatAmount, type Currency, type DonationReceipt } from "../../types/donation";

interface CardPaymentStepProps {
  amount: number;
  currency: Currency;
  branchId?: number;
  onSuccess: (receipt: DonationReceipt, email: string) => void;
}

export function CardPaymentStep({ amount, currency, branchId, onSuccess }: CardPaymentStepProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [fieldError, setFieldError] = useState<CardFieldError>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const cardDonation = useCardDonation();

  const brand = detectCardBrand(number);
  const amountLabel = formatAmount(amount, currency);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError(null);

    const error = validateCard({ number, expiry, cvc });
    setFieldError(error);
    if (error) return;

    const token = tokenizeCard({ number, expiry, cvc });
    if (!token) {
      setPaymentError(t("donation.card_not_test"));
      return;
    }

    try {
      const receipt = await cardDonation.mutateAsync({
        branchId,
        currency,
        amount,
        donorEmail: email,
        donorName: name.trim(),
        paymentToken: token,
      });
      onSuccess(receipt, email);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setPaymentError(typeof detail === "string" ? detail : t("donation.payment_failed"));
    }
  };

  const fieldErrorMessage: Record<Exclude<CardFieldError, null>, string> = {
    number: t("donation.error_card_number"),
    expiry: t("donation.error_card_expiry"),
    cvc: t("donation.error_card_cvc"),
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Field label={t("donation.email_label")} htmlFor="card-email" hint={t("donation.email_hint_card")}>
        <input
          id="card-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("auth.email_placeholder")}
          className={fieldClass}
        />
      </Field>

      <div>
        <p className="mb-1.5 text-[13px] font-medium text-slate-700 dark:text-slate-300">{t("donation.card_details")}</p>
        <div
          className={clsx(
            "overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/15 dark:bg-slate-800",
            fieldError ? "border-red-400 dark:border-red-500/70" : "border-slate-300 dark:border-slate-700",
          )}
        >
          <div className="relative border-b border-slate-200 dark:border-slate-700">
            <input
              aria-label={t("donation.card_number")}
              required
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 1234 1234 1234"
              value={number}
              onChange={(e) => {
                setNumber(formatCardNumber(e.target.value));
                if (fieldError === "number") setFieldError(null);
              }}
              className="w-full bg-transparent py-3 pl-3.5 pr-24 font-mono text-[15px] tracking-wide text-slate-900 outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 dark:text-white"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1">
              {brand === "unknown" ? (
                <>
                  <CardBrandMark brand="visa" />
                  <CardBrandMark brand="mastercard" />
                </>
              ) : (
                <CardBrandMark brand={brand} />
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
            <input
              aria-label={t("donation.card_expiry")}
              required
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder={t("donation.card_expiry_placeholder")}
              value={expiry}
              onChange={(e) => {
                setExpiry(formatExpiry(e.target.value));
                if (fieldError === "expiry") setFieldError(null);
              }}
              className="bg-transparent px-3.5 py-3 font-mono text-[15px] text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 dark:text-white"
            />
            <input
              aria-label="CVC"
              required
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder="CVC"
              maxLength={4}
              value={cvc}
              onChange={(e) => {
                setCvc(e.target.value.replace(/\D/g, ""));
                if (fieldError === "cvc") setFieldError(null);
              }}
              className="bg-transparent px-3.5 py-3 font-mono text-[15px] text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 dark:text-white"
            />
          </div>
        </div>
        {fieldError && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{fieldErrorMessage[fieldError]}</p>
        )}
      </div>

      <Field label={t("donation.card_holder")} htmlFor="card-name">
        <input
          id="card-name"
          required
          autoComplete="cc-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("donation.card_holder_placeholder")}
          className={fieldClass}
        />
      </Field>

      {paymentError && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{paymentError}</span>
        </div>
      )}

      <div className="space-y-3">
        <Button type="submit" variant="secondary" size="lg" className="w-full justify-center" disabled={cardDonation.isPending}>
          {cardDonation.isPending ? (
            <>
              <Spinner className="h-4 w-4" /> {t("donation.processing")}
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" aria-hidden /> {t("donation.pay", { amount: amountLabel })}
            </>
          )}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {t("donation.card_security")}
        </p>
      </div>
    </form>
  );
}
