import { useCallback, useState } from "react";
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
import { useScopedBranchId } from "../../hooks/useAdminScope";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { Pagination } from "../../components/ui/Pagination";
import { useAuthStore } from "../../store/authStore";
import {
  OPERATOR_LABELS,
  formatAmount,
  formatDateTime,
  formatMgPhone,
  type Donation,
  type DonationStatus,
} from "../../types/donation";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

type Filter = DonationStatus | "ALL";

const FILTERS: { value: Filter; labelKey: string }[] = [
  { value: "PENDING", labelKey: "admin.donations.filter_pending" },
  { value: "CONFIRMED", labelKey: "admin.donations.filter_confirmed" },
  { value: "REJECTED", labelKey: "admin.donations.filter_rejected" },
  { value: "ALL", labelKey: "admin.donations.filter_all" },
];

const STATUS_BADGE: Record<DonationStatus, { label: string; tone: "orange" | "emerald" | "slate" }> = {
  PENDING: { label: "admin.donations.status_pending", tone: "orange" },
  CONFIRMED: { label: "admin.donations.status_confirmed", tone: "emerald" },
  REJECTED: { label: "admin.donations.status_rejected", tone: "slate" },
};

function methodLabel(d: Donation, t: TFunction): string {
  if (d.paymentMethod === "CARD") return t("admin.donations.method_card");
  if (d.paymentMethod === "MOBILE_MONEY") return d.mobileOperator ? OPERATOR_LABELS[d.mobileOperator] : t("admin.donations.method_mobile");
  return t("admin.donations.method_transfer");
}

