import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAboutText } from "../hooks/useAboutPage";
import clsx from "clsx";
import { ArrowRight, Info } from "lucide-react";
import { buttonClasses } from "../components/ui/buttonStyles";
import { SupporterContactForm } from "../components/membership/SupporterContactForm";
import { MEMBERSHIP_TYPES, MEMBERSHIP_TYPES_SECTION, type SupporterKind } from "../config/membershipTypes";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuthStore } from "../store/authStore";

const SUPPORTER_KINDS: readonly string[] = ["BENEFACTOR", "SPONSOR"] satisfies SupporterKind[];

/**
 * « S'inscrire » lands here: the visitor picks a membership type first. Active members go on to
 * the account sign-up; benefactors and sponsors leave their details (?contact=<kind>).
 */
export function MembershipChoicePage() {
  const { t } = useTranslation();
  const aboutText = useAboutText();
  usePageMeta(t("seo.membership"), t("membership_choice.intro"));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("contact") ?? "";
  const contactKind = SUPPORTER_KINDS.includes(requested) ? (requested as SupporterKind) : null;
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contactKind) formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [contactKind]);

  const openContact = (kind: SupporterKind | null) =>
    setSearchParams(kind ? { contact: kind } : {}, { replace: true, preventScrollReset: true });

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-400">
        {t("membership_choice.eyebrow")}
      </p>
      <h1 className="mt-5 max-w-4xl text-4xl font-extrabold text-slate-900 sm:text-5xl dark:text-white">
        {t("membership_choice.title")}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-700 dark:text-slate-300">{t("membership_choice.intro")}</p>
      <Link
        to={`/qui-sommes-nous#${MEMBERSHIP_TYPES_SECTION}`}
        className="mt-4 inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
      >
        <Info className="h-4 w-4" aria-hidden />
        {t("membership_choice.more_info")}
      </Link>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {MEMBERSHIP_TYPES.map(({ key, icon: Icon }) => (
          <div
            key={key}
            className={clsx(
              "flex flex-col border bg-white p-7 dark:bg-slate-900",
              contactKind === key ? "border-emerald-500" : "border-slate-200 dark:border-slate-800",
            )}
          >
            <Icon className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <h2 className="mt-5 text-2xl font-extrabold text-slate-900 dark:text-white">{t(`membership_types.${key}.title`)}</h2>
            <p className="mt-3 flex-1 leading-relaxed text-slate-600 dark:text-slate-300">{aboutText(`membership_types.${key}.summary`)}</p>
            {key === "ACTIVE" ? (
              <Link to="/inscription" className={buttonClasses({ variant: "primary", className: "mt-7 self-start" })}>
                {t("membership_types.ACTIVE.cta")} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openContact(key)}
                aria-expanded={contactKind === key}
                className="mt-7 inline-flex items-center gap-1.5 self-start text-left font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
              >
                {t(`membership_types.${key}.cta`)} <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      {contactKind && (
        <div ref={formRef} className="mt-6 scroll-mt-24 border border-slate-200 bg-white p-7 sm:p-10 dark:border-slate-800 dark:bg-slate-900">
          {/* Keyed: switching type starts a fresh form */}
          <SupporterContactForm key={contactKind} kind={contactKind} onCancel={() => openContact(null)} />
        </div>
      )}

      {!isAuthenticated && (
        <p className="mt-10 text-sm text-slate-600 dark:text-slate-400">
          {t("membership_choice.already_member")}{" "}
          <Link to="/login" className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
            {t("membership_choice.login")}
          </Link>
        </p>
      )}
    </div>
  );
}
