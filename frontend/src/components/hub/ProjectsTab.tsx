import { useState } from "react";
import clsx from "clsx";
import { PILLAR_LABELS, type Pillar } from "../../types/post";
import { useBranchPosts } from "../../hooks/usePosts";
import { PostCard } from "./PostCard";
import { Skeleton } from "../ui/Skeleton";

const PILLARS = Object.keys(PILLAR_LABELS) as Pillar[];

export function ProjectsTab({ branchId }: { branchId: number }) {
  const [pillar, setPillar] = useState<Pillar | undefined>(undefined);
  const { data, isLoading } = useBranchPosts(branchId, { pillar, pageSize: 12 });

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
          Tous
        </button>
        {PILLARS.map((p) => (
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
            {PILLAR_LABELS[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400">
          Aucune actualité publiée pour cette antenne pour le moment.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
