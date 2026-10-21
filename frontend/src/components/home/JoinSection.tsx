import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { buttonClasses } from "../ui/buttonStyles";
import { useAuthStore } from "../../store/authStore";

/** Home page call to join the association (hidden once signed in). */
export function JoinSection() {
  const { t } = useTranslation();
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
          <Link to="/inscription" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-7" })}>
            {t("join.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
