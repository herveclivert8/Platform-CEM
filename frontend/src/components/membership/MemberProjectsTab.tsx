import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FolderPlus } from "lucide-react";
import { Button } from "../ui/Button";
import { MemberProjectForm } from "./MemberProjectForm";
import { Notice, Panel, Pill, type PillTone } from "./memberUi";
import { PHASE_PATH, type Project, type ProjectReviewStatus } from "../../types/project";

const REVIEW_TONES: Record<ProjectReviewStatus, PillTone> = { PENDING: "warn", APPROVED: "ok", REJECTED: "bad" };

/** One line per project: title (linked once published) and its review status. */
export function MemberProjectList({ projects, limit }: { projects: Project[]; limit?: number }) {
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
          <Pill tone={REVIEW_TONES[p.reviewStatus]}>{t(`member.review_status.${p.reviewStatus}`)}</Pill>
          {p.reviewStatus === "REJECTED" && p.rejectionReason && (
            <p className="w-full text-sm text-red-600 dark:text-red-400">{p.rejectionReason}</p>
          )}
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
          <MemberProjectList projects={projects} />
        </div>
      ) : (
        !proposing && <p className="mt-6 text-slate-500 dark:text-slate-400">{t("member.no_projects")}</p>
      )}
    </Panel>
  );
}
