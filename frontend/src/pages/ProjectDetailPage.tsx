import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DOMPurify from "dompurify";
import { ArrowLeft, ArrowRight, CalendarDays, Expand, MapPin, Users } from "lucide-react";
import { useProject, useProjects } from "../hooks/useProjects";
import { usePillarLabels } from "../hooks/usePillarLabels";
import { useDonationUiStore } from "../store/donationUiStore";
import { PHASE_PATH, type Project, type ProjectPhase } from "../types/project";
import { formatProjectPeriod } from "../components/projects/formatProjectPeriod";
import { ProjectProgress } from "../components/projects/ProjectProgress";
import { ProjectCard } from "../components/projects/ProjectCard";
import { ImageLightbox } from "../components/projects/ImageLightbox";
import { ShareButtons } from "../components/projects/ShareButtons";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { usePageMeta } from "../hooks/usePageMeta";

const RELATED_COUNT = 3;

/** Same pillar first, then same branch, then the most recent: « Voir aussi ». */
function pickRelated(current: Project, candidates: Project[]): Project[] {
  const score = (p: Project) => (p.pillar === current.pillar ? 2 : 0) + (p.branchId === current.branchId ? 1 : 0);
  return candidates
    .filter((p) => p.id !== current.id)
    .sort((a, b) => score(b) - score(a))
    .slice(0, RELATED_COUNT);
}

export function ProjectDetailPage({ phase }: { phase: ProjectPhase }) {
  const { t, i18n } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError } = useProject(projectId ? Number(projectId) : undefined);
  const { data: siblings } = useProjects({ phase, pageSize: 12 });
  const pillarLabels = usePillarLabels();
  const openDonation = useDonationUiStore((s) => s.open);
  const [lightbox, setLightbox] = useState<number | null>(null);
  // « Voir aussi » navigates within this same page: close the gallery of the previous project
  useEffect(() => setLightbox(null), [projectId]);
  usePageMeta(project?.title ?? (isError ? t("projects.not_found") : undefined), project?.summary);

  const backPhase = project?.phase ?? phase;
  const backLink = (
    <Link
      to={`/${PHASE_PATH[backPhase]}`}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {t(backPhase === "COMPLETED" ? "projects.back_completed" : "projects.back_ongoing")}
    </Link>
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-10 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">{t("projects.not_found")}</p>
        <div className="mt-4">{backLink}</div>
      </div>
    );
  }

  // A project that has since been completed (or the other way round) lives under the other
  // section: keep old shared links working by redirecting to the right address.
  if (project.phase !== phase) {
    return <Navigate to={`/${PHASE_PATH[project.phase]}/${project.id}`} replace />;
  }

  const period = formatProjectPeriod(project, t, i18n.language);
  const facts = [
    {
      icon: Users,
      label: t("projects.beneficiaries"),
      value: `${project.beneficiariesCount != null ? `${project.beneficiariesCount.toLocaleString(i18n.language)} · ` : ""}${project.beneficiaries}`,
    },
    ...(project.location ? [{ icon: MapPin, label: t("projects.location"), value: project.location }] : []),
    ...(period ? [{ icon: CalendarDays, label: t("projects.period"), value: period }] : []),
  ];
  const related = pickRelated(project, siblings?.items ?? []);

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        {backLink}

        {project.images[0] && (
          <button
            type="button"
            onClick={() => setLightbox(0)}
            aria-label={t("projects.open_gallery")}
            className="group relative mt-6 block aspect-[16/9] w-full overflow-hidden rounded-2xl"
          >
            <img src={project.images[0]} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]" />
            {project.images.length > 1 && (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Expand className="h-3.5 w-3.5" aria-hidden /> {t("projects.photo_count", { count: project.images.length })}
              </span>
            )}
          </button>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          <Badge tone={project.phase === "COMPLETED" ? "emerald" : "orange"}>
            {t(project.phase === "COMPLETED" ? "projects.badge_completed" : "projects.badge_ongoing")}
          </Badge>
          <Badge>{pillarLabels[project.pillar]}</Badge>
        </div>

        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{project.title}</h1>
        <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">{project.summary}</p>

        {project.goalValue ? (
          <div className="mt-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {t(project.phase === "ONGOING" ? "projects.progress_title" : "projects.result_title")}
            </p>
            <ProjectProgress project={project} size="lg" />
          </div>
        ) : null}

        <dl className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-900">
          {facts.map(({ icon: Icon, label, value }) => (
            <div key={label}>
              <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
              </dt>
              <dd className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-200">{value}</dd>
            </div>
          ))}
        </dl>

        {/* Same tag set as posts (see PostContent): styled explicitly, no typography plugin. */}
        <div
          className="mt-8 text-base leading-relaxed text-slate-700 dark:text-slate-300 [&>div]:mb-4 [&>p]:mb-4 [&_a]:text-emerald-600 [&_a]:underline dark:[&_a]:text-emerald-400 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(project.description) }}
        />

        {project.images.length > 1 && (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {project.images.slice(1).map((url, i) => (
              <button
                key={url}
                type="button"
                onClick={() => setLightbox(i + 1)}
                aria-label={t("projects.gallery_label", { current: i + 2, total: project.images.length })}
                className="group aspect-square overflow-hidden rounded-xl"
              >
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-6 dark:border-slate-800">
          {project.phase === "ONGOING" && (
            <Button variant="primary" onClick={() => openDonation(project.branchId, project.branchName)}>
              {t("projects.support")}
            </Button>
          )}
          <Link
            to={`/antennes/${project.branchId}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
          >
            {t("projects.branch_link", { city: project.branchName })}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6">
          <ShareButtons title={project.title} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 py-14 dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t("projects.related")}</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      <ImageLightbox images={project.images} index={lightbox} onChange={setLightbox} />
    </>
  );
}
