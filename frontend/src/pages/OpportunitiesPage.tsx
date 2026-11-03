import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, ExternalLink, GraduationCap, Lightbulb, Plane } from "lucide-react";
import { buttonClasses } from "../components/ui/buttonStyles";
import { usePageMeta } from "../hooks/usePageMeta";
import { ASSOCIATION } from "../config/association";

/** « Opportunités » : studies in Italy (members apply online), CEDIMES research network, innovative projects. */
export function OpportunitiesPage() {
  const { t } = useTranslation();
  usePageMeta(t("seo.opportunities"), t("opportunities.page.intro"));
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [hash]);

  const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400";
  const sectionTitle = "mt-4 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl dark:text-white";
  const paragraph = "text-lg leading-relaxed text-slate-700 dark:text-slate-300";
  const p = (key: string) => t(`opportunities.page.${key}`);

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <p className={eyebrow}>{p("eyebrow")}</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">{p("title")}</h1>
        <p className={`mt-6 max-w-3xl ${paragraph}`}>{p("intro")}</p>
      </section>

      {/* 1 - Studies in Italy */}
      <section id="italie" className="scroll-mt-20 border-t border-slate-200 dark:border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:px-8">
          <div>
            <Plane className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h2 className={sectionTitle}>{p("italy.title")}</h2>
            <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{p("italy.presentation")}</h3>
            <div className="mt-3 space-y-4">
              <p className={paragraph}>{p("italy.p1")}</p>
              <p className={paragraph}>{p("italy.p2")}</p>
              <p className={`${paragraph} font-semibold`}>{p("italy.p3")}</p>
            </div>
          </div>
          <div className="self-start border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{p("italy.apply_title")}</h3>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{p("italy.apply_intro")}</p>
            <ul className="mt-3 space-y-2 text-slate-700 dark:text-slate-300">
              {(["apply_letter", "apply_dossier"] as const).map((key) => (
                <li key={key} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
                  {p(`italy.${key}`)}
                </li>
              ))}
            </ul>
            <Link to="/opportunites/italie/postuler" className={buttonClasses({ variant: "primary", className: "mt-7" })}>
              {p("italy.apply")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* 2 - Research and international mobility (CEDIMES) */}
      <section id="recherche" className="scroll-mt-20 border-t border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <GraduationCap className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 className={sectionTitle}>{p("research.title")}</h2>
          <div className="mt-6 max-w-4xl space-y-4">
            <p className={paragraph}>{p("research.p1")}</p>
            <p className={paragraph}>{p("research.p2")}</p>
            <p className={paragraph}>{p("research.p3")}</p>
          </div>
          {ASSOCIATION.cedimesUrl && (
            <a
              href={ASSOCIATION.cedimesUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses({ variant: "secondary", className: "mt-7" })}
            >
              {p("research.link")} <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      </section>

      {/* 3 - Innovative projects and social impact */}
      <section id="projets-innovants" className="scroll-mt-20 border-t border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
          <Lightbulb className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 className={sectionTitle}>{p("innovation.title")}</h2>
          <div className="mt-6 max-w-4xl space-y-4">
            <p className={paragraph}>{p("innovation.p1")}</p>
            <p className={paragraph}>{p("innovation.p2")}</p>
            <p className={paragraph}>{p("innovation.p3")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
