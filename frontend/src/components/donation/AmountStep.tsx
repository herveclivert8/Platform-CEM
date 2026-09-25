import { useTranslation } from "react-i18next";
import { BookOpen, CreditCard, Lock, Smartphone } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { CardBrandMark, OperatorMark } from "./donationUi";
import { POPULAR_INDEX, PRESET_AMOUNTS, PRICE_PER_BOOK, fieldClass, type DonationMethod } from "./donationConstants";
import { CURRENCY_BY_METHOD, formatAmount, type PaymentOptions } from "../../types/donation";

interface AmountStepProps {
  options: PaymentOptions;
  methods: DonationMethod[];
  method: DonationMethod;
  onMethodChange: (method: DonationMethod) => void;
  amount: number;
  customAmount: string;
  onPresetChange: (amount: number) => void;
  onCustomAmountChange: (value: string) => void;
  onContinue: () => void;
}

export function AmountStep({
  options,
  methods,
  method,
  onMethodChange,
  amount,
  customAmount,
  onPresetChange,
  onCustomAmountChange,
  onContinue,
}: AmountStepProps) {
  const { t } = useTranslation();
  const currency = CURRENCY_BY_METHOD[method];
  const minimum = method === "CARD" ? 1 : 100;
  const valid = amount >= minimum;
  const books = Math.max(1, Math.round(amount / PRICE_PER_BOOK[method]));

  return (
    <div className="space-y-6">
      {methods.length > 1 && (
        <fieldset>
          <legend className="mb-2.5 text-[13px] font-semibold text-slate-900 dark:text-white">{t("donation.method_title")}</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {methods.map((m) => {
              const active = m === method;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => onMethodChange(m)}
                  aria-pressed={active}
                  className={clsx(
                    "relative flex flex-col items-start gap-2 rounded-xl border-2 p-3.5 text-left transition-all",
                    active
                      ? "border-emerald-600 bg-emerald-50/60 shadow-sm dark:border-emerald-500 dark:bg-emerald-500/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600",
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    {m === "CARD" ? (
                      <CreditCard className="h-4 w-4 text-slate-500" aria-hidden />
                    ) : (
                      <Smartphone className="h-4 w-4 text-slate-500" aria-hidden />
                    )}
                    {t(m === "CARD" ? "donation.method_card" : "donation.method_mobile")}
                  </span>
                  <span className="flex items-center gap-1">
                    {m === "CARD" ? (
                      <>
                        <CardBrandMark brand="visa" />
                        <CardBrandMark brand="mastercard" />
                      </>
                    ) : (
                      options.mobileMoney.accounts.map((a) => <OperatorMark key={a.operator} operator={a.operator} size="sm" />)
                    )}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {t(m === "CARD" ? "donation.method_card_hint" : "donation.method_mobile_hint")}
                  </span>
                  <span
                    className={clsx(
                      "absolute right-3 top-3 h-4 w-4 rounded-full border-2 transition-colors",
                      active ? "border-emerald-600 bg-emerald-600 shadow-[inset_0_0_0_2px_white] dark:shadow-[inset_0_0_0_2px_#0f172a]" : "border-slate-300 dark:border-slate-600",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2.5 text-[13px] font-semibold text-slate-900 dark:text-white">{t("donation.step1_title")}</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {PRESET_AMOUNTS[method].map((preset, i) => {
            const active = !customAmount && amount === preset;
            return (
              <button
                key={preset}
                type="button"
                onClick={() => onPresetChange(preset)}
                aria-pressed={active}
                className={clsx(
                  "relative rounded-xl border-2 px-2 py-3.5 text-[15px] font-bold tabular-nums transition-all",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                    : "border-slate-200 text-slate-800 hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-slate-700 dark:text-slate-100 dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/5",
                )}
              >
                {i === POPULAR_INDEX && (
                  <span
                    className={clsx(
                      "absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      active ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
                    )}
                  >
                    {t("donation.popular")}
                  </span>
                )}
                {formatAmount(preset, currency)}
              </button>
            );
          })}
        </div>

        <div className="relative mt-2.5">
          <input
            type="number"
            inputMode="decimal"
            min={minimum}
            step={method === "CARD" ? "0.01" : "100"}
            aria-label={t("donation.custom_amount")}
            placeholder={t("donation.custom_amount")}
            value={customAmount}
            onChange={(e) => onCustomAmountChange(e.target.value)}
            className={clsx(fieldClass, "pr-12 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none")}
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-slate-400">
            {currency === "MGA" ? "Ar" : "€"}
          </span>
        </div>
        {customAmount && !valid && (
          <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">
            {t("donation.minimum_amount", { amount: formatAmount(minimum, currency) })}
          </p>
        )}
      </fieldset>

      {valid && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300">
            <BookOpen className="h-4 w-4" aria-hidden />
          </span>
          <span>
            {t("donation.impact", { amount: formatAmount(amount, currency) })} <strong>{books}</strong> {t("donation.impact_books")}
          </span>
        </div>
      )}

      <div className="space-y-3">
        <Button variant="secondary" size="lg" className="w-full justify-center" disabled={!valid} onClick={onContinue}>
          {valid ? t("donation.continue_with", { amount: formatAmount(amount, currency) }) : t("donation.continue")}
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Lock className="h-3 w-3" aria-hidden /> {t("donation.trust_line")}
        </p>
      </div>
    </div>
  );
}
