import { useState } from "react";
import { isAxiosError } from "axios";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, MapPin, Power, PowerOff } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { BranchDrawer } from "../../components/admin/BranchDrawer";
import { useAdminBranchList } from "../../hooks/useBranches";
import { useDeleteBranch, useSetBranchStatus } from "../../hooks/useAdminBranches";
import { BRANCH_STATUS_LABELS, type Branch, type BranchStatus } from "../../types/branch";

const STATUS_TONES: Record<BranchStatus, "emerald" | "orange" | "slate"> = {
  active: "emerald",
  pending: "orange",
  inactive: "slate",
};

const ACTION_CLASS =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

function apiErrorMessage(error: unknown, fallback: string): string {
  return (isAxiosError(error) && error.response?.data?.detail) || fallback;
}

export function BranchesPage() {
  const { data, isLoading } = useAdminBranchList();
  const deleteBranch = useDeleteBranch();
  const setBranchStatus = useSetBranchStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const actionError = deleteBranch.isError
    ? apiErrorMessage(deleteBranch.error, "La suppression a échoué. Veuillez réessayer.")
    : setBranchStatus.isError
      ? apiErrorMessage(setBranchStatus.error, "Le changement de statut a échoué. Veuillez réessayer.")
      : null;

  const toggleStatus = (branch: Branch) => {
    if (branch.status === "active") {
      const ok = window.confirm(
        `Désactiver l'antenne ${branch.cityName} ?\n\n` +
          "Elle sera retirée de l'annuaire et ne recevra plus ni dons ni dossiers. " +
          "Sa page et ses actualités restent consultables, et vous pourrez la réactiver à tout moment.",
      );
      if (!ok) return;
    }
    deleteBranch.reset();
    setBranchStatus.mutate({ branchId: branch.id, status: branch.status === "active" ? "inactive" : "active" });
  };

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

      {actionError && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {actionError}
        </p>
      )}

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {data?.items.map((branch) => (
            <Card key={branch.id} hoverable={false} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <IconBadge icon={<MapPin className="h-4 w-4" aria-hidden />} tone="emerald" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.cityName}</p>
                  <Badge tone={STATUS_TONES[branch.status]}>{BRANCH_STATUS_LABELS[branch.status]}</Badge>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{branch.country}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Link to={`/admin/branches/${branch.id}`} className={ACTION_CLASS}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Modifier
                </Link>
                <button
                  type="button"
                  onClick={() => toggleStatus(branch)}
                  disabled={setBranchStatus.isPending}
                  className={ACTION_CLASS}
                >
                  {branch.status === "active" ? (
                    <>
                      <PowerOff className="h-4 w-4" aria-hidden />
                      Désactiver
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4" aria-hidden />
                      {branch.status === "pending" ? "Activer" : "Réactiver"}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBranchStatus.reset();
                    if (
                      window.confirm(
                        `Supprimer définitivement l'antenne ${branch.cityName} ?\n\n` +
                          "Ses posts, dossiers entrepreneurs et membres d'équipe seront effacés ; ses dons seront conservés sans antenne.\n\n" +
                          "Pour une antenne qui ferme, préférez le bouton « Désactiver » : rien n'est perdu.",
                      )
                    ) {
                      deleteBranch.mutate(branch.id);
                    }
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Supprimer
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <BranchDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
