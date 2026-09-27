import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useProjects } from "../../hooks/useProjects";
import { PHASE_PATH, type ProjectPhase } from "../../types/project";
import { ProjectCard } from "./ProjectCard";
import { Skeleton } from "../ui/Skeleton";

interface ProjectsShowcaseProps {
  phase: ProjectPhase;
  /** Limit to one branch (branch page); all branches otherwise (home page). */
  branchId?: number;
  count?: number;
  title: string;
  /** Shown when there is nothing to display; the block is hidden entirely when omitted. */
  emptyText?: string;
}

/** A row of the latest published achievements or ongoing projects, with a « see all » link. */
export function ProjectsShowcase({ phase, branchId, count = 3, title, emptyText }: ProjectsShowcaseProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useProjects({ phase, branchId, pageSize: count });

  if (isError) return null; // secondary block: the dedicated pages report errors
  if (!isLoading && (!data || data.items.length === 0) && !emptyText) return null;

  const seeAll = `/${PHASE_PATH[phase]}${branchId ? `?antenne=${branchId}` : ""}`;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h3>
        {data && data.total > 0 && (
          <Link to={seeAll} className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400">
            {t("projects.see_all", { count: data.total })} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      {isLoading ? (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{emptyText}</p>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
