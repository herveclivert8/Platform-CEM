import { Link } from "react-router-dom";
import { FileText, Download, ArrowRight } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { useBranchPosts } from "../../hooks/usePosts";
import { useBranchPublications } from "../../hooks/usePublications";
import { PostCard } from "./PostCard";
import { useTranslation } from "react-i18next";
import { QueryError } from "../ui/QueryError";

export function ReportsTab({ branchId }: { branchId: number }) {
  const { t } = useTranslation();
  const { data: posts, isLoading: postsLoading, isError: postsError, error: postsErr, refetch: refetchPosts } = useBranchPosts(branchId, { pageSize: 6 });
  const { data: publications, isLoading: pubsLoading, isError: pubsError, error: pubsErr, refetch: refetchPubs } = useBranchPublications(branchId);

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t("hub.reports.title")}
        </h3>
        {pubsLoading ? (
          <Skeleton className="mt-4 h-20 w-full" />
        ) : pubsError ? (
          <QueryError error={pubsErr} onRetry={() => refetchPubs()} />
        ) : !publications || publications.items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t("hub.reports.none")}</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {publications.items.map((pub) => (
              <Card key={pub.id} className="flex items-center gap-4 p-4">
                <IconBadge icon={<FileText className="h-5 w-5" aria-hidden />} tone="emerald" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {pub.title}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {pub.description}
                  </p>
                </div>
                {pub.fileUrl && (
                  <a
                    href={pub.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                    aria-label={t("hub.reports.download", { title: pub.title })}
                  >
                    <Download className="h-4 w-4" aria-hidden />
                  </a>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          {t("hub.reports.news")}
        </h3>
        {postsLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : postsError ? (
          <QueryError error={postsErr} onRetry={() => refetchPosts()} />
        ) : !posts || posts.items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">{t("hub.reports.no_news")}</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.items.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
            {posts.total > posts.items.length && (
              <Link
                to={`/antennes/${branchId}/actualites`}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                {t("hub.reports.all_news")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
