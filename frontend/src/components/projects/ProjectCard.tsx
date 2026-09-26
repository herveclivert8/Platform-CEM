import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { PHASE_PATH, type Project } from "../../types/project";
import { formatProjectPeriod } from "./formatProjectPeriod";

export function ProjectCard({ project }: { project: Project }) {
  const { t, i18n } = useTranslation();
  const pillarLabels = usePillarLabels();
  const period = formatProjectPeriod(project, t, i18n.language);

  return (
    <Link to={`/${PHASE_PATH[project.phase]}/${project.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {project.images[0] && (
            <img
              src={project.images[0]}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur-sm dark:bg-slate-900/80 dark:text-slate-200">
            {project.branchName}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <Badge tone={project.phase === "COMPLETED" ? "emerald" : "orange"} className="w-fit">
            {pillarLabels[project.pillar]}
          </Badge>
          <h3 className="mt-3 text-lg font-bold tracking-tight text-slate-900 dark:text-white">{project.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm text-slate-500 dark:text-slate-400">{project.summary}</p>
          <div className="mt-auto space-y-1.5 pt-4 text-xs text-slate-500 dark:text-slate-400">
            <p className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {project.beneficiariesCount != null ? `${project.beneficiariesCount.toLocaleString(i18n.language)} · ` : ""}
              {project.beneficiaries}
            </p>
            {project.location && (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {project.location}
              </p>
            )}
            {period && (
              <p className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {period}
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
