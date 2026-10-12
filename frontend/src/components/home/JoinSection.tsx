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
    <section className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-10 px-4 py-24 sm:px-6 lg:px-8">
        <h2 className="max-w-3xl text-5xl font-extrabold leading-[0.95] text-slate-900 sm:text-6xl lg:text-8xl dark:text-white">
          {t("join.title_before")}
          <span className="text-emerald-600 dark:text-emerald-400">{t("join.title_accent")}</span>.
        </h2>
        <div className="max-w-md">
          <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-300">{t("join.text")}</p>
          <Link to="/inscription" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-7 rounded-full" })}>
            {t("join.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
