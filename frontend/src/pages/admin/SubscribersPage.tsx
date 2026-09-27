import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Download, Mail, Search, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { QueryError } from "../../components/ui/QueryError";
import { useDeleteSubscriber, useExportSubscribers, useSubscribers, type Subscriber, type SubscriberStatus } from "../../hooks/useNewsletter";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useErrorToast } from "../../hooks/useErrorToast";
import { dateLocale } from "../../lib/locale";
import { useSuccessToast } from "../../hooks/useSuccessToast";

const TABS: (SubscriberStatus | undefined)[] = ["CONFIRMED", "PENDING", "UNSUBSCRIBED", undefined];

const STATUS_TONES: Record<SubscriberStatus, string> = {
  CONFIRMED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  PENDING: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  UNSUBSCRIBED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

/** Super Admin: newsletter subscribers, CSV export for the sending tool, GDPR deletion. */
export function SubscribersPage() {
  const { t } = useTranslation();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [status, setStatus] = useState<SubscriberStatus | undefined>("CONFIRMED");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading, isError, error, refetch } = useSubscribers({ page, status, q });
  const exportCsv = useExportSubscribers();
  const deleteSubscriber = useDeleteSubscriber();
  const [deleting, setDeleting] = useState<Subscriber | undefined>(undefined);

  const date = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.subscribers.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t("admin.subscribers.subtitle")}</p>
        </div>
        <Button
          variant="secondary"
          icon={<Download className="h-4 w-4" />}
          disabled={exportCsv.isPending || !data?.counts.CONFIRMED}
          onClick={() => exportCsv.mutate(undefined, { onError: showError, onSuccess: () => showSuccess(t("admin.feedback.export_done")) })}
        >
          {t("admin.subscribers.export", { count: data?.counts.CONFIRMED ?? 0 })}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {TABS.map((tab) => (
            <button
              key={tab ?? "all"}
              type="button"
              onClick={() => {
                setStatus(tab);
                setPage(1);
              }}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                status === tab
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                  : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              {t(tab ? `admin.subscribers.status_${tab.toLowerCase()}` : "admin.subscribers.all")}
              {tab && data && data.counts[tab] > 0 && (
                <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {data.counts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin.subscribers.search")}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t("admin.subscribers.empty")}</p>
      ) : (
        <>
          <div className="mt-6 space-y-2.5">
            {data.items.map((s) => (
              <Card key={s.id} hoverable={false} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-4">
                <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 dark:text-white">{s.email}</p>
                <span className="text-xs font-semibold uppercase text-slate-400">{s.lang}</span>
                <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONES[s.status])}>
                  {t(`admin.subscribers.status_${s.status.toLowerCase()}`)}
                </span>
                <span className="w-32 text-right text-xs text-slate-400">
                  {date(s.status === "CONFIRMED" ? s.confirmedAt : s.status === "UNSUBSCRIBED" ? s.unsubscribedAt : s.createdAt)}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleting(s)}
                  aria-label={t("common.delete")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </>
      )}

      <p className="mt-6 text-xs text-slate-400 dark:text-slate-500">{t("admin.subscribers.gdpr_note")}</p>

      <ConfirmDialog
        open={!!deleting}
        title={t("common.delete")}
        message={t("admin.subscribers.delete_confirm", { email: deleting?.email ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (deleting) {
            const email = deleting.email;
            deleteSubscriber.mutate(deleting.id, { onError: showError, onSuccess: () => showSuccess(t("admin.feedback.subscriber_deleted"), email) });
          }
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
