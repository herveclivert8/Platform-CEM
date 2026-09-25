import { useState } from "react";
import { Mail, Plus, Trash2, User } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { SubmissionDrawer } from "../../components/admin/SubmissionDrawer";
import { useAdminSubmissions, useDeleteSubmission } from "../../hooks/useAdminSubmissions";
import { useAdminScopeStore } from "../../store/adminScopeStore";
import { useAuthStore } from "../../store/authStore";

export function SubmissionsPage() {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  const { data: submissions, isLoading } = useAdminSubmissions();
  const deleteSubmission = useDeleteSubmission();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const targetBranchId =
    user?.role === "SUPER_ADMIN"
      ? selectedBranchId === "all"
        ? undefined
        : selectedBranchId
      : (user?.branchId ?? undefined);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dossiers Entrepreneurs</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Candidatures de porteurs de projet et artisans soumises à l'antenne.
          </p>
        </div>
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
          Ajouter un dossier
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !submissions || submissions.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">Aucun dossier reçu pour le moment.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {submissions.map((s) => (
            <Card key={s.id} hoverable={false} className="p-5">
              <div className="flex items-start gap-3">
                <IconBadge icon={<User className="h-4 w-4" aria-hidden />} tone="orange" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.applicantName}</p>
                  <a
                    href={`mailto:${s.email}`}
                    className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    <Mail className="h-3 w-3" /> {s.email}
                  </a>
                  <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">{s.projectSummary}</p>
                  <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    window.confirm(`Supprimer le dossier de ${s.applicantName} ?`) && deleteSubmission.mutate(s)
                  }
                  disabled={deleteSubmission.isPending}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <SubmissionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} branchId={targetBranchId} />
    </div>
  );
}
