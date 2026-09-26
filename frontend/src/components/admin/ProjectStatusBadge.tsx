import clsx from "clsx";
import { PHASE_LABELS, type ProjectPhase, type ProjectReviewStatus } from "../../types/project";

const BASE = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const STATUS: Record<ProjectReviewStatus, { label: string; className: string }> = {
  PENDING: {
    label: "En attente",
    className: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30",
  },
  APPROVED: {
    label: "Publié",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  REJECTED: {
    label: "Refusé",
    className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  },
};

export function ProjectStatusBadge({ status }: { status: ProjectReviewStatus }) {
  return <span className={clsx(BASE, STATUS[status].className)}>{STATUS[status].label}</span>;
}

export function ProjectPhaseBadge({ phase }: { phase: ProjectPhase }) {
  return (
    <span className={clsx(BASE, "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
      {PHASE_LABELS[phase]}
    </span>
  );
}
