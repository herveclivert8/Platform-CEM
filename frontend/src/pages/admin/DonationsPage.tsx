import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, Landmark, MailCheck, Plus, RotateCcw, Search, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { OperatorMark } from "../../components/donation/donationUi";
import { VerifyDonationDrawer } from "../../components/admin/donations/VerifyDonationDrawer";
import { ManualDonationDrawer } from "../../components/admin/donations/ManualDonationDrawer";
import { DeleteDonationDialog } from "../../components/admin/donations/DeleteDonationDialog";
import { Toast, type ToastMessage } from "../../components/ui/Toast";
import { useAdminDonations, useDeleteDonation, useReopenDonation } from "../../hooks/useAdminDonations";
import { useBranches } from "../../hooks/useBranches";
import { useAdminScopeStore } from "../../store/adminScopeStore";
import { useAuthStore } from "../../store/authStore";
import {
  OPERATOR_LABELS,
  formatAmount,
  formatConfirmedTotals,
  formatDateTime,
  formatMgPhone,
  type Donation,
  type DonationStatus,
} from "../../types/donation";

type Filter = DonationStatus | "ALL";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "PENDING", label: "À vérifier" },
  { value: "CONFIRMED", label: "Confirmés" },
  { value: "REJECTED", label: "Rejetés" },
  { value: "ALL", label: "Tous" },
];

const STATUS_BADGE: Record<DonationStatus, { label: string; tone: "orange" | "emerald" | "slate" }> = {
  PENDING: { label: "À vérifier", tone: "orange" },
  CONFIRMED: { label: "Confirmé", tone: "emerald" },
  REJECTED: { label: "Rejeté", tone: "slate" },
};

function methodLabel(d: Donation): string {
  if (d.paymentMethod === "CARD") return "Carte bancaire";
  if (d.paymentMethod === "MOBILE_MONEY") return d.mobileOperator ? OPERATOR_LABELS[d.mobileOperator] : "Mobile Money";
  return "Virement (ancien)";
}

