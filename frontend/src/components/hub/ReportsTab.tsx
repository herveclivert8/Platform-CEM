import { FileText, Download } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { useBranchPosts } from "../../hooks/usePosts";
import { useBranchPublications } from "../../hooks/usePublications";
import { PostCard } from "./PostCard";

export function ReportsTab({ branchId }: { branchId: number }) {
  const { data: posts, isLoading: postsLoading } = useBranchPosts(branchId, { pageSize: 6 });
  const { data: publications, isLoading: pubsLoading } = useBranchPublications(branchId);

  return (
    <div className="space-y-10">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Bilans d'action téléchargeables
        </h3>
        {pubsLoading ? (
          <Skeleton className="mt-4 h-20 w-full" />
        ) : !publications || publications.items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucun bilan publié pour le moment.</p>
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
                    aria-label={`Télécharger ${pub.title}`}
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
          Actualités du terrain
        </h3>
        {postsLoading ? (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        ) : !posts || posts.items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-400">Aucune actualité pour le moment.</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.items.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
