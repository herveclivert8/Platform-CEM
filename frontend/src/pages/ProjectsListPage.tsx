import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useProjects } from "../hooks/useProjects";
import { useBranches } from "../hooks/useBranches";
import { usePillarLabels } from "../hooks/usePillarLabels";
import { ALL_PILLARS, type Pillar } from "../types/post";
import type { ProjectPhase } from "../types/project";
import { ProjectCard } from "../components/projects/ProjectCard";
import { Skeleton } from "../components/ui/Skeleton";
import { Button } from "../components/ui/Button";

const PAGE_SIZE = 9;

/** Public listing for one phase: "Nos réalisations" (COMPLETED) or "Projets en cours" (ONGOING). */
export function ProjectsListPage({ phase }: { phase: ProjectPhase }) {
  const { t } = useTranslation();
  const pillarLabels = usePillarLabels();
  const { data: branches } = useBranches({ pageSize: 100 });
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [pillar, setPillar] = useState<Pillar | undefined>(undefined);
  const [page, setPage] = useState(1);
  const { data, isLoading } = useProjects({ phase, branchId, pillar, page, pageSize: PAGE_SIZE });

  const key = phase === "COMPLETED" ? "completed" : "ongoing";

  const pillButton = (active: boolean) =>
    clsx(
      "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors",
      active
        ? "border-emerald-600 bg-emerald-600 text-white"
        : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400",
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
        {t(`projects.${key}_title`)}
      </h1>
      <p className="mt-3 max-w-2xl text-slate-500 dark:text-slate-400">{t(`projects.${key}_subtitle`)}</p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <select
          value={branchId ?? ""}
          onChange={(e) => {
            setBranchId(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
        >
          <option value="">{t("projects.all_branches")}</option>
          {branches?.items.map((b) => (
            <option key={b.id} value={b.id}>
              {b.cityName}
            </option>
          ))}
        </select>
        <span className="h-5 w-px bg-slate-200 dark:bg-slate-700" aria-hidden />
        <button
          type="button"
          onClick={() => {
            setPillar(undefined);
            setPage(1);
          }}
          className={pillButton(!pillar)}
        >
          {t("projects.all_pillars")}
        </button>
        {ALL_PILLARS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setPillar(p);
              setPage(1);
            }}
            className={pillButton(pillar === p)}
          >
            {pillarLabels[p]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-10 text-sm text-slate-400">{t(`projects.empty_${key}`)}</p>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="border border-slate-200 dark:border-slate-700"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                icon={<ChevronLeft className="h-4 w-4" />}
              >
                {t("projects.previous")}
              </Button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {t("projects.page", { page: data.page, total: data.totalPages })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="border border-slate-200 dark:border-slate-700"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                {t("projects.next")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
