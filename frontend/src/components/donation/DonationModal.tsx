import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Heart, X } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { AmountStep } from "./AmountStep";
import { PRESET_AMOUNTS, type DonationMethod } from "./donationConstants";
import { CardPaymentStep } from "./CardPaymentStep";
import { MobileMoneyStep } from "./MobileMoneyStep";
import { DonationSuccess } from "./DonationSuccess";
import { Spinner } from "./donationUi";
import { usePaymentOptions } from "../../hooks/useDonations";
import { useDonationUiStore } from "../../store/donationUiStore";
import { CURRENCY_BY_METHOD, formatAmount, type DonationReceipt, type PaymentOptions } from "../../types/donation";

type Step = "amount" | "payment" | "success";
const STEPS: Step[] = ["amount", "payment", "success"];

function availableMethods(options: PaymentOptions | undefined): DonationMethod[] {
  if (!options) return [];
  const methods: DonationMethod[] = [];
  if (options.card.enabled) methods.push("CARD");
  if (options.mobileMoney.accounts.length > 0) methods.push("MOBILE_MONEY");
  return methods;
}

export function DonationModal() {
  const { t } = useTranslation();
  const { isOpen: open, branchId, branchName, close: onClose } = useDonationUiStore();
  const { data: options, isFetching, isError, refetch } = usePaymentOptions();
  const [step, setStep] = useState<Step>("amount");
  const [method, setMethod] = useState<DonationMethod | null>(null);
  const [presetAmount, setPresetAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [receipt, setReceipt] = useState<DonationReceipt | null>(null);
  const [receiptEmail, setReceiptEmail] = useState<string | undefined>(undefined);

  const methods = availableMethods(options);
  const selectedMethod = method && methods.includes(method) ? method : (methods[0] ?? null);
  const amount = customAmount
    ? Number(customAmount)
    : (presetAmount ?? (selectedMethod ? PRESET_AMOUNTS[selectedMethod][1] : 0));

  // The modal stays mounted while closed: reload the payment options each time it opens,
  // in case an admin just changed them.
  useEffect(() => {
    if (open) refetch();
  }, [open, refetch]);

  useEffect(() => {
    if (open) return;
    const timeout = setTimeout(() => {
      setStep("amount");
      setMethod(null);
      setPresetAmount(null);
      setCustomAmount("");
      setReceipt(null);
      setReceiptEmail(undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const loading = isFetching && methods.length === 0;
  const stepIndex = STEPS.indexOf(step);

  const changeMethod = (m: DonationMethod) => {
    setMethod(m);
    setPresetAmount(null);
    setCustomAmount("");
  };

  const handleSuccess = (donationReceipt: DonationReceipt, email?: string) => {
    setReceipt(donationReceipt);
    setReceiptEmail(email);
    setStep("success");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-modal-title"
        className="relative flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl animate-fade-in-up dark:bg-slate-900 sm:max-h-[calc(100dvh-2rem)] sm:max-w-[500px] sm:rounded-2xl sm:border sm:border-slate-200/80 sm:dark:border-slate-800"
      >
        {/* Header */}
        <div className="border-b border-slate-100 px-5 pb-4 pt-4 dark:border-slate-800 sm:px-6">
          <div className="flex items-center gap-3">
            {step === "payment" ? (
              <button
                type="button"
                onClick={() => setStep("amount")}
                aria-label={t("donation.back")}
                className="-ml-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400">
                <Heart className="h-4 w-4" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <h2 id="donation-modal-title" className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {t("donation.title")}
              </h2>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {branchName ? t("donation.for_branch", { branch: branchName }) : "Club Excellence Madagascar"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("donation.close")}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Progress */}
          {selectedMethod && (
            <ol className="mt-4 grid grid-cols-3 gap-2" aria-label={t("donation.progress")}>
              {STEPS.map((s, i) => (
                <li key={s}>
                  <span
                    className={clsx(
                      "block h-1 rounded-full transition-colors duration-300",
                      i <= stepIndex ? "bg-emerald-600" : "bg-slate-200 dark:bg-slate-700",
                    )}
                  />
                  <span
                    className={clsx(
                      "mt-1.5 block text-[11px] font-medium",
                      i === stepIndex ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500",
                    )}
                    aria-current={i === stepIndex ? "step" : undefined}
                  >
                    {t(`donation.step_${s}`)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Order summary (payment step) */}
        {step === "payment" && selectedMethod && (
          <div className="flex items-center justify-between gap-3 bg-slate-50 px-5 py-3 dark:bg-slate-800/50 sm:px-6">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("donation.your_donation")}</p>
              <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                {branchName ? `CEM — ${branchName}` : "Club Excellence Madagascar"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {formatAmount(amount, CURRENCY_BY_METHOD[selectedMethod])}
              </p>
              <button
                type="button"
                onClick={() => setStep("amount")}
                className="text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {t("donation.edit")}
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div key={step} className="overflow-y-auto px-5 py-6 animate-fade-in-up sm:px-6">
          {loading && (
            <div className="flex justify-center py-10 text-slate-400">
              <Spinner className="h-6 w-6" />
            </div>
          )}

          {!loading && !selectedMethod && (
            <div className="space-y-4 py-4 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {isError ? t("donation.load_error") : t("donation.unavailable")}
              </p>
              {isError && (
                <Button variant="ghost" onClick={() => refetch()}>
                  {t("donation.retry")}
                </Button>
              )}
            </div>
          )}

          {!loading && options && selectedMethod && step === "amount" && (
            <AmountStep
              options={options}
              methods={methods}
              method={selectedMethod}
              onMethodChange={changeMethod}
              amount={amount}
              customAmount={customAmount}
              onPresetChange={(value) => {
                setPresetAmount(value);
                setCustomAmount("");
              }}
              onCustomAmountChange={setCustomAmount}
              onContinue={() => setStep("payment")}
            />
          )}

          {options && step === "payment" && selectedMethod === "CARD" && (
            <CardPaymentStep
              amount={amount}
              branchId={branchId}
              onSuccess={(r, email) => handleSuccess(r, email)}
            />
          )}

          {options && step === "payment" && selectedMethod === "MOBILE_MONEY" && (
            <MobileMoneyStep amount={amount} branchId={branchId} options={options.mobileMoney} onSuccess={(r) => handleSuccess(r)} />
          )}

          {step === "success" && receipt && (
            <DonationSuccess receipt={receipt} branchName={branchName} emailSentTo={receiptEmail} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
