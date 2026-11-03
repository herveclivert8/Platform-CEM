import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, CheckCircle2, Clock, Home, Languages, Plus, RotateCcw, Sparkles, X } from "lucide-react";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ImageDropzone } from "../../components/admin/ImageDropzone";
import { DEFAULT_HERO_IMAGE } from "../../components/home/Hero";
import { useHomePage, useUpdateHomePage } from "../../hooks/useHomePage";
import { useBranches } from "../../hooks/useBranches";
import { networkSummary } from "../../components/home/networkSummary";
import { ASSOCIATION } from "../../config/association";
import { defaultFooterValues } from "../../components/layout/footerValues";
import { PARTNER_GROUPS, defaultPartners } from "../../components/home/partners";
import type { HomePage, Partner } from "../../types/settings";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { apiErrorMessage } from "../../lib/api";

const EMPTY: HomePage = {
  heroImageUrl: "",
  logoUrl: "",
  logoMarkUrl: "",
  heroBadge: "",
  heroTitle: "",
  heroSubtitle: "",
  values: null,
  valueDescriptions: null,
  partners: null,
  untranslatedTerms: null,
  contactAddress: "",
  contactEmail: "",
  contactPhone: "",
  mapSubtitle: "",
  showDonationTotals: false,
};

const HERO_FIELDS = [
  { key: "heroBadge", labelKey: "admin.home_page.badge", defaultKey: "hero.badge", maxLength: 255, rows: 1 },
  { key: "heroTitle", labelKey: "admin.home_page.heading", defaultKey: "hero.title", maxLength: 200, rows: 2 },
  { key: "heroSubtitle", labelKey: "admin.home_page.tagline", defaultKey: "hero.subtitle", maxLength: 500, rows: 3 },
] as const;

const LOGO_FIELDS = [
  { key: "logoUrl", labelKey: "admin.home_page.logo_full", hintKey: "admin.home_page.logo_full_hint", fallback: ASSOCIATION.logoFull },
  { key: "logoMarkUrl", labelKey: "admin.home_page.logo_mark", hintKey: "admin.home_page.logo_mark_hint", fallback: ASSOCIATION.logo },
] as const;

/** Translations run in the background after saving: re-read the English version a few times. */
const TRANSLATION_REFRESH_DELAYS_MS = [4_000, 10_000, 20_000];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700 dark:text-slate-200">{children}</h2>;
}

