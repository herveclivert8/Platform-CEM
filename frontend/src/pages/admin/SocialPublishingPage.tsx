import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CircleSlash, ExternalLink, FlaskConical, RotateCcw, Send } from "lucide-react";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "../../components/icons/BrandIcons";
import { useErrorToast } from "../../hooks/useErrorToast";
import {
  useRetrySocialPublication,
  useSocialPublications,
  useSocialStatus,
  type SocialNetwork,
  type SocialPublication,
  type SocialPublicationStatus,
} from "../../hooks/useSocialPublishing";
import { formatDateTime } from "../../types/donation";

const NETWORK_ICONS: Record<SocialNetwork, { icon: typeof FacebookIcon; color: string }> = {
  FACEBOOK: { icon: FacebookIcon, color: "text-[#1877f2]" },
  INSTAGRAM: { icon: InstagramIcon, color: "text-[#e1306c]" },
  LINKEDIN: { icon: LinkedInIcon, color: "text-[#0a66c2]" },
};

const STATUS_TONES: Record<SocialPublicationStatus, "emerald" | "orange" | "slate"> = {
  PUBLISHED: "emerald",
  FAILED: "orange",
  SKIPPED: "slate",
};

function contentPath(p: SocialPublication): string {
  return p.resourceType === "post" ? `/admin/posts` : `/admin/projects?id=${p.resourceId}`;
}

export function SocialPublishingPage() {
  const { t } = useTranslation();
  const { data: status, isLoading: statusLoading } = useSocialStatus();
  const [filter, setFilter] = useState<SocialPublicationStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSocialPublications(filter === "ALL" ? undefined : filter, page);
  const retry = useRetrySocialPublication();
  const showError = useErrorToast();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.social_publishing.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.social_publishing.subtitle")}</p>

      {statusLoading || !status ? (
        <Skeleton className="mt-6 h-32 w-full" />
      ) : (
        <>
          <div
            className={clsx(
              "mt-6 flex gap-3 rounded-2xl border px-5 py-4 text-sm",
              status.mode === "simulation" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
              status.mode === "live" && "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200",
              status.mode === "disabled" && "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            )}
          >
            {status.mode === "simulation" ? (
              <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : status.mode === "live" ? (
              <Send className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <CircleSlash className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
            )}
            <div>
              <p className="font-semibold">{t(`admin.social_publishing.mode_${status.mode}`)}</p>
              <p className="mt-0.5">{t(`admin.social_publishing.mode_${status.mode}_text`)}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {status.networks.map((n) => {
              const { icon: Icon, color } = NETWORK_ICONS[n.network];
              return (
                <Card key={n.network} hoverable={false} className="flex items-center gap-3 p-4">
                  <Icon className={clsx("h-6 w-6", color)} aria-hidden />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{n.label}</p>
                    <p className={clsx("text-xs", n.configured ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400")}>
                      {t(n.configured ? "admin.social_publishing.configured" : "admin.social_publishing.not_configured")}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{t("admin.social_publishing.history")}</h2>
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "PUBLISHED", "FAILED", "SKIPPED"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                value === filter
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              {t(`admin.social_publishing.filter_${value}`)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="mt-4 h-40 w-full" />
      ) : !data?.items.length ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t("admin.social_publishing.empty")}</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {data.items.map((p) => {
            const { icon: Icon, color } = NETWORK_ICONS[p.network];
            return (
              <Card key={p.id} hoverable={false} className="flex flex-wrap items-start gap-4 p-4">
                <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", color)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={contentPath(p)} className="text-sm font-semibold text-slate-900 hover:underline dark:text-white">
                      {p.title}
                    </Link>
                    <Badge tone={STATUS_TONES[p.status]}>
                      {p.status === "PUBLISHED" && <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />}
                      {t(`admin.social_publishing.status_${p.status}`)}
                    </Badge>
                    {p.simulated && <Badge>{t("admin.social_publishing.simulated")}</Badge>}
                    <Badge>{t(p.resourceType === "post" ? "admin.social_publishing.type_post" : "admin.social_publishing.type_project")}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{formatDateTime(p.createdAt)}</p>
                  {p.error && <p className="mt-1 text-xs text-orange-700 dark:text-orange-300">{p.error}</p>}
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white">
                      {t("admin.social_publishing.show_message")}
                    </summary>
                    <p className="mt-1.5 whitespace-pre-line rounded-lg bg-slate-50 p-3 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">{p.message}</p>
                  </details>
                </div>
                <div className="flex gap-2">
                  {p.externalUrl && (
                    <a
                      href={p.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden /> {t("admin.social_publishing.view")}
                    </a>
                  )}
                  {p.status !== "PUBLISHED" && status?.mode !== "disabled" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RotateCcw className="h-3.5 w-3.5" />}
                      disabled={retry.isPending}
                      onClick={() => retry.mutate(p.id, { onError: showError })}
                    >
                      {t("admin.social_publishing.retry")}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
          <Pagination page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
