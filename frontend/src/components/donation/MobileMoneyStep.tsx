import { useState } from "react";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { AlertCircle, ShieldAlert } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { CopyButton, Field, OperatorMark, Spinner } from "./donationUi";
import { fieldClass, fieldErrorClass, operatorAccent } from "./donationConstants";
import { useDeclareMobileMoneyDonation } from "../../hooks/useDonations";
import {
  formatAmount,
  normalizeMgPhone,
  type DonationReceipt,
  type MobileOperator,
  type PaymentOptions,
} from "../../types/donation";

interface MobileMoneyStepProps {
  amount: number;
  branchId?: number;
  options: PaymentOptions["mobileMoney"];
  onSuccess: (receipt: DonationReceipt) => void;
}

type FieldName = "phone" | "reference" | "amount";

export function MobileMoneyStep({ amount, branchId, options, onSuccess }: MobileMoneyStepProps) {
  const { t } = useTranslation();
  const [operator, setOperator] = useState<MobileOperator>(options.accounts[0].operator);
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [sentAmount, setSentAmount] = useState(String(amount));
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const declare = useDeclareMobileMoneyDonation();

  const account = options.accounts.find((a) => a.operator === operator) ?? options.accounts[0];
  const holder = options.holder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const normalizedPhone = normalizeMgPhone(phone);
    const cleanReference = reference.replace(/\s/g, "").toUpperCase();
    const amountValue = Number(sentAmount);
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!normalizedPhone) nextErrors.phone = t("donation.error_phone");
    if (cleanReference.length < 4) nextErrors.reference = t("donation.error_reference");
    if (!amountValue || amountValue < 100) nextErrors.amount = t("donation.minimum_amount", { amount: formatAmount(100, "MGA") });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !normalizedPhone) return;

    try {
      const receipt = await declare.mutateAsync({
        branchId,
        operator,
        senderPhone: normalizedPhone,
        transactionReference: cleanReference,
        amount: amountValue,
        donorEmail: email,
        donorName: name.trim(),
      });
      onSuccess(receipt);
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      if (status === 409) setErrors({ reference: t("donation.error_reference_used") });
      else setSubmitError(t("donation.error"));
    }
  };

  const clearError = (field: FieldName) => errors[field] && setErrors((e) => ({ ...e, [field]: undefined }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Send the money */}
      <section>
        <StepHeading index={1} title={t("donation.mm_send_title", { amount: formatAmount(amount, "MGA") })} />

        {options.accounts.length > 1 && (
          <div role="tablist" className="mb-3 grid gap-2" style={{ gridTemplateColumns: `repeat(${options.accounts.length}, minmax(0, 1fr))` }}>
            {options.accounts.map((a) => (
              <button
                key={a.operator}
                type="button"
                role="tab"
                aria-selected={a.operator === operator}
                onClick={() => setOperator(a.operator)}
                className={clsx(
                  "flex items-center justify-center gap-2 rounded-xl border-2 px-2 py-2 text-xs font-semibold transition-all sm:text-[13px]",
                  a.operator === operator
                    ? clsx(operatorAccent(a.operator), "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white")
                    : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
                )}
              >
                <OperatorMark operator={a.operator} size="sm" />
                <span className="truncate">{a.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className={clsx("overflow-hidden rounded-xl border-2 bg-white dark:bg-slate-800/60", operatorAccent(account.operator))}>
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <OperatorMark operator={account.operator} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{account.label}</p>
              {holder && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{holder}</p>}
            </div>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-700">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t("donation.mm_number")}</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold tracking-wide text-slate-900 dark:text-white">{account.number}</span>
                <CopyButton value={account.number.replace(/\s/g, "")} />
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <dt className="text-xs text-slate-500 dark:text-slate-400">{t("donation.amount_to_send")}</dt>
              <dd className="flex items-center gap-2">
                <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{formatAmount(amount, "MGA")}</span>
                <CopyButton value={String(amount)} />
              </dd>
            </div>
          </dl>
        </div>

        {holder && (
          <p className="mt-2.5 flex gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
            <ShieldAlert className="mt-px h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />
            <span>
              {t("donation.mm_check_name_before")} <strong className="text-slate-900 dark:text-white">« {holder} »</strong>{" "}
              {t("donation.mm_check_name_after")}
            </span>
          </p>
        )}
      </section>

      {/* 2. Declare the payment */}
      <section className="space-y-4">
        <StepHeading index={2} title={t("donation.mm_declare_title")} subtitle={t("donation.mm_declare_subtitle")} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("donation.mm_sender_phone")} htmlFor="mm-phone" error={errors.phone}>
            <input
              id="mm-phone"
              type="tel"
              required
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                clearError("phone");
              }}
              placeholder="034 12 345 67"
              className={clsx(fieldClass, "font-mono placeholder:font-sans", errors.phone && fieldErrorClass)}
            />
          </Field>
          <Field label={t("donation.mm_sent_amount")} htmlFor="mm-amount" error={errors.amount}>
            <div className="relative">
              <input
                id="mm-amount"
                type="number"
                required
                min={100}
                inputMode="numeric"
                value={sentAmount}
                onChange={(e) => {
                  setSentAmount(e.target.value);
                  clearError("amount");
                }}
                className={clsx(fieldClass, "pr-10 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none", errors.amount && fieldErrorClass)}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-sm font-semibold text-slate-400">Ar</span>
            </div>
          </Field>
        </div>

        <Field
          label={t("donation.mm_reference")}
          htmlFor="mm-reference"
          error={errors.reference}
          hint={t("donation.mm_reference_hint", { operator: account.label })}
        >
          <input
            id="mm-reference"
            required
            autoComplete="off"
            spellCheck={false}
            value={reference}
            onChange={(e) => {
              setReference(e.target.value);
              clearError("reference");
            }}
            placeholder={t("donation.mm_reference_placeholder")}
            className={clsx(fieldClass, "font-mono uppercase placeholder:font-sans placeholder:normal-case", errors.reference && fieldErrorClass)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={t("donation.email_label")} htmlFor="mm-email">
            <input
              id="mm-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              className={fieldClass}
            />
          </Field>
          <Field label={t("donation.name_label")} htmlFor="mm-name" optional>
            <input
              id="mm-name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </Field>
        </div>
      </section>

      {submitError && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{submitError}</span>
        </div>
      )}

      <Button type="submit" variant="secondary" size="lg" className="w-full justify-center" disabled={declare.isPending}>
        {declare.isPending ? (
          <>
            <Spinner className="h-4 w-4" /> {t("donation.processing")}
          </>
        ) : (
          t("donation.mm_submit")
        )}
      </Button>
    </form>
  );
}

function StepHeading({ index, title, subtitle }: { index: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-3 flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-white dark:text-slate-900">
        {index}
      </span>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
