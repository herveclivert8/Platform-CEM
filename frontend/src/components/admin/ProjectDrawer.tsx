import { useState } from "react";
import axios from "axios";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import { Drawer } from "./Drawer";
import { RichTextEditor } from "./RichTextEditor";
import { ImageDropzone } from "./ImageDropzone";
import { RejectDialog } from "./RejectDialog";
import { ProjectStatusBadge } from "./ProjectStatusBadge";
import { Button } from "../ui/Button";
import { ALL_PILLARS, type Pillar } from "../../types/post";
import { PHASE_LABELS, type Project, type ProjectInput, type ProjectPhase } from "../../types/project";
import {
  useApproveProject,
  useCreateProject,
  useRejectProject,
  useUpdateProject,
} from "../../hooks/useAdminProjects";
import { useBranches } from "../../hooks/useBranches";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useAuthStore } from "../../store/authStore";

interface ProjectDrawerProps {
  open: boolean;
  onClose: () => void;
  project?: Project;
  /** Pre-selected branch for a new project (the back-office scope). */
  defaultBranchId?: number;
}

export function ProjectDrawer({ open, onClose, project, defaultBranchId }: ProjectDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={project ? `Modifier : ${PHASE_LABELS[project.phase].toLowerCase()}` : "Nouveau projet / réalisation"}
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

function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    const firstError = error.response?.data?.errors?.[0]?.message;
    if (typeof detail === "string" && detail !== "Erreur de validation") return detail;
    if (typeof firstError === "string") return firstError.replace(/^Value error, /, "");
  }
  return "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.";
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
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { data: branches } = useBranches({ pageSize: 100 });
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
      location: location.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      images,
    };
    if (project) await updateProject.mutateAsync(payload);
    else await createProject.mutateAsync({ ...payload, branch_id: branchId });
    onDone();
  };

  const approve = async () => {
    if (!project) return;
    await approveProject.mutateAsync(project.id);
    onDone();
  };

  const reject = async (reason: string) => {
    if (!project) return;
    await rejectProject.mutateAsync({ projectId: project.id, reason });
    setRejectOpen(false);
    onDone();
  };

  return (
    <div className="space-y-5">
      {project && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <ProjectStatusBadge status={project.reviewStatus} />
          <span>
            {project.branchName}
            {project.authorName ? ` · ajouté par ${project.authorName}` : ""}
          </span>
        </div>
      )}

      {isSuperAdmin && project?.reviewStatus === "PENDING" && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-700 dark:text-orange-300">
            <AlertTriangle className="h-4 w-4" aria-hidden /> En attente de votre validation
          </p>
          <p className="mt-1 text-xs text-orange-700/80 dark:text-orange-300/80">
            Une fois validé, l'élément est publié immédiatement sur le site et l'auteur est notifié.
          </p>
          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Check className="h-4 w-4" />}
              disabled={approveProject.isPending}
              onClick={approve}
            >
              Valider
            </Button>
            <Button
              size="sm"
              className="bg-red-600 font-semibold text-white hover:bg-red-700"
              icon={<X className="h-4 w-4" />}
              onClick={() => setRejectOpen(true)}
            >
              Refuser
            </Button>
          </div>
        </div>
      )}

      {project?.reviewStatus === "REJECTED" && project.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm dark:border-red-500/30 dark:bg-red-500/10">
          <p className="font-semibold text-red-700 dark:text-red-300">Motif du refus</p>
          <p className="mt-1 text-red-700/90 dark:text-red-300/90">{project.rejectionReason}</p>
        </div>
      )}

      {!isSuperAdmin && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {project?.reviewStatus === "APPROVED"
            ? "Cet élément est en ligne. Toute modification le retire du site jusqu'à ce que le siège la valide."
            : "Votre ajout sera soumis à la validation du siège avant d'être publié sur le site."}
        </p>
      )}

      <Field label="Type">
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
              {p === "COMPLETED" ? "Réalisation (terminé)" : "Projet en cours"}
            </button>
          ))}
        </div>
      </Field>

      {isSuperAdmin && !project && (
        <Field label="Antenne">
          <select
            value={branchId ?? ""}
            onChange={(e) => setBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className={inputClass}
          >
            <option value="">Choisir une antenne…</option>
            {branches?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Nom du projet">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Bibliothèque de l'EPP Ambohipo" className={inputClass} />
      </Field>

      <Field label="Résumé" hint={`${summary.length}/500 — affiché sur les cartes du site.`}>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value.slice(0, 500))}
          rows={2}
          className={`${inputClass} resize-none`}
        />
      </Field>

      <Field label="Pilier">
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
          <Field label="Bénéficiaires">
            <input value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} placeholder="Ex. : Élèves de l'EPP" className={inputClass} />
          </Field>
        </div>
        <Field label="Nombre">
          <input
            type="number"
            min={0}
            value={beneficiariesCount}
            onChange={(e) => setBeneficiariesCount(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Lieu">
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex. : Isotry, Antananarivo" className={inputClass} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date de début">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputClass} />
        </Field>
        <Field label={isCompleted ? "Date de fin *" : "Date de fin (prévue)"}>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputClass} />
        </Field>
      </div>

      <Field label="Description">
        <RichTextEditor value={description} onChange={setDescription} placeholder="Objectifs, déroulement, résultats…" />
      </Field>

      <Field label="Photos">
        <ImageDropzone images={images} onChange={setImages} />
      </Field>

      {mutation.isError && <p className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(mutation.error)}</p>}
      {(approveProject.isError || rejectProject.isError) && (
        <p className="text-sm text-red-600 dark:text-red-400">La décision n'a pas pu être enregistrée. Veuillez réessayer.</p>
      )}

      <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button variant="secondary" className="w-full justify-center" disabled={!canSave || isSaving} onClick={save}>
          {isSaving ? "…" : isSuperAdmin ? (project ? "Enregistrer" : "Publier") : "Soumettre pour validation"}
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
