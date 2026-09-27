import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { QueryError } from "../../components/ui/QueryError";
import { PublicationDrawer } from "../../components/admin/PublicationDrawer";
import { useAdminPublications, useDeletePublication } from "../../hooks/useAdminPublications";
import { useScopedBranchId } from "../../hooks/useAdminScope";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useAuthStore } from "../../store/authStore";
import { dateLocale } from "../../lib/locale";
import type { AdminPublication } from "../../types/publication";
import { useSuccessToast } from "../../hooks/useSuccessToast";

/** « Bilans annuels » : PDF reports downloadable from each branch page (« Rapports » tab). */
export function ReportsPage() {
  const { t } = useTranslation();
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "SUPER_ADMIN");
  const scopedBranchId = useScopedBranchId();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading, isError, error, refetch } = useAdminPublications({ page, q });
  const deletePublication = useDeletePublication();

  const [editing, setEditing] = useState<AdminPublication | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminPublication | undefined>(undefined);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.reports.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.reports.subtitle")}</p>
        </div>
        <Button
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditing(undefined);
            setDrawerOpen(true);
          }}
        >
          {t("admin.reports.new")}
        </Button>
      </div>

      <div className="relative mt-6 max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={t("admin.reports.search")}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        />
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t(q ? "admin.reports.no_result" : "admin.reports.empty")}</p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {data.items.map((pub) => (
              <Card key={pub.id} hoverable={false} className="flex items-center gap-4 p-4">
                {pub.thumbnailUrl ? (
                  <img src={pub.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <IconBadge icon={<FileText className="h-4 w-4" aria-hidden />} tone="emerald" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{pub.title}</p>
                  <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                    {isSuperAdmin && scopedBranchId === undefined && pub.branchName ? `${pub.branchName} · ` : ""}
                    {new Date(pub.createdAt).toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                {pub.fileUrl && (
                  <a
                    href={pub.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={t("admin.reports.download", { title: pub.title })}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(pub);
                    setDrawerOpen(true);
                  }}
                  aria-label={t("common.edit")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(pub)}
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

      <PublicationDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(undefined);
        }}
        publication={editing}
        defaultBranchId={scopedBranchId}
      />

      <ConfirmDialog
        open={!!deleting}
        title={t("common.delete")}
        message={t("admin.reports.delete_confirm", { title: deleting?.title ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (deleting) {
            const title = deleting.title;
            deletePublication.mutate(deleting.id, { onError: showError, onSuccess: () => showSuccess(t("admin.feedback.report_deleted"), title) });
          }
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
