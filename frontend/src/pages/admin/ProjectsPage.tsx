import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Check, Eye, EyeOff, Flag, ImageOff, Pencil, Plus, Trash2, Trophy, X } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { ProjectDrawer } from "../../components/admin/ProjectDrawer";
import { RejectDialog } from "../../components/admin/RejectDialog";
import { ProjectHiddenBadge, ProjectPhaseBadge, ProjectStatusBadge } from "../../components/admin/ProjectStatusBadge";
import type { Project, ProjectPhase, ProjectReviewStatus } from "../../types/project";
import {
  useAdminProject,
  useAdminProjects,
  useApproveProject,
  useDeleteProject,
  usePublishAchievement,
  useRejectProject,
  useSetProjectVisibility,
} from "../../hooks/useAdminProjects";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useAdminScopeStore } from "../../store/adminScopeStore";
import { useAuthStore } from "../../store/authStore";
import { QueryError } from "../../components/ui/QueryError";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useSuccessToast } from "../../hooks/useSuccessToast";

// "TO_PUBLISH": ongoing projects flagged « achieved » by their member, to publish as achievements
type StatusTab = ProjectReviewStatus | "TO_PUBLISH" | undefined;

const STATUS_TABS: { value: StatusTab; labelKey: string }[] = [
  { value: "PENDING", labelKey: "admin.projects.tab_pending" },
  { value: "TO_PUBLISH", labelKey: "admin.projects.tab_to_publish" },
  { value: "APPROVED", labelKey: "admin.projects.tab_approved" },
  { value: "REJECTED", labelKey: "admin.projects.tab_rejected" },
  { value: undefined, labelKey: "admin.projects.tab_all" },
];

const PHASE_FILTERS: { value: ProjectPhase | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: "admin.projects.filter_all" },
  { value: "COMPLETED", labelKey: "admin.projects.filter_completed" },
  { value: "ONGOING", labelKey: "admin.projects.filter_ongoing" },
];

export function ProjectsPage() {
  const { t } = useTranslation();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedBranchId } = useAdminScopeStore();
  const pillarLabels = usePillarLabels();

  const [statusTab, setStatusTab] = useState<StatusTab>(undefined);
  const [phase, setPhase] = useState<ProjectPhase | undefined>(undefined);
  const reviewStatus = statusTab === "TO_PUBLISH" ? undefined : statusTab;
  const { data, isLoading, isError, error, refetch } = useAdminProjects({
    reviewStatus,
    phase,
    completionRequested: statusTab === "TO_PUBLISH",
  });

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
  const setVisibility = useSetProjectVisibility();
  const publishAchievement = usePublishAchievement();
  const [rejecting, setRejecting] = useState<Project | undefined>(undefined);
  const [deleting, setDeleting] = useState<Project | undefined>(undefined);

  const counts = data?.counts;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.projects.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(isSuperAdmin ? "admin.projects.subtitle_super" : "admin.projects.subtitle_branch")}
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
          {t("admin.projects.add")}
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
          {STATUS_TABS.map((tab) => {
            const count = tab.value ? counts?.[tab.value === "TO_PUBLISH" ? "COMPLETION_REQUESTED" : tab.value] : undefined;
            return (
              <button
                key={tab.labelKey}
                type="button"
                onClick={() => setStatusTab(tab.value)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  statusTab === tab.value
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                {t(tab.labelKey)}
                {count !== undefined && count > 0 && (
                  <span
                    className={clsx(
                      "rounded-full px-1.5 text-[11px] font-bold",
                      tab.value === "PENDING" ? "bg-orange-600 text-white" : tab.value === "TO_PUBLISH" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
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
            <option key={f.labelKey} value={f.value ?? ""}>
              {t(f.labelKey)}
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
      ) : isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
          {t(
            statusTab === "PENDING"
              ? "admin.projects.empty_pending"
              : statusTab === "TO_PUBLISH"
                ? "admin.projects.empty_to_publish"
                : "admin.projects.empty",
          )}
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
                  {!project.isVisible && <ProjectHiddenBadge />}
                  {project.completionRequestedAt && project.phase === "ONGOING" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <Flag className="h-3 w-3" aria-hidden /> {t("admin.projects.completion_badge")}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">
                  {(isSuperAdmin && selectedBranchId === "all") ? `${project.branchName} · ` : ""}
                  {pillarLabels[project.pillar]}
                  {project.authorName ? ` · ${project.authorName}` : ""}
                </p>
                {project.reviewStatus === "REJECTED" && project.rejectionReason && (
                  <p className="mt-1 truncate text-xs text-red-600 dark:text-red-400">{t("admin.projects.reason_inline", { reason: project.rejectionReason })}</p>
                )}
              </div>

              {/* Projets proposés par les membres : validés par l'admin de l'antenne (ou le Super Admin) */}
              {project.reviewStatus === "PENDING" && (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check className="h-4 w-4" />}
                    disabled={approve.isPending}
                    onClick={() => approve.mutate(project.id, { onError: showError, onSuccess: () => showSuccess(t("admin.feedback.project_approved"), project.title) })}
                  >
                    {t("admin.projects.approve")}
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 font-semibold text-white hover:bg-red-700"
                    icon={<X className="h-4 w-4" />}
                    onClick={() => setRejecting(project)}
                  >
                    {t("admin.projects.reject")}
                  </Button>
                </div>
              )}

              {project.completionRequestedAt && project.phase === "ONGOING" && project.reviewStatus === "APPROVED" && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  icon={<Trophy className="h-4 w-4" />}
                  disabled={publishAchievement.isPending}
                  onClick={() =>
                    publishAchievement.mutate(project.id, {
                      onError: showError,
                      onSuccess: () => showSuccess(t("admin.feedback.achievement_published"), project.title),
                    })
                  }
                >
                  {t("admin.projects.publish_achievement")}
                </Button>
              )}

              <button
                type="button"
                onClick={() =>
                  setVisibility.mutate(
                    { projectId: project.id, isVisible: !project.isVisible },
                    {
                      onError: showError,
                      onSuccess: (saved) =>
                        showSuccess(t(saved.isVisible ? "admin.feedback.project_shown" : "admin.feedback.project_hidden"), saved.title),
                    },
                  )
                }
                disabled={setVisibility.isPending}
                title={t(project.isVisible ? "admin.projects.hide" : "admin.projects.show")}
                aria-label={t(project.isVisible ? "admin.projects.hide" : "admin.projects.show")}
                aria-pressed={!project.isVisible}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                {project.isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditing(project);
                }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={t("common.edit")}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setDeleting(project)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label={t("common.delete")}
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
          try {
            await reject.mutateAsync({ projectId: rejecting.id, reason });
            showSuccess(t("admin.feedback.project_rejected"), rejecting.title, { tone: "info" });
            setRejecting(undefined);
          } catch (err) {
            showError(err);
          }
        }}
        onCancel={() => setRejecting(undefined)}
      />

      <ConfirmDialog
        open={!!deleting}
        title={t("common.delete")}
        message={t("admin.projects.delete_confirm", { title: deleting?.title ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (deleting) {
            const title = deleting.title;
            deleteProject.mutate(deleting.id, { onError: showError, onSuccess: () => showSuccess(t("admin.feedback.project_deleted"), title) });
          }
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
