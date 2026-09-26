import { useState } from "react";
import { ChevronLeft, ChevronRight, ScrollText } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuditLog, useAuditStats, type AuditLogEntry } from "../../hooks/useSuperAdminStats";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { dateLocale } from "../../lib/locale";

/** Short human-readable summary of the entry's details (title, name, amount...). */
function detailSummary(entry: AuditLogEntry, t: TFunction): string | null {
  const d = entry.details;
  if (!d) return null;
  const label = d.title ?? d.name ?? d.email ?? d.applicant ?? d.filename;
  if (typeof label === "string") return label;
  if (typeof d.amount === "number" && typeof d.currency === "string") {
    return `${d.amount.toLocaleString(dateLocale())} ${d.currency}${d.reference ? ` — ${t("admin.audit.reference")} ${d.reference}` : ""}`;
  }
  if (typeof d.section === "string")
    return d.section === "payment_info" ? t("admin.audit.section_payment") : t("admin.audit.section_social");
  return null;
}

export function AuditPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data: stats, isLoading: statsLoading } = useAuditStats();
  const { data: log, isLoading: logLoading } = useAuditLog(30, page);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.audit.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.audit.subtitle")}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: t("admin.audit.events"), value: stats?.total_events },
          { label: t("admin.audit.failed_logins"), value: stats?.failed_logins },
          { label: t("admin.audit.reports_created"), value: stats?.publications_created },
          { label: t("admin.audit.admins_created"), value: stats?.admins_created },
        ].map((item) => (
          <Card key={item.label} hoverable={false} className="p-5">
            {statsLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{item.value ?? 0}</p>
            )}
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        {logLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !log || log.items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">{t("admin.audit.none")}</p>
        ) : (
          <>
            <div className="space-y-2">
              {log.items.map((entry) => {
                const summary = detailSummary(entry, t);
                return (
                  <Card key={entry.id} hoverable={false} className="flex items-center gap-4 p-4">
                    <IconBadge icon={<ScrollText className="h-4 w-4" aria-hidden />} tone="slate" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        <span className="font-semibold">{t(`admin.audit.action.${entry.action}`, { defaultValue: entry.action })}</span>
                        {entry.action !== "login" && entry.action !== "logout" && (
                          <> · {t(`admin.audit.resource.${entry.resource_type}`, { defaultValue: entry.resource_type })}</>
                        )}
                        {summary && <span className="text-slate-500 dark:text-slate-400"> — {summary}</span>}
                      </p>
                      <p className="truncate text-xs text-slate-400 dark:text-slate-500">
                        {entry.user_email ?? t("admin.audit.deleted_account")} — {new Date(entry.created_at + (entry.created_at.endsWith("Z") ? "" : "Z")).toLocaleString(dateLocale())}
                        {entry.ip_address && ` — ${entry.ip_address}`}
                      </p>
                    </div>
                    <Badge tone={entry.success ? "emerald" : "orange"}>{entry.success ? t("admin.audit.success") : t("admin.audit.failure")}</Badge>
                  </Card>
                );
              })}
            </div>

            {log.total_pages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                <span>
                  {t("common.page_of", { page: log.page, total: log.total_pages, count: log.total, label: t("admin.audit.count_label") })}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                  >
                    <ChevronLeft className="h-4 w-4" /> {t("common.previous")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(log.total_pages, p + 1))}
                    disabled={page >= log.total_pages}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
                  >
                    {t("common.next")} <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
