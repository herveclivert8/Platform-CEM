import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ExternalLink, Info, Languages, RotateCcw } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useAboutPage, useUpdateAboutPage, type AboutContent } from "../../hooks/useAboutPage";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { MEMBERSHIP_TYPES } from "../../config/membershipTypes";
import { apiErrorMessage } from "../../lib/api";

interface Field {
  key: string;
  /** Label key under admin.about_page.fields, with its interpolation */
  label: [string, Record<string, string>?];
  rows: number;
}

const VALUES = ["excellence", "equality", "independence", "transparency"] as const;
const PILLARS = ["EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE"] as const;
const GOALS = ["skills", "resources", "excellence"] as const;

const inputClass =
  "w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

/**
 * Super Admin: texts of « Qui sommes-nous » (and the membership type summaries shown on the
 * membership and home pages). Typed in French; a text left as the site default is not stored.
 */
export function AboutPageSettingsPage() {
  const { t, i18n } = useTranslation();
  // Stable across renders: the effect below must only reload the form when the data changes
  const frDefault = useMemo(() => i18n.getFixedT("fr"), [i18n]);
  const { data, isLoading } = useAboutPage("fr");
  const update = useUpdateAboutPage();
  const showSuccess = useSuccessToast();
  const [form, setForm] = useState<AboutContent>({});
  const { isDirty, markSaved } = useUnsavedChanges(form);

  const sections = useMemo<{ title: string; fields: Field[] }[]>(() => {
    const field = (key: string, label: Field["label"], rows = 3): Field => ({ key, label, rows });
    return [
      {
        title: "section_intro",
        fields: [
          field("about.headline_before", ["headline_before"], 1),
          field("about.headline_accent", ["headline_accent"], 1),
          field("about.headline_after", ["headline_after"], 1),
          field("about.intro", ["intro"], 4),
          field("about.intro_2", ["intro_2"], 4),
        ],
      },
      {
        title: "section_values",
        fields: [
          field("about.values_title", ["section_title"], 1),
          ...VALUES.flatMap((v) => {
            const name = frDefault(`about.values.${v}.title`);
            return [field(`about.values.${v}.title`, ["value_title", { name }], 1), field(`about.values.${v}.text`, ["value_text", { name }], 2)];
          }),
        ],
      },
      {
        title: "section_pillars",
        fields: [
          field("about.pillars_title", ["section_title"], 1),
          field("about.pillars_text", ["section_text"], 2),
          ...PILLARS.map((p) => field(`about.pillars.${p}`, ["pillar", { name: frDefault(`pillars.${p}`) }], 2)),
        ],
      },
      {
        title: "section_network",
        fields: [field("about.network_title", ["section_title"], 1), field("about.network_text", ["section_text"], 4)],
      },
      {
        title: "section_partner",
        fields: [
          field("about.partner_title", ["section_title"], 1),
          field("about.partner_text", ["section_text"], 4),
          ...GOALS.map((g, i) => field(`about.partner_goals.${g}`, ["partner_goal", { n: String(i + 1) }], 2)),
          field("about.partner_example", ["partner_example"], 2),
        ],
      },
      {
        title: "section_membership",
        fields: [
          field("about.membership.title", ["section_title"], 1),
          field("about.membership.text", ["section_text"], 2),
          ...MEMBERSHIP_TYPES.flatMap(({ key }) => {
            const name = frDefault(`membership_types.${key}.title`);
            return [
              field(`membership_types.${key}.text`, ["type_text", { name }], 7),
              field(`membership_types.${key}.summary`, ["type_summary", { name }], 3),
            ];
          }),
        ],
      },
    ];
  }, [frDefault]);

  const allKeys = useMemo(() => sections.flatMap((s) => s.fields.map((f) => f.key)), [sections]);

  // The form shows every text as it currently reads on the site: the edited one, else the default
  useEffect(() => {
    if (!data) return;
    const loaded = Object.fromEntries(allKeys.map((key) => [key, data[key] ?? frDefault(key)]));
    setForm(loaded);
    markSaved(loaded);
  }, [data, allKeys, frDefault, markSaved]);

  const set = (key: string, value: string) => {
    update.reset();
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Only texts that differ from the site default are stored (an emptied text is the default too)
    const content = Object.fromEntries(
      Object.entries(form).filter(([key, value]) => value.trim() && value.trim() !== frDefault(key).trim()),
    );
    try {
      await update.mutateAsync(content);
    } catch {
      return; // erreur affichée sous le formulaire
    }
    markSaved(form);
    showSuccess(t("admin.about_page.saved"));
  };

  const resetAll = () => {
    if (window.confirm(t("admin.about_page.reset_confirm"))) {
      update.reset();
      setForm(Object.fromEntries(allKeys.map((key) => [key, frDefault(key)])));
    }
  };

  return (
    <div>
      <UnsavedChangesGuard when={isDirty} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.about_page.title")}</h1>
        </div>
        <Link
          to="/qui-sommes-nous"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
        >
          {t("admin.about_page.view")} <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t("admin.about_page.subtitle")}</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">{t("admin.about_page.loading")}</p>
      ) : (
        <Card hoverable={false} className="mt-6 max-w-4xl p-6">
          <form onSubmit={handleSubmit} className="space-y-10">
            <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("admin.about_page.french_only")}
            </p>

            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  {t(`admin.about_page.${section.title}`)}
                </h2>
                {section.fields.map(({ key, label, rows }) => {
                  const edited = (form[key] ?? "").trim() !== frDefault(key).trim();
                  return (
                    <div key={key}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <label htmlFor={`about-${key}`} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {t(`admin.about_page.fields.${label[0]}`, label[1])}
                        </label>
                        {edited && (
                          <button
                            type="button"
                            onClick={() => set(key, frDefault(key))}
                            className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400"
                          >
                            <RotateCcw className="h-3 w-3" aria-hidden /> {t("admin.about_page.restore")}
                          </button>
                        )}
                      </div>
                      <textarea
                        id={`about-${key}`}
                        rows={rows}
                        maxLength={3000}
                        value={form[key] ?? ""}
                        placeholder={frDefault(key)}
                        onChange={(e) => set(key, e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  );
                })}
              </section>
            ))}

            {update.isError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(update.error, t("admin.about_page.error"))}</p>
            )}

            <div className="sticky bottom-0 -mx-6 -mb-6 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
              <Button type="submit" variant="secondary" disabled={update.isPending || !isDirty}>
                {update.isPending ? "…" : t("admin.about_page.save")}
              </Button>
              <Button type="button" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={resetAll}>
                {t("admin.about_page.reset")}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
