import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Briefcase, ChevronDown, FlaskConical, HandHeart, Handshake, HeartHandshake, Leaf, Lightbulb, Mountain, Sparkles } from "lucide-react";
import { buttonClasses } from "../components/ui/buttonStyles";
import { usePageMeta } from "../hooks/usePageMeta";
import { useDonationUiStore } from "../store/donationUiStore";
import { useAuthStore } from "../store/authStore";
import { ASSOCIATION } from "../config/association";
import { MEMBERSHIP_TYPES, MEMBERSHIP_TYPES_SECTION } from "../config/membershipTypes";
import { useAboutText } from "../hooks/useAboutPage";
import { useHomePage } from "../hooks/useHomePage";
import { defaultFooterValues } from "../components/layout/footerValues";
import { usePartnerGroups } from "../components/home/partners";

// Icon of each value, by position (the values are those of the footer, set in « Page d'accueil »)
const VALUE_ICONS = [HeartHandshake, Mountain, Sparkles, Lightbulb, Handshake];

const DOMAINS = [
  { key: "education", icon: BookOpen },
  { key: "enterprise", icon: Briefcase },
  { key: "research", icon: FlaskConical },
  { key: "solidarity", icon: HandHeart },
  { key: "sustainability", icon: Leaf },
] as const;

/** Details of a field of action: one point per line, « Title : text » (the title part is optional). */
function domainPoints(details: string) {
  return details
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colon = line.indexOf(":");
      return colon > 0 ? { label: line.slice(0, colon).trim(), text: line.slice(colon + 1).trim() } : { label: "", text: line };
    });
}

