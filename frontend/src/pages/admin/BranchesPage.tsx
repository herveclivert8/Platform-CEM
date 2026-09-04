import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { BranchDrawer } from "../../components/admin/BranchDrawer";
import { useBranches } from "../../hooks/useBranches";
import { useDeleteBranch } from "../../hooks/useAdminBranches";

export function BranchesPage() {
  const { data, isLoading } = useBranches();
  const deleteBranch = useDeleteBranch();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Antennes</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gestion des antennes locales et de leur géolocalisation.</p>
        </div>
        <Button
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setDrawerOpen(true)}
        >
          Nouvelle antenne
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {data?.items.map((branch) => (
            <Card key={branch.id} hoverable={false} className="flex items-center gap-4 p-4">
              <IconBadge icon={<MapPin className="h-4 w-4" aria-hidden />} tone="emerald" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.cityName}</p>
                  <Badge tone={branch.status === "active" ? "emerald" : "slate"}>{branch.status}</Badge>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{branch.country}</p>
              </div>
              <Link
                to={`/admin/branches/${branch.id}`}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() =>
                  window.confirm(
                    `Supprimer l'antenne ${branch.cityName} ? Cette action supprime aussi ses publications et posts.`,
                  ) && deleteBranch.mutate(branch.id)
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <BranchDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
