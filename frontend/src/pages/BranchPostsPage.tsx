import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import clsx from "clsx";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useBranch } from "../hooks/useBranches";
import { useBranchPosts } from "../hooks/usePosts";
import { usePillarLabels } from "../hooks/usePillarLabels";
import { ALL_PILLARS, type Pillar } from "../types/post";
import { PostCard } from "../components/hub/PostCard";
import { Skeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";

const PAGE_SIZE = 9;

export function BranchPostsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const id = branchId ? Number(branchId) : undefined;
  const { data: branch } = useBranch(id);
  const pillarLabels = usePillarLabels();

  const [pillar, setPillar] = useState<Pillar | undefined>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBranchPosts(id, { pillar, page, pageSize: PAGE_SIZE });

  const changePillar = (p: Pillar | undefined) => {
    setPillar(p);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to={id ? `/antennes/${id}` : "/"}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour à l'antenne {branch ? `de ${branch.cityName}` : ""}
      </Link>

      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        Toutes les actualités{branch ? ` — ${branch.cityName}` : ""}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => changePillar(undefined)}
          className={clsx(
            "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
            !pillar
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
          )}
        >
          Tous
        </button>
        {ALL_PILLARS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => changePillar(p)}
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
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-10 text-sm text-slate-400">Aucune actualité pour le moment.</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="border border-slate-200 dark:border-slate-700"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                Précédent
              </Button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                Page {data.page} / {data.totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="border border-slate-200 dark:border-slate-700"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Suivant
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
