import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, FlaskConical, Smartphone, Wallet } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { OperatorMark } from "../../components/donation/donationUi";
import { usePaymentInfo, useUpdatePaymentInfo } from "../../hooks/usePaymentInfo";
import { usePaymentOptions } from "../../hooks/useDonations";
import type { PaymentInfoInput } from "../../types/settings";
import type { MobileOperator } from "../../types/donation";
import { TEST_CARDS } from "../../lib/payments/card";

const OPERATOR_FIELDS: { key: keyof PaymentInfoInput; operator: MobileOperator; label: string; placeholder: string }[] = [
  { key: "mvolaNumber", operator: "MVOLA", label: "Numéro MVola", placeholder: "034 00 000 00" },
  { key: "orangeMoneyNumber", operator: "ORANGE_MONEY", label: "Numéro Orange Money", placeholder: "032 00 000 00" },
  { key: "airtelMoneyNumber", operator: "AIRTEL_MONEY", label: "Numéro Airtel Money", placeholder: "033 00 000 00" },
];

const OUTCOME_LABELS = { success: "Accepté", declined: "Refusé", insufficient_funds: "Fonds insuffisants" } as const;
const TEST_CARD_OUTCOMES = TEST_CARDS.map((c) => ({ number: c.number, label: OUTCOME_LABELS[c.outcome] }));

const EMPTY: PaymentInfoInput = { mobileMoneyHolder: "", mvolaNumber: "", orangeMoneyNumber: "", airtelMoneyNumber: "" };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export function PaymentInfoPage() {
  const { data, isLoading } = usePaymentInfo();
  const { data: options } = usePaymentOptions();
  const updatePaymentInfo = useUpdatePaymentInfo();
  const [values, setValues] = useState<PaymentInfoInput>(EMPTY);

  useEffect(() => {
    if (data) {
      setValues({
        mobileMoneyHolder: data.mobileMoneyHolder ?? "",
        mvolaNumber: data.mvolaNumber ?? "",
        orangeMoneyNumber: data.orangeMoneyNumber ?? "",
        airtelMoneyNumber: data.airtelMoneyNumber ?? "",
      });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePaymentInfo.mutateAsync(values);
  };

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Coordonnées de paiement</h1>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
        Moyens proposés aux donateurs dans le formulaire « Faire un don ».
      </p>

      <div className="mt-6 grid max-w-4xl grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card hoverable={false} className="p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Mobile Money (Ar)
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Un opérateur sans numéro n'est pas proposé. Utilisez de préférence des comptes au nom de l'association.
          </p>

          {isLoading ? (
            <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">Chargement…</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Nom du titulaire des comptes
                </label>
                <input
                  placeholder="CLUB EXCELLENCE MADAGASCAR"
                  value={values.mobileMoneyHolder}
                  onChange={(e) => setValues((v) => ({ ...v, mobileMoneyHolder: e.target.value }))}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  Exactement tel qu'affiché par l'opérateur au moment du transfert : le donateur s'en sert pour vérifier qu'il
                  envoie au bon destinataire.
                </p>
              </div>

              {OPERATOR_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <OperatorMark operator={field.operator} size="sm" /> {field.label}
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
                <p className="text-sm text-red-600 dark:text-red-400">Une erreur est survenue. Veuillez réessayer.</p>
              )}
              {updatePaymentInfo.isSuccess && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> Coordonnées mises à jour.
                </p>
              )}

              <Button type="submit" variant="secondary" disabled={updatePaymentInfo.isPending}>
                {updatePaymentInfo.isPending ? "…" : "Enregistrer"}
              </Button>
            </form>
          )}
        </Card>

        <Card hoverable={false} className="h-fit p-6">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
            <CreditCard className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> Carte bancaire (€)
          </h2>
          {!options ? (
            <p className="mt-3 text-sm text-slate-400">Chargement…</p>
          ) : !options.card.enabled ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Désactivé : aucun prestataire de paiement configuré.</p>
          ) : options.card.simulated ? (
            <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="flex items-center gap-1.5 font-semibold">
                <FlaskConical className="h-3.5 w-3.5" /> Mode simulation
              </p>
              <p className="mt-1">
                Aucun paiement réel. Les donateurs paient avec des cartes de test. Le passage à un vrai prestataire (Stripe…) se
                configure côté serveur (<code>CARD_PAYMENT_PROVIDER</code>) ; la simulation est automatiquement désactivée en
                production.
              </p>
              <p className="mt-2.5 font-semibold">Cartes de test (expiration future, CVC quelconque) :</p>
              <ul className="mt-1 space-y-0.5">
                {TEST_CARD_OUTCOMES.map((card) => (
                  <li key={card.number} className="flex justify-between gap-2">
                    <span className="whitespace-nowrap font-mono">{card.number}</span>
                    <span className="text-right">{card.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">Actif.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
