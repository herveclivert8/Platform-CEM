import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { Drawer } from "./Drawer";
import { RichTextEditor } from "./RichTextEditor";
import { ImageDropzone } from "./ImageDropzone";
import { RejectDialog } from "./RejectDialog";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { Button } from "../ui/Button";
import { ALL_PILLARS, type Pillar } from "../../types/post";
import type { Project, ProjectInput, ProjectPhase } from "../../types/project";
import { apiErrorMessage } from "../../lib/api";
import {
  useApproveProject,
  useCreateProject,
  useRejectProject,
  useUpdateProject,
} from "../../hooks/useAdminProjects";
import { useBranches } from "../../hooks/useBranches";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useAuthStore } from "../../store/authStore";
import { useSuccessToast } from "../../hooks/useSuccessToast";

interface ProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
  /** Pre-selected branch for a new project (the back-office scope). */
  defaultBranchId?: number;
}

export function ProjectDrawer({ open, onClose, project, defaultBranchId }: ProjectDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={project ? t(`admin.projects.drawer_edit_${project.phase.toLowerCase()}`) : t("admin.projects.drawer_new")}
    >
      {/* Keyed per project so the uncontrolled RichTextEditor remounts with the right content (see PostDrawer). */}
      <ProjectForm key={project?.id ?? "new"} project={project} defaultBranchId={defaultBranchId} onDone={onClose} />
    </Drawer>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

function ProjectForm({
  project,
  defaultBranchId,
  onDone,
}: {
  project?: Project;
  defaultBranchId?: number;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: branches } = useBranches();
  const pillarLabels = usePillarLabels();

  const [branchId, setBranchId] = useState<number | undefined>(
    project?.branchId ?? (isSuperAdmin ? defaultBranchId : (user?.branchId ?? undefined)),
  );
  const [phase, setPhase] = useState<ProjectPhase>(project?.phase ?? "COMPLETED");
  const [title, setTitle] = useState(project?.title ?? "");
  const [summary, setSummary] = useState(project?.summary ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [pillar, setPillar] = useState<Pillar>(project?.pillar ?? "EDUCATION");
  const [beneficiaries, setBeneficiaries] = useState(project?.beneficiaries ?? "");
  const [beneficiariesCount, setBeneficiariesCount] = useState(project?.beneficiariesCount?.toString() ?? "");
  const [goalValue, setGoalValue] = useState(project?.goalValue?.toString() ?? "");
  const [progressValue, setProgressValue] = useState(project?.progressValue?.toString() ?? "");
  const [goalUnit, setGoalUnit] = useState(project?.goalUnit ?? "");
  const [isVisible, setIsVisible] = useState(project?.isVisible ?? true);
  const [location, setLocation] = useState(project?.location ?? "");
  const [startDate, setStartDate] = useState(project?.startDate ?? "");
  const [endDate, setEndDate] = useState(project?.endDate ?? "");
  const [images, setImages] = useState<string[]>(project?.images ?? []);
  const [rejectOpen, setRejectOpen] = useState(false);

  const createProject = useCreateProject();
  const updateProject = useUpdateProject(project?.id);
  const approveProject = useApproveProject();
  const rejectProject = useRejectProject();

  const mutation = project ? updateProject : createProject;
  const isSaving = mutation.isPending;
  const isCompleted = phase === "COMPLETED";
  const canSave =
    !!branchId && !!title.trim() && !!summary.trim() && !!description.trim() && !!beneficiaries.trim() && (!isCompleted || !!endDate);

  const save = async () => {
    const payload: ProjectInput = {
      title: title.trim(),
      summary: summary.trim(),
      description,
      pillar,
      phase,
      beneficiaries: beneficiaries.trim(),
      beneficiaries_count: beneficiariesCount ? Number(beneficiariesCount) : null,
      // Sans objectif, pas de barre d'avancement : on n'envoie ni valeur atteinte ni unité seules
      goal_value: goalValue ? Number(goalValue) : null,
      progress_value: goalValue && progressValue ? Number(progressValue) : null,
      goal_unit: goalValue ? goalUnit.trim() || null : null,
      is_visible: isVisible,
      location: location.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      images,
    };
    try {
      const saved = project
        ? await updateProject.mutateAsync(payload)
        : await createProject.mutateAsync({ ...payload, branch_id: branchId });
      // Ce qui s'est réellement passé : soumis au siège, publié, ou enregistré (masqué / sans nouvelle validation)
      const key =
        saved.reviewStatus === "PENDING"
          ? "admin.feedback.project_submitted"
          : saved.reviewStatus === "APPROVED" && saved.isVisible
            ? "admin.feedback.project_published"
            : saved.reviewStatus === "APPROVED"
              ? "admin.feedback.project_saved_hidden"
              : "admin.feedback.project_saved";
      showSuccess(t(key), saved.title);
      onDone();
    } catch {
      // affiché sous le formulaire (mutation.isError)
    }
  };

  // En cas d'échec, l'erreur est affichée sous le formulaire (approveProject / rejectProject.isError)
  const approve = async () => {
    if (!project) return;
    try {
      await approveProject.mutateAsync(project.id);
      showSuccess(t("admin.feedback.project_approved"), project.title);
      onDone();
    } catch {
      // affichée sous le formulaire
    }
  };

  const reject = async (reason: string) => {
    if (!project) return;
    try {
      await rejectProject.mutateAsync({ projectId: project.id, reason });
      showSuccess(t("admin.feedback.project_rejected"), project.title, { tone: "info" });
      onDone();
    } catch {
      // affichée sous le formulaire
    } finally {
      setRejectOpen(false);
    }
  };

  return (
    <div className="space-y-5">
      {project && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ProjectStatusBadge status={project.reviewStatus} />
          <span>
            {project.branchName}
            {project.authorName ? ` · ${t("admin.projects.added_by", { name: project.authorName })}` : ""}
          </span>
        </div>
      )}

      {isSuperAdmin && project?.reviewStatus === "PENDING" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-4 w-4" aria-hidden /> {t("admin.projects.awaiting_title")}
          </p>
          <p className="mt-1 text-xs text-orange-700/80 dark:text-orange-300/80">{t("admin.projects.awaiting_text")}</p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Check className="h-4 w-4" />}
              disabled={approveProject.isPending}
              onClick={approve}
            >
              {t("admin.projects.approve")}
            </Button>
            <Button
              size="sm"
              className="bg-red-600 font-semibold text-white hover:bg-red-700"
              icon={<X className="h-4 w-4" />}
              onClick={() => setRejectOpen(true)}
            >
              {t("admin.projects.reject")}
            </Button>
          </div>
        </div>
      )}

      {project?.reviewStatus === "REJECTED" && project.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-500/30 dark:bg-red-500/10">
          <p className="font-semibold text-red-700 dark:text-red-300">{t("admin.projects.reason_title")}</p>
          <p className="mt-1 text-red-700/90 dark:text-red-300/90">{project.rejectionReason}</p>
        </div>
      )}

      {!isSuperAdmin && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {t(project?.reviewStatus === "APPROVED" ? "admin.projects.notice_online" : "admin.projects.notice_review")}
        </p>
      )}

      <Field label={t("admin.projects.field_type")}>
        <div className="grid grid-cols-2 gap-2">
          {(["COMPLETED", "ONGOING"] as ProjectPhase[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPhase(p)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                phase === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
              }`}
            >
              {t(p === "COMPLETED" ? "admin.projects.type_completed" : "admin.projects.type_ongoing")}
            </button>
          ))}
        </div>
      </Field>

      {isSuperAdmin && !project && (
        <Field label={t("admin.projects.field_branch")}>
          <select
            value={branchId ?? ""}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className={inputClass}
          >
            <option value="">{t("admin.projects.choose_branch")}</option>
            {branches?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label={t("admin.projects.field_title")}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("admin.projects.placeholder_title")} className={inputClass} />
      </Field>

      <Field label={t("admin.projects.field_summary")} hint={t("admin.projects.summary_hint", { count: summary.length })}>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value.slice(0, 500))}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <Field label={t("admin.projects.field_pillar")}>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PILLARS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPillar(p)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                pillar === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
              }`}
            >
              {pillarLabels[p]}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Field label={t("admin.projects.field_beneficiaries")}>
            <input value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} placeholder={t("admin.projects.placeholder_beneficiaries")} className={inputClass} />
          </Field>
        </div>
        <Field label={t("admin.projects.field_count")}>
          <input
            type="number"
            min={0}
            value={beneficiariesCount}
            onChange={(e) => setBeneficiariesCount(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.projects.field_goal")}</p>
        <div className="grid grid-cols-3 gap-3">
          <input type="number" min={0} value={progressValue} onChange={(e) => setProgressValue(e.target.value)}
            aria-label={t("admin.projects.goal_progress")} placeholder={t("admin.projects.goal_progress")} className={inputClass} />
          <input type="number" min={1} value={goalValue} onChange={(e) => setGoalValue(e.target.value)}
            aria-label={t("admin.projects.goal_target")} placeholder={t("admin.projects.goal_target")} className={inputClass} />
          <input value={goalUnit} maxLength={100} onChange={(e) => setGoalUnit(e.target.value)}
            aria-label={t("admin.projects.goal_unit")} placeholder={t("admin.projects.goal_unit_placeholder")} className={inputClass} />
        </div>
        <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{t("admin.projects.goal_hint")}</p>
      </div>

      <Field label={t("admin.projects.field_location")}>
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("admin.projects.placeholder_location")} className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("admin.projects.field_start")}>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t(isCompleted ? "admin.projects.field_end_required" : "admin.projects.field_end_planned")}>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <Field label={t("admin.projects.field_description")}>
        <RichTextEditor value={description} onChange={setDescription} placeholder={t("admin.projects.placeholder_description")} />
      </Field>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
        <input
          type="checkbox"
          checked={isVisible}
          onChange={(e) => setIsVisible(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-emerald-600"
        />
        <span>
          <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t("admin.projects.visible_label")}</span>
          <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{t("admin.projects.visible_hint")}</span>
        </span>
      </label>

      <Field label={t("admin.projects.field_photos")}>
        <ImageDropzone images={images} onChange={setImages} />
      </Field>

      {mutation.isError && <p className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(mutation.error, t("admin.projects.save_error"))}</p>}
      {(approveProject.isError || rejectProject.isError) && (
        <p className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(approveProject.error ?? rejectProject.error, t("admin.projects.decision_error"))}</p>
      )}

      <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button variant="secondary" className="w-full justify-center" disabled={!canSave || isSaving} onClick={save}>
          {isSaving ? "…" : t(isSuperAdmin ? (project ? "admin.projects.save" : "admin.projects.publish") : "admin.projects.submit")}
        </Button>
      </div>

      {project && (
        <RejectDialog
          open={rejectOpen}
          projectTitle={project.title}
          isPending={rejectProject.isPending}
          onConfirm={reject}
          onCancel={() => setRejectOpen(false)}
        />
      )}
    </div>
  );
}
