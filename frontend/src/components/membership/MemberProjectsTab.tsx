import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Flag, FolderPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { MemberProjectForm } from "./MemberProjectForm";
import { Notice, Panel, Pill, type PillTone } from "./memberUi";
import { PHASE_PATH, type Project, type ProjectReviewStatus } from "../../types/project";
import { useMarkProjectCompleted } from "../../hooks/useMembership";
import { apiErrorMessage } from "../../lib/api";

const REVIEW_TONES: Record<ProjectReviewStatus, PillTone> = { PENDING: "warn", APPROVED: "ok", REJECTED: "bad" };

/**
 * Ongoing published project: the member flags it as achieved (with an optional note); the branch
 * admin is notified and publishes it as an achievement.
 */
function MarkCompleted({ project }: { project: Project }) {
  const { t } = useTranslation();
  const markCompleted = useMarkProjectCompleted();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!open) {
    return (
      <Button variant="secondary" size="sm" icon={<Flag className="h-4 w-4" />} onClick={() => setOpen(true)}>
        {t("member.project.mark_completed")}
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm text-slate-600 dark:text-slate-300">{t("member.project.mark_completed_text")}</p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder={t("member.project.completion_note_placeholder")}
        aria-label={t("member.project.completion_note")}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
      {markCompleted.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(markCompleted.error, t("member.project.mark_completed_error"))}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          size="sm"
          disabled={markCompleted.isPending}
          onClick={() => markCompleted.mutate({ projectId: project.id, note }, { onSuccess: () => setOpen(false) })}
        >
          {t("member.project.mark_completed_confirm")}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}

/** One line per project: title (linked once published), its review status and where it stands. */
export function MemberProjectList({ projects, limit, canFlag = false }: { projects: Project[]; limit?: number; canFlag?: boolean }) {
  const { t } = useTranslation();
  return (
    <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
      {projects.slice(0, limit).map((p) => (
        <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
          {p.reviewStatus === "APPROVED" && p.isVisible ? (
            <Link to={`/${PHASE_PATH[p.phase]}/${p.id}`} className="font-semibold text-slate-900 hover:underline dark:text-white">
              {p.title}
            </Link>
          ) : (
            <span className="font-semibold text-slate-900 dark:text-white">{p.title}</span>
          )}
          <span className="flex flex-wrap gap-2">
            <Pill tone={REVIEW_TONES[p.reviewStatus]}>{t(`member.review_status.${p.reviewStatus}`)}</Pill>
            {p.reviewStatus === "APPROVED" && p.phase === "COMPLETED" && <Pill tone="ok">{t("member.project.achievement")}</Pill>}
            {p.reviewStatus === "APPROVED" && p.phase === "ONGOING" && p.completionRequestedAt && (
              <Pill tone="warn">{t("member.project.completion_pending")}</Pill>
            )}
          </span>
          {p.reviewStatus === "REJECTED" && p.rejectionReason && (
            <p className="w-full text-sm text-red-600 dark:text-red-400">{p.rejectionReason}</p>
          )}
          {canFlag && p.reviewStatus === "APPROVED" && p.phase === "ONGOING" && !p.completionRequestedAt && <MarkCompleted project={p} />}
        </li>
      ))}
    </ul>
  );
}

/** "Mes projets" tab: propose a project (members with their fee paid) and follow its review. */
export function MemberProjectsTab({ projects, hasAccess, startProposing }: { projects: Project[]; hasAccess: boolean; startProposing: boolean }) {
  const { t } = useTranslation();
  const [proposing, setProposing] = useState(startProposing);

  return (
    <Panel title={t("member.projects_title")}>
      {!hasAccess ? (
        <Notice>{t("member.projects_locked")}</Notice>
      ) : proposing ? (
        <MemberProjectForm onDone={() => setProposing(false)} />
      ) : (
        <Button variant="primary" icon={<FolderPlus className="h-4 w-4" />} onClick={() => setProposing(true)}>
          {t("member.project.new")}
        </Button>
      )}
      {projects.length > 0 ? (
        <div className="mt-6">
          <MemberProjectList projects={projects} canFlag />
        </div>
      ) : (
        !proposing && <p className="mt-6 text-slate-500 dark:text-slate-400">{t("member.no_projects")}</p>
      )}
    </Panel>
  );
}
