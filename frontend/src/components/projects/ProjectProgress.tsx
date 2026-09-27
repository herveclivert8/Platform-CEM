import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { Project } from "../../types/project";

/** « 5 200 / 8 000 livres collectés » with a bar. Renders nothing when the project has no goal. */
export function ProjectProgress({ project, size = "sm" }: { project: Project; size?: "sm" | "lg" }) {
  const { i18n, t } = useTranslation();
  if (!project.goalValue) return null;
  const progress = project.progressValue ?? 0;
  const percent = Math.min(100, Math.round((progress / project.goalValue) * 100));
  const fmt = (n: number) => n.toLocaleString(i18n.language);

  return (
    <div>
      <div className={clsx("flex items-baseline justify-between gap-2", size === "lg" ? "text-sm" : "text-xs")}>
        <span className="font-semibold text-slate-800 dark:text-slate-100">
          {fmt(progress)} / {fmt(project.goalValue)} {project.goalUnit}
        </span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">{percent} %</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={t("projects.progress_label")}
        className={clsx("mt-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800", size === "lg" ? "h-3" : "h-2")}
      >
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-700" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
