import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, BookOpen, Heart, CheckCircle2 } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { useCreateDonation } from "../../hooks/useDonations";
import { useDonationUiStore } from "../../store/donationUiStore";

const PRESET_AMOUNTS = [10, 20, 50, 100];
const EUR_PER_BOOK = 2;

export function DonationModal() {
  const { t } = useTranslation();
  const { isOpen: open, branchId, branchName, close: onClose } = useDonationUiStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number>(20);
  const [customAmount, setCustomAmount] = useState("");
  const [email, setEmail] = useState("");
  const createDonation = useCreateDonation();

  useEffect(() => {
    if (!open) {
      const timeout = setTimeout(() => {
        setStep(1);
        setAmount(20);
        setCustomAmount("");
        setEmail("");
        createDonation.reset();
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const effectiveAmount = customAmount ? Number(customAmount) : amount;
  const impactBooks = Math.max(1, Math.round(effectiveAmount / EUR_PER_BOOK));

  const handleConfirm = async () => {
    await createDonation.mutateAsync({
      branchId,
      amount: effectiveAmount,
      donorEmail: email,
    });
    setStep(3);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-modal-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <h2 id="donation-modal-title" className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            <Heart className="h-5 w-5 text-orange-600" aria-hidden />
            {t("donation.title")}
            {branchName && (
              <span className="text-sm font-normal text-slate-400">— {branchName}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("donation.close") ?? "Fermer"}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <div className="space-y-5 animate-fade-in-up">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("donation.step1_title")}
              </p>
              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setAmount(preset);
                      setCustomAmount("");
                    }}
                    className={clsx(
                      "rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5",
                      !customAmount && amount === preset
                        ? "border-orange-600 bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
                        : "border-slate-200 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300",
                    )}
                  >
                    {preset}€
                  </button>
                ))}
              </div>
              <input
                type="number"
                min={1}
                placeholder={t("donation.custom_amount") ?? ""}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                <BookOpen className="h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {effectiveAmount || 0}€ {t("donation.impact_prefix")}{" "}
                  <strong>{impactBooks}</strong> {t("donation.impact_books")}
                </span>
              </div>

              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={!effectiveAmount || effectiveAmount <= 0}
                onClick={() => setStep(2)}
              >
                {t("donation.confirm")}
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-fade-in-up">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("donation.step2_title")}
              </p>
              <div>
                <label htmlFor="donor-email" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("donation.email_label")}
                </label>
                <input
                  id="donor-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {createDonation.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  Une erreur est survenue. Merci de réessayer.
                </p>
              )}

              <Button
                variant="primary"
                className="w-full justify-center"
                disabled={!email || createDonation.isPending}
                onClick={handleConfirm}
              >
                {createDonation.isPending ? "…" : t("donation.confirm")}
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center gap-3 py-4 text-center animate-fade-in-up">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <CheckCircle2 className="h-8 w-8" aria-hidden />
              </span>
              <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                {t("donation.step3_title")}
              </h3>
              <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
                {t("donation.success_message")}
              </p>
              <Button variant="ghost" onClick={onClose} className="mt-2">
                {t("donation.close")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
