import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { ALL_PILLARS, type Pillar } from "../../types/post";
import { useBranchPosts } from "../../hooks/usePosts";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { PostCard } from "./PostCard";
import { Skeleton } from "../ui/Skeleton";
import { QueryError } from "../ui/QueryError";

export function ProjectsTab({ branchId }: { branchId: number }) {
  const { t } = useTranslation();
  const [pillar, setPillar] = useState<Pillar | undefined>(undefined);
  const { data, isLoading, isError, error, refetch } = useBranchPosts(branchId, { pillar, pageSize: 6 });
  const pillarLabels = usePillarLabels();

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPillar(undefined)}
          className={clsx(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            !pillar
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
          )}
        >
          {t("hub.filter_all")}
        </button>
        {ALL_PILLARS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPillar(p)}
            className={clsx(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
              pillar === p
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
            )}
          >
            {pillarLabels[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">{t("hub.no_posts")}</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          {data.total > data.items.length && (
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
  );
}