export function HomePageSettingsPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { data, isLoading } = useHomePage("fr");
  const { data: english } = useHomePage("en");
  const updateHomePage = useUpdateHomePage();
  const [form, setForm] = useState<HomePage>(EMPTY);
  const timers = useRef<number[]>([]);

  const frDefault = i18n.getFixedT("fr");
  const defaultValues = defaultFooterValues(frDefault);
  const { data: branches } = useBranches();
  const computedMapSubtitle = networkSummary(branches?.items ?? [], frDefault, "fr");

  const { isDirty, markSaved } = useUnsavedChanges(form);
  const showSuccess = useSuccessToast();

  useEffect(() => {
    if (!data) return;
    const loaded: HomePage = { ...EMPTY, ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v ?? (["values", "valueDescriptions", "partners", "untranslatedTerms"].includes(k) ? null : "")])) };
    setForm(loaded);
    markSaved(loaded);
  }, [data, markSaved]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const set = <K extends keyof HomePage>(key: K, value: HomePage[K]) => {
    updateHomePage.reset();
    setForm((f) => ({ ...f, [key]: value }));
  };

  // Value titles and their comments (shown on hover in the footer) are edited as pairs
  const values = form.values
    ? form.values.map((title, i) => ({ title, text: form.valueDescriptions?.[i] ?? "" }))
    : defaultValues;
  const setValues = (next: { title: string; text: string }[]) => {
    updateHomePage.reset();
    setForm((f) => ({ ...f, values: next.map((v) => v.title), valueDescriptions: next.map((v) => v.text) }));
  };
  const updateValue = (index: number, patch: Partial<{ title: string; text: string }>) =>
    setValues(values.map((v, j) => (j === index ? { ...v, ...patch } : v)));
  const moveValue = (index: number, delta: number) => {
    const next = [...values];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setValues(next);
  };

  // « Ils nous font confiance »: the site's defaults until the list is edited
  const partners = form.partners ?? defaultPartners(frDefault);
  const setPartners = (next: Partner[]) => set("partners", next);
  const updatePartner = (index: number, patch: Partial<Partner>) =>
    setPartners(partners.map((p, j) => (j === index ? { ...p, ...patch } : p)));
  const movePartner = (index: number, delta: number) => {
    const next = [...partners];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setPartners(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateHomePage.mutateAsync(form);
    } catch {
      return; // erreur affichée sous le formulaire
    }
    markSaved(form);
    showSuccess(t("admin.home_page.saved"));
    timers.current.forEach(window.clearTimeout);
    timers.current = TRANSLATION_REFRESH_DELAYS_MS.map((delay) =>
      window.setTimeout(() => queryClient.invalidateQueries({ queryKey: ["home-page", "en"] }), delay),
    );
  };

  const resetAll = () => {
    if (window.confirm(t("admin.home_page.reset_confirm"))) {
      updateHomePage.reset();
      setForm(EMPTY);
    }
  };

  // An English text still equal to the saved French one: its translation isn't ready (or failed)
  const pendingTranslation =
    !!data &&
    !!english &&
    ([...HERO_FIELDS.map((f) => f.key), "contactAddress", "mapSubtitle"] as const).some(
      (key) => data[key] && english[key] === data[key],
    ) ||
    (!!data?.values && !!english?.values && data.values.some((v, i) => english.values?.[i] === v)) ||
    (!!data?.valueDescriptions && !!english?.valueDescriptions &&
      data.valueDescriptions.some((v, i) => v && english.valueDescriptions?.[i] === v)) ||
    (!!data?.partners && !!english?.partners && data.partners.some((p, i) => english.partners?.[i]?.name === p.name));

  return (
    <div>
      <UnsavedChangesGuard when={isDirty} />
      <div className="flex items-center gap-2.5">
        <Home className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.home_page.title")}</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.home_page.subtitle")}</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">{t("admin.home_page.loading")}</p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card hoverable={false} className="p-6">
            <form onSubmit={handleSubmit} className="space-y-8">
              <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Languages className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("admin.home_page.french_only")}
              </p>

              <section className="space-y-5">
                <SectionTitle>{t("admin.home_page.section_logo")}</SectionTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("admin.home_page.logo_hint")}</p>
                {LOGO_FIELDS.map((field) => (
                  <div key={field.key}>
                    <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t(field.labelKey)}</p>
                    <div className="mb-2 flex items-center gap-3">
                      <span className="flex h-16 items-center rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700">
                        <img src={form[field.key] || field.fallback} alt="" className="h-12 w-auto max-w-56 object-contain" />
                      </span>
                      {!form[field.key] && <Badge tone="slate">{t("admin.home_page.logo_default")}</Badge>}
                    </div>
                    <ImageDropzone
                      images={form[field.key] ? [form[field.key]!] : []}
                      // A single image: a new upload replaces the current one; removing it restores the default logo
                      onChange={(images) => set(field.key, images[images.length - 1] ?? "")}
                    />
                    <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t(field.hintKey)}</p>
                  </div>
                ))}
              </section>

              <section className="space-y-5">
                <SectionTitle>{t("admin.home_page.section_cover")}</SectionTitle>
                <div>
                  <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.photo")}</p>
                  <ImageDropzone
                    images={form.heroImageUrl ? [form.heroImageUrl] : []}
                    // A single photo: a new upload replaces the current one
                    onChange={(images) => set("heroImageUrl", images[images.length - 1] ?? "")}
                  />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t("admin.home_page.photo_hint")}</p>
                </div>
                {HERO_FIELDS.map((field) => {
                  const Input = field.rows > 1 ? "textarea" : "input";
                  return (
                    <div key={field.key}>
                      <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t(field.labelKey)}</label>
                      <Input
                        rows={field.rows > 1 ? field.rows : undefined}
                        maxLength={field.maxLength}
                        placeholder={frDefault(field.defaultKey)}
                        value={form[field.key] ?? ""}
                        onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field.key, e.target.value)}
                        className={clsx(inputClass, field.rows > 1 && "resize-none")}
                      />
                    </div>
                  );
                })}
              </section>

              <section className="space-y-3">
                <SectionTitle>{t("admin.home_page.section_map")}</SectionTitle>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.map_subtitle")}</label>
                  <input value={form.mapSubtitle ?? ""} maxLength={300} placeholder={computedMapSubtitle}
                    onChange={(e) => set("mapSubtitle", e.target.value)} className={inputClass} />
                  <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t("admin.home_page.map_subtitle_hint")}</p>
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>{t("admin.home_page.section_transparency")}</SectionTitle>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={form.showDonationTotals}
                    onChange={(e) => set("showDonationTotals", e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-200">{t("admin.home_page.show_donations")}</span>
                    <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{t("admin.home_page.show_donations_hint")}</span>
                  </span>
                </label>
              </section>

              <section className="space-y-3">
                <SectionTitle>{t("admin.home_page.section_values")}</SectionTitle>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("admin.home_page.values_hint")}</p>
                <ul className="space-y-2">
                  {values.map((value, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <div className="flex-1 space-y-1.5">
                        <input
                          value={value.title}
                          maxLength={120}
                          aria-label={t("admin.home_page.value_label", { n: i + 1 })}
                          onChange={(e) => updateValue(i, { title: e.target.value })}
                          className={inputClass}
                        />
                        <textarea
                          value={value.text}
                          maxLength={300}
                          rows={2}
                          placeholder={t("admin.home_page.value_description_placeholder")}
                          aria-label={t("admin.home_page.value_description_label", { n: i + 1 })}
                          onChange={(e) => updateValue(i, { text: e.target.value })}
                          className={clsx(inputClass, "resize-y text-xs")}
                        />
                      </div>
                      <button type="button" disabled={i === 0} onClick={() => moveValue(i, -1)} aria-label={t("admin.home_page.move_up")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={i === values.length - 1} onClick={() => moveValue(i, 1)} aria-label={t("admin.home_page.move_down")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setValues(values.filter((_, j) => j !== i))} aria-label={t("admin.home_page.remove_value")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} disabled={values.length >= 12}
                    className="border border-slate-200 dark:border-slate-700" onClick={() => setValues([...values, { title: "", text: "" }])}>
                    {t("admin.home_page.add_value")}
                  </Button>
                  {form.values !== null && (
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => { updateHomePage.reset(); setForm((f) => ({ ...f, values: null, valueDescriptions: null })); }}>
                      {t("admin.home_page.default_values")}
                    </Button>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>{t("admin.home_page.section_partners")}</SectionTitle>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("admin.home_page.partners_hint")}</p>
                <ul className="space-y-2">
                  {partners.map((partner, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <div className="grid flex-1 gap-1.5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                        <select
                          value={partner.group}
                          aria-label={t("admin.home_page.partner_group", { n: i + 1 })}
                          onChange={(e) => updatePartner(i, { group: e.target.value as Partner["group"] })}
                          className={inputClass}
                        >
                          {PARTNER_GROUPS.map((group) => (
                            <option key={group} value={group}>{frDefault(`partners.groups.${group}.title`)}</option>
                          ))}
                        </select>
                        <input
                          value={partner.name}
                          maxLength={200}
                          placeholder={t("admin.home_page.partner_name_placeholder")}
                          aria-label={t("admin.home_page.partner_name", { n: i + 1 })}
                          onChange={(e) => updatePartner(i, { name: e.target.value })}
                          className={inputClass}
                        />
                        <input
                          value={partner.url ?? ""}
                          maxLength={300}
                          placeholder={t("admin.home_page.partner_url_placeholder")}
                          aria-label={t("admin.home_page.partner_url", { n: i + 1 })}
                          onChange={(e) => updatePartner(i, { url: e.target.value })}
                          className={clsx(inputClass, "text-xs sm:col-start-2")}
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-500 sm:col-start-2 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={partner.keepName}
                            onChange={(e) => updatePartner(i, { keepName: e.target.checked })}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          {t("admin.home_page.partner_keep_name")}
                        </label>
                      </div>
                      <button type="button" disabled={i === 0} onClick={() => movePartner(i, -1)} aria-label={t("admin.home_page.move_up")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" disabled={i === partners.length - 1} onClick={() => movePartner(i, 1)} aria-label={t("admin.home_page.move_down")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 dark:hover:bg-slate-800">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => setPartners(partners.filter((_, j) => j !== i))} aria-label={t("admin.home_page.remove_partner")}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" size="sm" icon={<Plus className="h-4 w-4" />} disabled={partners.length >= 40}
                    className="border border-slate-200 dark:border-slate-700"
                    onClick={() => setPartners([...partners, { group: partners.at(-1)?.group ?? "agreement", name: "", url: null, keepName: false }])}>
                    {t("admin.home_page.add_partner")}
                  </Button>
                  {form.partners !== null && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => set("partners", null)}>
                      {t("admin.home_page.default_partners")}
                    </Button>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <SectionTitle>{t("admin.home_page.section_untranslated")}</SectionTitle>
                <p className="text-xs text-slate-400 dark:text-slate-500">{t("admin.home_page.untranslated_hint")}</p>
                <textarea
                  rows={4}
                  value={(form.untranslatedTerms ?? []).join("\n")}
                  placeholder={t("admin.home_page.untranslated_placeholder")}
                  aria-label={t("admin.home_page.section_untranslated")}
                  onChange={(e) => set("untranslatedTerms", e.target.value.split("\n"))}
                  className={clsx(inputClass, "resize-y")}
                />
              </section>

              <section className="space-y-4">
                <SectionTitle>{t("admin.home_page.section_contact")}</SectionTitle>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.contact_address")}</label>
                  <input value={form.contactAddress ?? ""} maxLength={512} placeholder={frDefault("footer.address")}
                    onChange={(e) => set("contactAddress", e.target.value)} className={inputClass} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.contact_email")}</label>
                    <input type="email" value={form.contactEmail ?? ""} placeholder="contact@cem-madagascar.org"
                      onChange={(e) => set("contactEmail", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.contact_phone")}</label>
                    <input type="tel" value={form.contactPhone ?? ""} maxLength={50} placeholder="+33 1 23 45 67 89"
                      onChange={(e) => set("contactPhone", e.target.value)} className={inputClass} />
                  </div>
                </div>
              </section>

              {updateHomePage.isError && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(updateHomePage.error, t("admin.home_page.error"))}</p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="secondary" disabled={updateHomePage.isPending || !isDirty}>
                  {updateHomePage.isPending ? "…" : t("admin.home_page.save")}
                </Button>
                <Button type="button" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={resetAll}>
                  {t("admin.home_page.reset")}
                </Button>
              </div>
            </form>
          </Card>

          <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <div>
              <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.preview_fr")}</p>
              <div className="relative overflow-hidden rounded-2xl bg-slate-900">
                <img src={form.heroImageUrl || DEFAULT_HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/50 to-transparent" />
                <div className="relative flex min-h-[260px] flex-col justify-end p-6">
                  <Badge tone="emerald" className="w-fit">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {form.heroBadge || frDefault("hero.badge")}
                  </Badge>
                  <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">{form.heroTitle || frDefault("hero.title")}</p>
                  <p className="mt-2 text-sm text-slate-200">{form.heroSubtitle || frDefault("hero.subtitle")}</p>
                </div>
              </div>
            </div>

            <Card hoverable={false} className="p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_page.preview_en")}</p>
                {pendingTranslation ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> {t("admin.home_page.translation_pending")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> {t("admin.home_page.translation_ready")}
                  </span>
                )}
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                {[
                  [t("admin.home_page.badge"), english?.heroBadge],
                  [t("admin.home_page.heading"), english?.heroTitle],
                  [t("admin.home_page.tagline"), english?.heroSubtitle],
                  [t("admin.home_page.map_subtitle"), english?.mapSubtitle],
                  [t("admin.home_page.section_values"), english?.values?.join(" · ")],
                  [t("admin.home_page.section_partners"), english?.partners?.map((p) => p.name).join(" · ")],
                  [t("admin.home_page.contact_address"), english?.contactAddress],
                ].map(([label, text]) => (
                  <div key={label}>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{text || <span className="text-slate-400">{t("admin.home_page.site_default")}</span>}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-[11px] text-slate-400 dark:text-slate-500">{t("admin.home_page.translation_hint")}</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
