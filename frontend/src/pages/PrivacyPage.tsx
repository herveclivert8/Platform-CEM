import { useTranslation } from "react-i18next";
import { ShieldCheck } from "lucide-react";
import { ASSOCIATION } from "../config/association";
import { useHomePage } from "../hooks/useHomePage";
import { usePageMeta } from "../hooks/usePageMeta";

interface PrivacySection {
  title: string;
  paragraphs?: string[];
  items?: string[];
}

/** Privacy policy (GDPR, Malagasy law 2014-038): texts in i18n under "privacy". */
export function PrivacyPage() {
  const { t } = useTranslation();
  usePageMeta(t("privacy.title"));
  const { data: home } = useHomePage();
  const vars = {
    email: home?.contactEmail || ASSOCIATION.contactEmail,
    address: home?.contactAddress || t("footer.address"),
    rna: ASSOCIATION.rna,
    siren: ASSOCIATION.siren,
  };
  const sections = t("privacy.sections", { returnObjects: true, ...vars }) as PrivacySection[];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="cem-card rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 dark:border-white/10 dark:bg-slate-900/90">
        <ShieldCheck className="h-8 w-8 text-emerald-700 dark:text-emerald-400" aria-hidden />
        <h1 className="mt-4 text-3xl text-slate-900 sm:text-4xl dark:text-white">{t("privacy.title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("privacy.updated")}</p>
        <p className="mt-6 leading-relaxed text-slate-700 dark:text-slate-200">{t("privacy.intro", vars)}</p>

        {sections.map((section, i) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-xl text-slate-900 dark:text-white">
              {i + 1}. {section.title}
            </h2>
            {section.paragraphs?.map((p) => (
              <p key={p} className="mt-3 leading-relaxed text-slate-700 dark:text-slate-200">
                {p}
              </p>
            ))}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-slate-700 dark:text-slate-200">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="mt-10 border-t border-slate-200 pt-6 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
          {t("privacy.contact", vars)}{" "}
          <a href={`mailto:${vars.email}`} className="font-semibold underline underline-offset-2">
            {vars.email}
          </a>
        </p>
      </div>
    </div>
  );
}
