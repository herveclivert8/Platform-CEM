import clsx from "clsx";
import { EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectPhase, ProjectReviewStatus } from "../../types/project";

const BASE = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

const STATUS: Record<ProjectReviewStatus, { labelKey: string; className: string }> = {
  PENDING: {
    labelKey: "admin.projects.status_pending",
    className: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/30",
  },
  APPROVED: {
    labelKey: "admin.projects.status_approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  REJECTED: {
    labelKey: "admin.projects.status_rejected",
    className: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  },
};

export function ProjectStatusBadge({ status }: { status: ProjectReviewStatus }) {
  const { t } = useTranslation();
  return <span className={clsx(BASE, STATUS[status].className)}>{t(STATUS[status].labelKey)}</span>;
}

export function ProjectPhaseBadge({ phase }: { phase: ProjectPhase }) {
  const { t } = useTranslation();
  return (
    <span className={clsx(BASE, "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300")}>
      {t(phase === "COMPLETED" ? "admin.projects.phase_completed" : "admin.projects.phase_ongoing")}
    </span>
  );
}

/** « Masqué » : not shown on the platform, back-office only. */
export function ProjectHiddenBadge() {
  const { t } = useTranslation();
  return (
    <span className={clsx(BASE, "gap-1 border-slate-300 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-400")}>
      <EyeOff className="h-3 w-3" aria-hidden /> {t("admin.projects.hidden_badge")}
    </span>
  );
}