export function DonationsPage() {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  const { data: donations, isLoading } = useAdminDonations();
  const { data: branchesData } = useBranches();
  const reopen = useReopenDonation();
  const deleteDonation = useDeleteDonation();
  const [filter, setFilter] = useState<Filter>("PENDING");
  const [search, setSearch] = useState("");
  const [verifying, setVerifying] = useState<Donation | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [deleting, setDeleting] = useState<Donation | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = (title: string, description?: string, tone: ToastMessage["tone"] = "success") =>
    setToast({ id: Date.now(), title, description, tone });
  const closeToast = useCallback(() => setToast(null), []);
  const closeDeleteDialog = useCallback(() => setDeleting(null), []);

  const thankYouNote = (d: Donation) =>
    d.donorEmail ? `Un email de remerciement va être envoyé à ${d.donorEmail}.` : "Aucun email envoyé : pas d'adresse renseignée.";

  const branchName = (branchId: number | null) =>
    branchId ? (branchesData?.items.find((b) => b.id === branchId)?.cityName ?? `#${branchId}`) : "Don global";

  // Global donations (no branch) can only be handled by the Super Admin (enforced server-side too).
  const hasAccess = (d: Donation) => user?.role === "SUPER_ADMIN" || d.branchId !== null;
  const canManage = (d: Donation) => hasAccess(d) && d.paymentMethod === "MOBILE_MONEY";
  // Only never-validated donations can be deleted: a confirmed one is money actually received.
  const canDelete = (d: Donation) => hasAccess(d) && d.status !== "CONFIRMED";

  const counts = useMemo(() => {
    const byStatus: Record<Filter, number> = { PENDING: 0, CONFIRMED: 0, REJECTED: 0, ALL: donations?.length ?? 0 };
    for (const d of donations ?? []) byStatus[d.status] += 1;
    return byStatus;
  }, [donations]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase().replace(/\s/g, "");
    return (donations ?? []).filter((d) => {
      if (filter !== "ALL" && d.status !== filter) return false;
      if (!q) return true;
      return [d.transactionReference, d.donorPhone, d.donorEmail, d.donorName]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().replace(/\s/g, "").includes(q));
    });
  }, [donations, filter, search]);

  const handleReopen = (d: Donation) => {
    if (!window.confirm("Remettre ce don « à vérifier » ?")) return;
    reopen.mutate(d.id, {
      onSuccess: () => notify("Don remis à vérifier", `${formatAmount(d.amount, d.currency)} — à revalider ou rejeter.`, "neutral"),
    });
  };

  const handleVerified = (updated: Donation) => {
    setVerifying(null);
    if (updated.status === "CONFIRMED") {
      notify(`Don de ${formatAmount(updated.amount, updated.currency)} confirmé`, thankYouNote(updated));
    } else {
      notify("Don rejeté", updated.rejectionReason ?? undefined, "neutral");
    }
  };

  const handleRecorded = (donation: Donation) => {
    setManualOpen(false);
    notify(`Don de ${formatAmount(donation.amount, donation.currency)} enregistré et confirmé`, thankYouNote(donation));
  };

  const handleDelete = (d: Donation) => {
    deleteDonation.mutate(d.id, {
      onSuccess: () => {
        setDeleting(null);
        notify("Don supprimé", `${formatAmount(d.amount, d.currency)}${d.transactionReference ? ` — réf. ${d.transactionReference}` : ""}`, "neutral");
      },
      onError: () => {
        setDeleting(null);
        notify("Suppression impossible", "Le don a peut-être été confirmé entre-temps. Actualisez la page.", "neutral");
      },
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dons</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            Les dons par carte sont confirmés automatiquement. Les dons Mobile Money déclarés sont à vérifier dans
            l'historique du compte avant validation.
          </p>
        </div>
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setManualOpen(true)}>
          Enregistrer un don reçu
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card hoverable={false} className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total confirmé</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
            {isLoading ? "…" : formatConfirmedTotals(donations)}
          </p>
        </Card>
        <Card hoverable={false} className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dons confirmés</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-white">{counts.CONFIRMED}</p>
        </Card>
        <button
          type="button"
          onClick={() => setFilter("PENDING")}
          className={clsx(
            "rounded-2xl border p-4 text-left transition-colors",
            counts.PENDING > 0
              ? "border-orange-200 bg-orange-50 hover:bg-orange-100/70 dark:border-orange-500/30 dark:bg-orange-500/10"
              : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
          )}
        >
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">À vérifier</p>
          <p
            className={clsx(
              "mt-1 text-xl font-extrabold tabular-nums tracking-tight",
              counts.PENDING > 0 ? "text-orange-600 dark:text-orange-400" : "text-slate-900 dark:text-white",
            )}
          >
            {counts.PENDING}
          </p>
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
                filter === f.value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
              )}
            >
              {f.label} <span className="ml-0.5 opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Référence, numéro, email…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-10 flex flex-col items-center text-center">
          <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-600" />
          <p className="mt-2 text-sm text-slate-400 dark:text-slate-500">
            {filter === "PENDING" && !search ? "Aucun don à vérifier. Tout est à jour !" : "Aucun don dans cette catégorie."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          {visible.map((d) => {
            const badge = STATUS_BADGE[d.status];
            const corrected = d.declaredAmount !== null && d.declaredAmount !== d.amount;
            return (
              <Card key={d.id} hoverable={false} className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <span className="shrink-0">
                  {d.paymentMethod === "MOBILE_MONEY" && d.mobileOperator ? (
                    <OperatorMark operator={d.mobileOperator} />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {d.paymentMethod === "CARD" ? (
                        <CreditCard className="h-4 w-4" />
                      ) : d.paymentMethod === "MOBILE_MONEY" ? (
                        <Smartphone className="h-4 w-4" />
                      ) : (
                        <Landmark className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1 basis-60">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {d.donorName || d.donorEmail || "Donateur non renseigné"}
                    </p>
                    <Badge tone={badge.tone} className="px-2.5 py-0.5">
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{methodLabel(d)}</span>
                    {d.transactionReference && d.paymentMethod === "MOBILE_MONEY" && (
                      <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{d.transactionReference}</span>
                    )}
                    {d.donorPhone && <span className="font-mono">{formatMgPhone(d.donorPhone)}</span>}
                    <span>·</span>
                    <span>{branchName(d.branchId)}</span>
                    <span>·</span>
                    <span>{formatDateTime(d.createdAt)}</span>
                  </p>
                  {d.status === "REJECTED" && d.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">Motif : {d.rejectionReason}</p>
                  )}
                  {d.status === "CONFIRMED" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      {d.paymentMethod === "CARD" ? (
                        <>
                          <ShieldCheck className="h-3 w-3" /> Payé en ligne
                        </>
                      ) : d.thankYouEmailSentAt ? (
                        <>
                          <MailCheck className="h-3 w-3" /> Remerciement envoyé
                        </>
                      ) : null}
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p
                    className={clsx(
                      "text-base font-extrabold tabular-nums",
                      d.status === "CONFIRMED" && "text-emerald-600 dark:text-emerald-400",
                      d.status === "PENDING" && "text-slate-900 dark:text-white",
                      d.status === "REJECTED" && "text-slate-400 line-through",
                    )}
                  >
                    {formatAmount(d.amount, d.currency)}
                  </p>
                  {corrected && (
                    <p className="text-[11px] text-slate-400">déclaré {formatAmount(d.declaredAmount!, d.currency)}</p>
                  )}
                </div>

                {(canManage(d) || canDelete(d)) && (
                  <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                    {canManage(d) &&
                      (d.status === "PENDING" ? (
                        <Button variant="secondary" size="sm" onClick={() => setVerifying(d)}>
                          Vérifier
                        </Button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReopen(d)}
                          disabled={reopen.isPending}
                          title="Remettre à vérifier"
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> Rouvrir
                        </button>
                      ))}
                    {canDelete(d) && (
                      <button
                        type="button"
                        onClick={() => setDeleting(d)}
                        disabled={deleteDonation.isPending}
                        aria-label="Supprimer"
                        title="Supprimer ce don"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <VerifyDonationDrawer donation={verifying} onClose={() => setVerifying(null)} onDone={handleVerified} />
      <ManualDonationDrawer
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onRecorded={handleRecorded}
        defaultBranchId={selectedBranchId === "all" ? undefined : selectedBranchId}
      />
      <DeleteDonationDialog
        donation={deleting}
        pending={deleteDonation.isPending}
        onConfirm={handleDelete}
        onCancel={closeDeleteDialog}
      />
      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
