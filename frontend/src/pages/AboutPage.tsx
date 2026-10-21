import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Briefcase, HeartHandshake, Landmark, Scale, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { buttonClasses } from "../components/ui/buttonStyles";
import { usePageMeta } from "../hooks/usePageMeta";
import { useDonationUiStore } from "../store/donationUiStore";
import { useAuthStore } from "../store/authStore";
import { ASSOCIATION } from "../config/association";

const VALUES = [
  { key: "excellence", icon: Sparkles },
  { key: "equality", icon: Scale },
  { key: "independence", icon: ShieldCheck },
  { key: "transparency", icon: Landmark },
] as const;

const PILLARS = [
  { key: "EDUCATION", icon: BookOpen },
  { key: "SOCIAL", icon: HeartHandshake },
  { key: "SPORT", icon: Trophy },
  { key: "ENTERPRISE", icon: Briefcase },
] as const;

/** « Qui sommes-nous » : mission, values, fields of action, network, institutional partnership, legal identity. */
export function AboutPage() {
  const { t } = useTranslation();
  usePageMeta(t("about.title"), t("about.intro"));
  const openDonation = useDonationUiStore((s) => s.open);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const sectionTitle = "text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl dark:text-white";
  const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400";

  return (
    <div>
      {/* Mission */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <p className={eyebrow}>{t("about.title")}</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          {t("about.headline_before")}
          <span className="text-emerald-600 dark:text-emerald-400">{t("about.headline_accent")}</span>
          {t("about.headline_after")}
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{t("about.intro")}</p>
          <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{t("about.intro_2")}</p>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-28 sm:px-6 lg:px-8">
          <h2 className={sectionTitle}>{t("about.values_title")}</h2>
          <div className="mt-10 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
            {VALUES.map(({ key, icon: Icon }) => (
              <div key={key} className="bg-white p-7 dark:bg-slate-900">
                <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">{t(`about.values.${key}.title`)}</h3>
                <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{t(`about.values.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fields of action */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:py-28 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={sectionTitle}>{t("about.pillars_title")}</h2>
          <Link to="/realisations" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            {t("about.see_achievements")} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">{t("about.pillars_text")}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ key, icon: Icon }) => (
            <div key={key} className="border border-slate-200 p-6 dark:border-slate-800">
              <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-white">{t(`pillars.${key}`)}</h3>
              <p className="mt-2 text-slate-600 dark:text-slate-300">{t(`about.pillars.${key}`)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Network + institutional partnership */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 lg:pb-28 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="bg-slate-900 p-8 text-white sm:p-10 dark:bg-white dark:text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300 dark:text-emerald-700">{t("about.network_eyebrow")}</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight">{t("about.network_title")}</h2>
          <p className="mt-4 leading-relaxed text-slate-300 dark:text-slate-600">{t("about.network_text")}</p>
          <Link to="/antennes" className={buttonClasses({ variant: "primary", className: "mt-8" })}>
            {t("about.network_cta")} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="border border-slate-200 bg-white p-8 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          <p className={eyebrow}>{t("about.partner_eyebrow")}</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight text-slate-900 dark:text-white">{t("about.partner_title")}</h2>
          <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">{t("about.partner_text")}</p>
          <ul className="mt-5 space-y-2 text-slate-700 dark:text-slate-300">
            {(["skills", "resources", "excellence"] as const).map((key) => (
              <li key={key} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
                {t(`about.partner_goals.${key}`)}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-slate-600 dark:text-slate-300">
            {t("about.partner_example")}{" "}
            <Link to="/realisations" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              {t("about.partner_example_link")}
            </Link>
          </p>
        </div>
      </section>

      {/* Legal identity + call to action */}
      <section className="border-t border-slate-200 dark:border-white/10">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-10 px-4 py-20 lg:py-28 sm:px-6 lg:px-8">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t("about.legal_title")}</h2>
            <dl className="mt-5 grid gap-x-10 gap-y-3 text-slate-700 sm:grid-cols-2 dark:text-slate-300">
              <div><dt className="text-sm text-slate-500 dark:text-slate-400">{t("about.legal_status")}</dt><dd className="font-semibold">{t("about.legal_status_value")}</dd></div>
              <div><dt className="text-sm text-slate-500 dark:text-slate-400">{t("about.legal_seat")}</dt><dd className="font-semibold">{t("footer.address")}</dd></div>
              <div><dt className="text-sm text-slate-500 dark:text-slate-400">RNA</dt><dd className="font-semibold">{ASSOCIATION.rna}</dd></div>
              <div><dt className="text-sm text-slate-500 dark:text-slate-400">SIREN</dt><dd className="font-semibold">{ASSOCIATION.siren}</dd></div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-3">
            {!isAuthenticated && (
              <Link to="/inscription" className={buttonClasses({ variant: "primary", size: "lg" })}>
                {t("hero.cta_member")}
              </Link>
            )}
            <button type="button" onClick={() => openDonation()} className={buttonClasses({ variant: "ghost", size: "lg", className: "border border-slate-900 dark:border-white" })}>
              {t("hero.cta_primary")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
