import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";
import { Check, ImageOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ProjectDrawer } from "../../components/admin/ProjectDrawer";
import { RejectDialog } from "../../components/admin/RejectDialog";
import { ProjectPhaseBadge, ProjectStatusBadge } from "../../components/admin/ProjectStatusBadge";
import type { Project, ProjectPhase, ProjectReviewStatus } from "../../types/project";
import {
  useAdminProject,
  useAdminProjects,
  useApproveProject,
  useDeleteProject,
  useRejectProject,
} from "../../hooks/useAdminProjects";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useAdminScopeStore } from "../../store/adminScopeStore";
import { useAuthStore } from "../../store/authStore";

const STATUS_TABS: { value: ProjectReviewStatus | undefined; label: string }[] = [
  { value: "PENDING", label: "En attente" },
  { value: "APPROVED", label: "Publiés" },
  { value: "REJECTED", label: "Refusés" },
  { value: undefined, label: "Tous" },
];

const PHASE_FILTERS: { value: ProjectPhase | undefined; label: string }[] = [
  { value: undefined, label: "Tous les types" },
  { value: "COMPLETED", label: "Réalisations" },
  { value: "ONGOING", label: "Projets en cours" },
];

export function ProjectsPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedBranchId } = useAdminScopeStore();
  const pillarLabels = usePillarLabels();

  const [reviewStatus, setReviewStatus] = useState<ProjectReviewStatus | undefined>(isSuperAdmin ? "PENDING" : undefined);
  const [phase, setPhase] = useState<ProjectPhase | undefined>(undefined);
  const { data, isLoading } = useAdminProjects({ reviewStatus, phase });

  // Drawer target: either a row clicked here, or ?id=… from a notification / toast link.
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedId = searchParams.get("id") ? Number(searchParams.get("id")) : undefined;
  const { data: linkedProject } = useAdminProject(linkedId);
  const [editing, setEditing] = useState<Project | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const drawerProject = linkedId ? linkedProject : editing;
  const drawerOpen = creating || !!editing || (!!linkedId && !!linkedProject);

  const closeDrawer = () => {
    setCreating(false);
    setEditing(undefined);
    if (linkedId) setSearchParams({}, { replace: true });
  };

  const approve = useApproveProject();
  const reject = useRejectProject();
  const deleteProject = useDeleteProject();
  const [rejecting, setRejecting] = useState<Project | undefined>(undefined);
  const [deleting, setDeleting] = useState<Project | undefined>(undefined);

  const counts = data?.counts;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Réalisations & projets</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {isSuperAdmin
              ? "Validez les ajouts des antennes : ils sont publiés sur le site dès votre validation."
              : "Vos ajouts sont publiés sur le site après validation par le siège."}
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => {
            setEditing(undefined);
            setCreating(true);
          }}
        >
          Ajouter
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {STATUS_TABS.map((tab) => {
            const count = tab.value ? counts?.[tab.value] : undefined;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setReviewStatus(tab.value)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  reviewStatus === tab.value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                {tab.label}
                {count !== undefined && count > 0 && (
                  <span
                    className={clsx(
                      "rounded-full px-1.5 text-[11px] font-bold",
                      tab.value === "PENDING" ? "bg-orange-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <select
          value={phase ?? ""}
          onChange={(e) => setPhase((e.target.value || undefined) as ProjectPhase | undefined)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {PHASE_FILTERS.map((f) => (
            <option key={f.label} value={f.value ?? ""}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
          {reviewStatus === "PENDING" ? "Aucun ajout en attente de validation." : "Aucun élément pour le moment."}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {data.items.map((project) => (
            <Card key={project.id} hoverable={false} className="flex items-center gap-4 p-4">
              {project.images[0] ? (
                <img src={project.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <IconBadge icon={<ImageOff className="h-4 w-4" aria-hidden />} tone="slate" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{project.title}</p>
                  <ProjectStatusBadge status={project.reviewStatus} />
                  <ProjectPhaseBadge phase={project.phase} />
                </div>
                <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                  {(isSuperAdmin && selectedBranchId === "all") ? `${project.branchName} · ` : ""}
                  {pillarLabels[project.pillar]}
                  {project.authorName ? ` · ${project.authorName}` : ""}
                </p>
                {project.reviewStatus === "REJECTED" && project.rejectionReason && (
                  <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">Motif : {project.rejectionReason}</p>
                )}
              </div>

              {isSuperAdmin && project.reviewStatus === "PENDING" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check className="h-4 w-4" />}
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(project.id)}
                  >
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 font-semibold text-white hover:bg-red-700"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => setRejecting(project)}
                  >
                    Refuser
                  </Button>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditing(project);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(project)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}

      <ProjectDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        project={creating ? undefined : drawerProject}
        defaultBranchId={selectedBranchId === "all" ? undefined : selectedBranchId}
      />

      <RejectDialog
        open={!!rejecting}
        projectTitle={rejecting?.title ?? ""}
        isPending={reject.isPending}
        onConfirm={async (reason) => {
          if (!rejecting) return;
          await reject.mutateAsync({ projectId: rejecting.id, reason });
          setRejecting(undefined);
        }}
        onCancel={() => setRejecting(undefined)}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer"
        message={`Supprimer définitivement « ${deleting?.title ?? ""} » ? S'il est publié, il disparaîtra du site.`}
        confirmLabel="Supprimer"
        onConfirm={() => {
          if (deleting) deleteProject.mutate(deleting.id);
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
