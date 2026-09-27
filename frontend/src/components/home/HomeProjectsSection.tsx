import { useTranslation } from "react-i18next";
import { ProjectsShowcase } from "../projects/ProjectsShowcase";

/** Home page: latest achievements and ongoing projects (each row hidden when empty). */
export function HomeProjectsSection() {
  const { t } = useTranslation();
  return (
    <section id="realisations" className="bg-white py-20 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl space-y-14 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("home_projects.title")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{t("home_projects.subtitle")}</p>
        </div>
        <ProjectsShowcase phase="COMPLETED" title={t("home_projects.latest_achievements")} />
        <ProjectsShowcase phase="ONGOING" title={t("home_projects.ongoing")} />
      </div>
    </section>
  );
}
