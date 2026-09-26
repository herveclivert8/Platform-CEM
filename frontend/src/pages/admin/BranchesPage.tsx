import { isAxiosError } from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, MapPin, Power, PowerOff } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { BranchDrawer } from "../../components/admin/BranchDrawer";
import { useBranches } from "../../hooks/useBranches";
import { useDeleteBranch, useSetBranchStatus } from "../../hooks/useAdminBranches";
import type { Branch, BranchStatus } from "../../types/branch";
import { useTranslation } from "react-i18next";

const STATUS_TONES: Record<BranchStatus, "emerald" | "orange" | "slate"> = {
  active: "emerald",
  pending: "orange",
  inactive: "slate",
};

const ACTION_CLASS =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

function apiErrorMessage(error: unknown): string | null {
  return isAxiosError(error) && typeof error.response?.data?.detail === "string" ? error.response.data.detail : null;
}

export function BranchesPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useBranches({ includeInactive: true });
  const deleteBranch = useDeleteBranch();
  const setBranchStatus = useSetBranchStatus();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleStatus = (branch: Branch) => {
    if (branch.status === "active" && !window.confirm(t("admin.branches.deactivate_confirm", { name: branch.cityName }))) {
      return;
    }
    setBranchStatus.mutate(
      { branchId: branch.id, status: branch.status === "active" ? "inactive" : "active" },
      { onError: (err) => window.alert(apiErrorMessage(err) ?? t("admin.branches.status_failed")) },
    );
  };

  const remove = (branch: Branch) => {
    if (!window.confirm(t("admin.branches.delete_confirm", { name: branch.cityName }))) return;
    deleteBranch.mutate(branch.id, {
      onError: (err) => window.alert(apiErrorMessage(err) ?? t("admin.branches.delete_failed")),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.branches.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.branches.subtitle")}</p>
        </div>
        <Button
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => setDrawerOpen(true)}
        >
          {t("admin.branches.new")}
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
            <Card key={branch.id} hoverable={false} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <IconBadge icon={<MapPin className="h-4 w-4" aria-hidden />} tone="emerald" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{branch.cityName}</p>
                  <Badge tone={STATUS_TONES[branch.status]}>{t(`admin.branches.status_${branch.status}`)}</Badge>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">{branch.country}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                <Link to={`/admin/branches/${branch.id}`} className={ACTION_CLASS}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  {t("admin.branches.edit")}
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
                      {t("admin.branches.deactivate")}
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4" aria-hidden />
                      {t(branch.status === "pending" ? "admin.branches.activate" : "admin.branches.reactivate")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => remove(branch)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-300 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  {t("admin.branches.delete")}
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