/** « Qui sommes-nous » : mission, values, fields of action, network, institutional partnership, membership types, legal identity. */
export function AboutPage() {
  const { t, i18n } = useTranslation();
  // Texts the Super Admin can edit (back-office « Qui sommes-nous »); the others stay translations
  const text = useAboutText();
  usePageMeta(t("about.title"), text("about.intro"));
  const openDonation = useDonationUiStore((s) => s.open);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { hash } = useLocation();
  const { data: home } = useHomePage();
  const partnerGroups = usePartnerGroups();
  const values = home?.values
    ? home.values.map((title, i) => ({ title, text: home.valueDescriptions?.[i] ?? "" }))
    : defaultFooterValues(t);

  // Links such as /qui-sommes-nous#types-adhesion (from the membership choice page)
  useEffect(() => {
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ block: "start" });
  }, [hash]);

  const sectionTitle = "text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl dark:text-white";
  const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400";

  return (
    <div>
      {/* Mission */}
      <section className="mx-auto max-w-7xl px-4 pb-20 lg:pb-28 pt-14 sm:px-6 lg:px-8 lg:pt-20">
        <p className={eyebrow}>{t("about.title")}</p>
        <h1 className="mt-5 max-w-5xl text-4xl font-extrabold text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
          {text("about.headline_before")}
          <span className="text-emerald-600 dark:text-emerald-400">{text("about.headline_accent")}</span>
          {text("about.headline_after")}
        </h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{text("about.intro")}</p>
          <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300">{text("about.intro_2")}</p>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-28 sm:px-6 lg:px-8">
          <h2 className={sectionTitle}>{text("about.values_title")}</h2>
          <div className="mt-10 grid gap-px overflow-hidden border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-5 dark:border-slate-800 dark:bg-slate-800">
            {values.map(({ title, text: description }, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length];
              return (
                // An odd last card spans the row on two columns, so no empty cell is left
                <div key={i} className="bg-white p-7 sm:odd:last:col-span-2 lg:odd:last:col-span-1 dark:bg-slate-900">
                  <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <h3 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">{title}</h3>
                  {description && <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-300">{description}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fields of action */}
      <section className="mx-auto max-w-7xl px-4 py-20 lg:py-28 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className={sectionTitle}>{text("about.pillars_title")}</h2>
          <Link to="/realisations" className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            {t("about.see_achievements")} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">{text("about.pillars_text")}</p>
        {/* Titles only; a click opens the details, to keep the page light */}
        <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {DOMAINS.map(({ key, icon: Icon }) => (
            <details key={key} className="group">
              <summary className="flex cursor-pointer list-none items-center gap-4 py-5 hover:text-emerald-700 dark:hover:text-emerald-400 [&::-webkit-details-marker]:hidden">
                <Icon className="h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="flex-1 text-lg font-extrabold text-slate-900 group-hover:text-inherit sm:text-xl dark:text-white">
                  {text(`about.domains.${key}.title`)}
                </h3>
                <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <ul className="space-y-3 pb-6 pl-10 text-slate-600 dark:text-slate-300">
                {domainPoints(text(`about.domains.${key}.details`)).map(({ label, text: point }, i) => (
                  <li key={i} className="relative pl-4 leading-relaxed before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-emerald-500">
                    {label && <strong className="font-semibold text-slate-900 dark:text-white">{label}{i18n.language.startsWith("fr") ? " : " : ": "}</strong>}
                    {point}
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      </section>

      {/* Network + institutional partnership */}
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-20 lg:pb-28 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="bg-slate-900 p-8 text-white sm:p-10 dark:bg-white dark:text-slate-950">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300 dark:text-emerald-700">{t("about.network_eyebrow")}</p>
          <h2 className="mt-4 text-3xl font-extrabold leading-tight">{text("about.network_title")}</h2>
          <p className="mt-4 leading-relaxed text-slate-300 dark:text-slate-600">{text("about.network_text")}</p>
          <Link to="/antennes" className={buttonClasses({ variant: "primary", className: "mt-8" })}>
            {t("about.network_cta")} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="border border-slate-200 bg-white p-8 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white">{t("about.partner_eyebrow")}</h2>
          {/* Same list as « Ils nous font confiance » on the home page */}
          <dl className="mt-6 space-y-5">
            {partnerGroups.map(({ group, partners }) => (
              <div key={group}>
                <dt className={eyebrow}>{t(`partners.groups.${group}.title`)}</dt>
                {partners.map((partner, i) => (
                  <dd key={i} className="mt-1.5 font-semibold text-slate-900 dark:text-white">
                    {partner.url ? (
                      <a href={partner.url} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 hover:underline dark:hover:text-emerald-400">
                        {partner.name}
                      </a>
                    ) : (
                      partner.name
                    )}
                  </dd>
                ))}
              </div>
            ))}
          </dl>
          <h3 className="mt-8 border-t border-slate-200 pt-8 text-xl font-extrabold leading-tight text-slate-900 dark:border-slate-800 dark:text-white">
            {text("about.partner_title")}
          </h3>
          <p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-300">{text("about.partner_text")}</p>
          <ul className="mt-5 space-y-2 text-slate-700 dark:text-slate-300">
            {(["skills", "resources", "excellence"] as const).map((key) => (
              <li key={key} className="flex gap-2.5">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600 dark:bg-emerald-400" aria-hidden />
                {text(`about.partner_goals.${key}`)}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-slate-600 dark:text-slate-300">
            {text("about.partner_example")}{" "}
            <Link to="/realisations" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
              {t("about.partner_example_link")}
            </Link>
          </p>
        </div>
      </section>

      {/* Membership types (full descriptions; « S'inscrire » links here) */}
      <section id={MEMBERSHIP_TYPES_SECTION} className="scroll-mt-20 border-t border-slate-200 dark:border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-20 lg:py-28 sm:px-6 lg:px-8">
          <p className={eyebrow}>{t("about.membership.eyebrow")}</p>
          <h2 className={`mt-4 ${sectionTitle}`}>{text("about.membership.title")}</h2>
          <p className="mt-4 max-w-3xl text-lg text-slate-600 dark:text-slate-300">{text("about.membership.text")}</p>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {MEMBERSHIP_TYPES.map(({ key, icon: Icon, anchor }) => (
              <div key={key} id={anchor} className="scroll-mt-20 border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900">
                <Icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <h3 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">{t(`membership_types.${key}.title`)}</h3>
                <p className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">{text(`membership_types.${key}.text`)}</p>
              </div>
            ))}
          </div>
          {!isAuthenticated && (
            <Link to="/adhesion" className={buttonClasses({ variant: "primary", size: "lg", className: "mt-10" })}>
              {t("about.membership.cta")} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
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
              <Link to="/adhesion" className={buttonClasses({ variant: "primary", size: "lg" })}>
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
