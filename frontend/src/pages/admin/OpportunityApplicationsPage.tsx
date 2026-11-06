import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Download, Mail, Phone, Search, Trash2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { QueryError } from "../../components/ui/QueryError";
import {
  downloadApplicationFile,
  useApplications,
  useDeleteApplication,
  useUpdateApplication,
  type Application,
  type ApplicationStatus,
} from "../../hooks/useOpportunities";
import { formatFileSize } from "../../hooks/useProjectDocuments";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { dateLocale } from "../../lib/locale";

const STATUSES: ApplicationStatus[] = ["NEW", "IN_REVIEW", "ACCEPTED", "REJECTED"];
const TABS: (ApplicationStatus | undefined)[] = [...STATUSES, undefined];

const STATUS_TONES: Record<ApplicationStatus, string> = {
  NEW: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  IN_REVIEW: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  ACCEPTED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  REJECTED: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

/** Super Admin: members' applications from the « Opportunités » page (studies in Italy). */
export function OpportunityApplicationsPage() {
  const { t, i18n } = useTranslation();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [status, setStatus] = useState<ApplicationStatus | undefined>("NEW");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading, isError, error, refetch } = useApplications({ page, status, q });
  const update = useUpdateApplication();
  const remove = useDeleteApplication();
  const [deleting, setDeleting] = useState<Application | undefined>(undefined);

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.opportunities.title")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t("admin.opportunities.subtitle")}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
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
              {tab ? t(`opportunities.status.${tab}`) : t("admin.opportunities.all")}
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
            placeholder={t("admin.opportunities.search")}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t("admin.opportunities.empty")}</p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {data.items.map((a) => (
              <Card key={a.id} hoverable={false} className="p-5">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {a.lastName} {a.firstName}
                      <span className="ml-2 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">{a.memberNumber}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      {a.branchName && `${a.branchName} · `}
                      {t("admin.opportunities.received", { date: date(a.createdAt) })}
                    </p>
                  </div>
                  <select
                    value={a.status}
                    aria-label={t("admin.opportunities.status_label")}
                    disabled={update.isPending}
                    onChange={(e) =>
                      update.mutate(
                        { id: a.id, status: e.target.value as ApplicationStatus },
                        { onError: showError, onSuccess: () => showSuccess(t("admin.opportunities.updated")) },
                      )
                    }
                    className={clsx("rounded-full border-0 px-3 py-1 text-xs font-semibold outline-none", STATUS_TONES[a.status])}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{t(`opportunities.status.${s}`)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setDeleting(a)}
                    aria-label={t("common.delete")}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  {[
                    [t("opportunities.apply.study_level"), t(`opportunities.apply.levels.${a.studyLevel}`, { defaultValue: a.studyLevel })],
                    [t("opportunities.apply.faculty"), a.faculty],
                    [t("opportunities.apply.major"), a.major],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-slate-400">{label}</dt>
                      <dd className="text-slate-700 dark:text-slate-200">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                  <a href={`mailto:${a.email}`} className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400">
                    <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {a.email}
                  </a>
                  <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400">
                    <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {a.phone}
                  </a>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("admin.opportunities.motivation")}</p>
                  <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700 dark:text-slate-200">{a.motivation}</p>
                </div>

                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t("admin.opportunities.dossier")}</p>
                  <ul className="mt-1.5 space-y-1">
                    {a.files.map((file) => (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => downloadApplicationFile(a, file).catch(showError)}
                          className="inline-flex max-w-full items-center gap-2 text-left text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          <Download className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="break-all">{file.fileName}</span>
                          <span className="shrink-0 font-normal text-slate-400">({formatFileSize(file.size, i18n.language)})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t("common.delete")}
        message={t("admin.opportunities.delete_confirm", { name: deleting ? `${deleting.firstName} ${deleting.lastName}` : "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id, { onError: showError, onSuccess: () => showSuccess(t("admin.opportunities.deleted")) });
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
