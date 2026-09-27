import { useEffect, useState } from "react";
import { CreditCard, FlaskConical, Smartphone, Wallet } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { OperatorMark } from "../../components/donation/donationUi";
import { usePaymentInfo, useUpdatePaymentInfo } from "../../hooks/usePaymentInfo";
import { usePaymentOptions } from "../../hooks/useDonations";
import type { PaymentInfoInput } from "../../types/settings";
import { OPERATOR_LABELS, type MobileOperator } from "../../types/donation";
import { TEST_CARDS } from "../../lib/payments/card";
import { Trans, useTranslation } from "react-i18next";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { apiErrorMessage } from "../../lib/api";

const OPERATOR_FIELDS: { key: keyof PaymentInfoInput; operator: MobileOperator; placeholder: string }[] = [
  { key: "mvolaNumber", operator: "MVOLA", placeholder: "034 00 000 00" },
  { key: "orangeMoneyNumber", operator: "ORANGE_MONEY", placeholder: "032 00 000 00" },
  { key: "airtelMoneyNumber", operator: "AIRTEL_MONEY", placeholder: "033 00 000 00" },
];


const EMPTY: PaymentInfoInput = { mobileMoneyHolder: "", mvolaNumber: "", orangeMoneyNumber: "", airtelMoneyNumber: "" };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export function PaymentInfoPage() {
  const { t } = useTranslation();
  const { data, isLoading } = usePaymentInfo();
  const { data: options } = usePaymentOptions();
  const updatePaymentInfo = useUpdatePaymentInfo();
  const [values, setValues] = useState<PaymentInfoInput>(EMPTY);

  const { isDirty, markSaved } = useUnsavedChanges(values);
  const showSuccess = useSuccessToast();

  useEffect(() => {
    if (data) {
      const loaded = {
        mobileMoneyHolder: data.mobileMoneyHolder ?? "",
        mvolaNumber: data.mvolaNumber ?? "",
        orangeMoneyNumber: data.orangeMoneyNumber ?? "",
        airtelMoneyNumber: data.airtelMoneyNumber ?? "",
      };
      setValues(loaded);
      markSaved(loaded);
    }
  }, [data, markSaved]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePaymentInfo.mutateAsync(values);
    } catch {
      return; // erreur affichée sous le formulaire
    }
    markSaved(values);
    showSuccess(t("admin.donations.pi_updated"));
  };

  return (
    <div>
      <UnsavedChangesGuard when={isDirty} />
      <div className="flex items-center gap-2.5">
        <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.donations.pi_title")}</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        {t("admin.donations.pi_subtitle")}
      </p>

      <div className="mt-6 grid max-w-4xl grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card hoverable={false} className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Mobile Money (Ar)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("admin.donations.pi_mm_hint")}
          </p>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">{t("common.loading")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {t("admin.donations.pi_holder")}
                </label>
                <input
                  placeholder="CLUB EXCELLENCE MADAGASCAR"
                  value={values.mobileMoneyHolder}
                  onChange={(e) => setValues((v) => ({ ...v, mobileMoneyHolder: e.target.value }))}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  {t("admin.donations.pi_holder_hint")}
                </p>
              </div>

              {OPERATOR_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <OperatorMark operator={field.operator} size="sm" /> {t("admin.donations.pi_number", { operator: OPERATOR_LABELS[field.operator] })}
                  </label>
                  <input
                    type="tel"
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className={`${inputClass} font-mono`}
                  />
                </div>
              ))}

              {updatePaymentInfo.isError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(updatePaymentInfo.error, t("common.error_retry"))}</p>
              )}

              <Button type="submit" variant="secondary" disabled={updatePaymentInfo.isPending || !isDirty}>
                {updatePaymentInfo.isPending ? "…" : t("common.save")}
              </Button>
            </form>
          )}
        </Card>

        <Card hoverable={false} className="h-fit p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> {t("admin.donations.pi_card")}
          </h2>
          {!options ? (
            <p className="mt-3 text-sm text-slate-400">{t("common.loading")}</p>
          ) : !options.card.enabled ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("admin.donations.pi_card_disabled")}</p>
          ) : options.card.simulated ? (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-semibold">
                <FlaskConical className="h-3.5 w-3.5" /> {t("admin.donations.pi_simulation")}
              </p>
              <p className="mt-1">
                <Trans i18nKey="admin.donations.pi_simulation_text" components={{ code: <code /> }} />
              </p>
              <p className="mt-2.5 font-semibold">{t("admin.donations.pi_test_cards")}</p>
              <ul className="mt-1 space-y-0.5">
                {TEST_CARDS.map((card) => (
                  <li key={card.number} className="flex justify-between gap-2">
                    <span className="whitespace-nowrap font-mono">{card.number}</span>
                    <span className="text-right">{t(`admin.donations.pi_outcome_${card.outcome}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">{t("admin.donations.pi_active")}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