export function DonationsPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const scopedBranchId = useScopedBranchId();
  const [page, setPage] = useState(1);
  const [filter, setFilterState] = useState<Filter>("PENDING");
  const [search, setSearchState] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading } = useAdminDonations({ page, status: filter === "ALL" ? undefined : filter, q });
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const setFilter = (value: Filter) => {
    setFilterState(value);
    setPage(1);
  };
  const setSearch = (value: string) => {
    setSearchState(value);
    setPage(1);
  };
  const { data: branchesData } = useBranches();
  const reopen = useReopenDonation();
  const deleteDonation = useDeleteDonation();
  const [verifying, setVerifying] = useState<Donation | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [deleting, setDeleting] = useState<Donation | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = (title: string, description?: string, tone: ToastMessage["tone"] = "success") =>
    setToast({ id: Date.now(), title, description, tone });
  const closeToast = useCallback(() => setToast(null), []);
  const closeDeleteDialog = useCallback(() => setDeleting(null), []);

  const thankYouNote = (d: Donation) =>
    d.donorEmail ? t("admin.donations.thanks_will_send", { email: d.donorEmail }) : t("admin.donations.no_email");

  const branchName = (branchId: number | null) =>
    branchId ? (branchesData?.items.find((b) => b.id === branchId)?.cityName ?? `#${branchId}`) : t("admin.donations.global");

  // Global donations (no branch) can only be handled by the Super Admin (enforced server-side too).
  const hasAccess = (d: Donation) => user?.role === "SUPER_ADMIN" || d.branchId !== null;
  const canManage = (d: Donation) => hasAccess(d) && d.paymentMethod === "MOBILE_MONEY";
  // Only never-validated donations can be deleted: a confirmed one is money actually received.
  const canDelete = (d: Donation) => hasAccess(d) && d.status !== "CONFIRMED";

  const counts: Record<Filter, number> = {
    PENDING: summary?.donations_pending ?? 0,
    CONFIRMED: summary?.donations_confirmed ?? 0,
    REJECTED: summary?.donations_rejected ?? 0,
    ALL: (summary?.donations_pending ?? 0) + (summary?.donations_confirmed ?? 0) + (summary?.donations_rejected ?? 0),
  };
  const confirmedTotal =
    summary && summary.donations_confirmed_totals.length > 0
      ? summary.donations_confirmed_totals.map((t) => formatAmount(t.amount, t.currency)).join(" · ")
      : formatAmount(0, "EUR");
  const visible = data?.items ?? [];

  const handleReopen = (d: Donation) => {
    if (!window.confirm(t("admin.donations.reopen_confirm"))) return;
    reopen.mutate(d.id, {
      onSuccess: () => notify(t("admin.donations.reopened_toast"), t("admin.donations.reopened_text", { amount: formatAmount(d.amount, d.currency) }), "neutral"),
    });
  };

  const handleVerified = (updated: Donation) => {
    setVerifying(null);
    if (updated.status === "CONFIRMED") {
      notify(t("admin.donations.confirmed_toast", { amount: formatAmount(updated.amount, updated.currency) }), thankYouNote(updated));
    } else {
      notify(t("admin.donations.rejected_toast"), updated.rejectionReason ?? undefined, "neutral");
    }
  };

  const handleRecorded = (donation: Donation) => {
    setManualOpen(false);
    notify(t("admin.donations.recorded_toast", { amount: formatAmount(donation.amount, donation.currency) }), thankYouNote(donation));
  };

  const handleDelete = (d: Donation) => {
    deleteDonation.mutate(d.id, {
      onSuccess: () => {
        setDeleting(null);
        notify(t("admin.donations.deleted_toast"), `${formatAmount(d.amount, d.currency)}${d.transactionReference ? ` — ${t("admin.donations.ref", { ref: d.transactionReference })}` : ""}`, "neutral");
      },
      onError: () => {
        setDeleting(null);
        notify(t("admin.donations.delete_failed"), t("admin.donations.delete_failed_text"), "neutral");
      },
    });
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.donations.title")}</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
            {t("admin.donations.subtitle")}
          </p>
        </div>
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setManualOpen(true)}>
          {t("admin.donations.record_received")}
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card hoverable={false} className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.donations.total_confirmed")}</p>
          <p className="mt-1 text-xl font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
            {summaryLoading ? "…" : confirmedTotal}
          </p>
        </Card>
        <Card hoverable={false} className="p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.donations.confirmed_count")}</p>
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
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.donations.status_pending")}</p>
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
              {t(f.labelKey)} <span className="ml-0.5 opacity-70">{counts[f.value]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.donations.search")}
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
            {filter === "PENDING" && !search ? t("admin.donations.all_verified") : t("admin.donations.none_in_category")}
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
                      {d.donorName || d.donorEmail || t("admin.donations.unknown_donor")}
                    </p>
                    <Badge tone={badge.tone} className="px-2.5 py-0.5">
                      {t(badge.label)}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span>{methodLabel(d, t)}</span>
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
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t("admin.donations.reason", { reason: d.rejectionReason })}</p>
                  )}
                  {d.status === "CONFIRMED" && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                      {d.paymentMethod === "CARD" ? (
                        <>
                          <ShieldCheck className="h-3 w-3" /> {t("admin.donations.paid_online")}
                        </>
                      ) : d.thankYouEmailSentAt ? (
                        <>
                          <MailCheck className="h-3 w-3" /> {t("admin.donations.thanks_sent")}
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
                    <p className="text-[11px] text-slate-400">{t("admin.donations.declared_amount", { amount: formatAmount(d.declaredAmount!, d.currency) })}</p>
                  )}
                </div>

                {(canManage(d) || canDelete(d)) && (
                  <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                    {canManage(d) &&
                      (d.status === "PENDING" ? (
                        <Button variant="secondary" size="sm" onClick={() => setVerifying(d)}>
                          {t("admin.donations.verify")}
                        </Button>
                      ) : d.status === "CONFIRMED" && user?.role !== "SUPER_ADMIN" ? null : (
                        <button
                          type="button"
                          onClick={() => handleReopen(d)}
                          disabled={reopen.isPending}
                          title={t("admin.donations.reopen_title")}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> {t("admin.donations.reopen")}
                        </button>
                      ))}
                    {canDelete(d) && (
                      <button
                        type="button"
                        onClick={() => setDeleting(d)}
                        disabled={deleteDonation.isPending}
                        aria-label={t("common.delete")}
                        title={t("admin.donations.delete_title")}
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
          {data && (
            <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} itemLabel={t("admin.donations.count_label")} />
          )}
        </div>
      )}

      <VerifyDonationDrawer donation={verifying} onClose={() => setVerifying(null)} onDone={handleVerified} />
      <ManualDonationDrawer
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onRecorded={handleRecorded}
        defaultBranchId={scopedBranchId}
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
