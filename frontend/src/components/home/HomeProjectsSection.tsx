import { useTranslation } from "react-i18next";
import { ProjectsShowcase } from "../projects/ProjectsShowcase";
import { useCanSeeMemberContent } from "../../hooks/useProjects";
import { ACHIEVEMENT_CATEGORIES } from "../../types/project";

/**
 * Home page « Nos réalisations »: one row per rubric (Éducation, Événementiels, Projets
 * entrepreneuriaux; « À venir » while empty), then ongoing projects for members.
 */
export function HomeProjectsSection() {
  const { t } = useTranslation();
  const memberView = useCanSeeMemberContent();
  return (
    <section id="realisations" className="cem-photo-section dark py-24 lg:py-32">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("home_projects.title")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{t("home_projects.subtitle")}</p>
        </div>
        {ACHIEVEMENT_CATEGORIES.map((category) => (
          <ProjectsShowcase
            key={category}
            phase="COMPLETED"
            category={category}
            title={t(`projects.categories.${category}`)}
            emptyText={t("home_projects.coming_soon")}
          />
        ))}
        {/* Ongoing projects: members (fee up to date) and admins only */}
        {memberView && <ProjectsShowcase phase="ONGOING" title={t("home_projects.ongoing")} />}
      </div>
    </section>
  );
}
