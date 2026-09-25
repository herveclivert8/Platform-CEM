import { useState } from "react";
import { isAxiosError } from "axios";
import { AlertCircle } from "lucide-react";
import clsx from "clsx";
import { Drawer } from "../Drawer";
import { Button } from "../../ui/Button";
import { OperatorMark } from "../../donation/donationUi";
import { useBranches } from "../../../hooks/useBranches";
import { useRecordManualDonation } from "../../../hooks/useAdminDonations";
import { useAuthStore } from "../../../store/authStore";
import { OPERATOR_LABELS, normalizeMgPhone, type Donation, type MobileOperator } from "../../../types/donation";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400";

interface ManualDonationDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Branch pre-selected from the admin scope (Super Admin), if any. */
  defaultBranchId?: number;
  /** Called with the recorded (confirmed) donation. */
  onRecorded: (donation: Donation) => void;
}

export function ManualDonationDrawer({ open, onClose, defaultBranchId, onRecorded }: ManualDonationDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Enregistrer un don reçu">
      {open && <ManualDonationForm defaultBranchId={defaultBranchId} onDone={onRecorded} />}
    </Drawer>
  );
}

function ManualDonationForm({ defaultBranchId, onDone }: { defaultBranchId?: number; onDone: (donation: Donation) => void }) {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: branchesData } = useBranches();
  const record = useRecordManualDonation();

  const [branchId, setBranchId] = useState<string>(defaultBranchId ? String(defaultBranchId) : "");
  const [operator, setOperator] = useState<MobileOperator>("MVOLA");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalizedPhone = normalizeMgPhone(phone);
    if (!normalizedPhone) {
      setError("Numéro émetteur invalide (format : 034 12 345 67).");
      return;
    }
    try {
      const donation = await record.mutateAsync({
        branchId: isSuperAdmin && branchId ? Number(branchId) : undefined,
        operator,
        senderPhone: normalizedPhone,
        transactionReference: reference.replace(/\s/g, "").toUpperCase(),
        amount: Number(amount),
        donorEmail: email.trim() || undefined,
        donorName: name.trim() || undefined,
      });
      onDone(donation);
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      setError(
        status === 409
          ? "Cette référence est déjà enregistrée pour un don."
          : status === 422
            ? "Vérifiez la référence, le montant et l'email."
            : "L'enregistrement a échoué. Réessayez.",
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        Pour un paiement Mobile Money arrivé sur le compte sans que le donateur l'ait déclaré. Le don est enregistré comme
        <strong> confirmé</strong> ; si un email est renseigné, le donateur reçoit un remerciement.
      </p>

      {isSuperAdmin && (
        <div>
          <label className={labelClass}>Antenne</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
            <option value="">Don global (sans antenne)</option>
            {branchesData?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>Opérateur</label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(OPERATOR_LABELS) as MobileOperator[]).map((op) => (
            <button
              key={op}
              type="button"
              onClick={() => setOperator(op)}
              className={clsx(
                "flex items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2 text-xs font-semibold transition-colors",
                operator === op
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400",
              )}
            >
              <OperatorMark operator={op} size="sm" />
              <span className="truncate">{OPERATOR_LABELS[op]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Numéro émetteur</label>
          <input required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="034 12 345 67" className={clsx(inputClass, "font-mono")} />
        </div>
        <div>
          <label className={labelClass}>Montant reçu (Ar)</label>
          <input required type="number" min={100} value={amount} onChange={(e) => setAmount(e.target.value)} className={clsx(inputClass, "tabular-nums")} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Référence de la transaction</label>
        <input required value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} className={clsx(inputClass, "font-mono")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Email du donateur (facultatif)</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Nom (facultatif)</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
      </div>

      {error && (
        <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <Button type="submit" variant="secondary" className="w-full justify-center" disabled={record.isPending}>
        {record.isPending ? "…" : "Enregistrer le don"}
      </Button>
    </form>
  );
}
