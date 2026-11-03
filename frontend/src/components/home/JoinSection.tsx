import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAboutText } from "../../hooks/useAboutPage";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "../ui/buttonStyles";
import { useAuthStore } from "../../store/authStore";
import { MEMBERSHIP_TYPES } from "../../config/membershipTypes";

/** Home page call to join the association, with the three membership types (hidden once signed in). */
export function JoinSection() {
  const { t } = useTranslation();
  const aboutText = useAboutText();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return null;

  return (
    <section className="cem-photo-section dark">
      <div className="mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:py-36 lg:px-8">
        <h2 className="max-w-3xl text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          {t("join.title_before")}
          <span className="text-emerald-600 dark:text-emerald-400">{t("join.title_accent")}</span>.
        </h2>
        <div className="mt-8 max-w-2xl">
          <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">{t("join.text")}</p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {MEMBERSHIP_TYPES.map(({ key, icon: Icon }) => (
            <Link
              key={key}
              to={key === "ACTIVE" ? "/adhesion" : `/adhesion?contact=${key}`}
              className="group border border-slate-200 bg-white/90 p-6 transition-colors hover:border-emerald-500 dark:border-slate-800 dark:bg-slate-900/90"
            >
              <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <h3 className="mt-4 text-lg font-extrabold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                {t(`membership_types.${key}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{aboutText(`membership_types.${key}.summary`)}</p>
            </Link>
          ))}
        </div>
        <Link to="/adhesion" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-8" })}>
          {t("join.cta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
