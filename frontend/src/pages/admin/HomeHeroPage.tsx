import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Image as ImageIcon, RotateCcw, Sparkles } from "lucide-react";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { ImageDropzone } from "../../components/admin/ImageDropzone";
import { DEFAULT_HERO_IMAGE } from "../../components/home/Hero";
import { useHomeHero, useUpdateHomeHero } from "../../hooks/useHomeHero";
import type { HomeHeroInput } from "../../types/settings";

type Lang = "fr" | "en";

const EMPTY: HomeHeroInput = {
  imageUrl: "",
  badgeFr: "",
  badgeEn: "",
  titleFr: "",
  titleEn: "",
  subtitleFr: "",
  subtitleEn: "",
};

const TEXT_FIELDS = [
  { key: "badge", labelKey: "admin.home_hero.badge", i18nKey: "hero.badge", maxLength: 255, rows: 1 },
  { key: "title", labelKey: "admin.home_hero.heading", i18nKey: "hero.title", maxLength: 200, rows: 2 },
  { key: "subtitle", labelKey: "admin.home_hero.tagline", i18nKey: "hero.subtitle", maxLength: 500, rows: 3 },
] as const;

const LANG_LABELS: Record<Lang, string> = { fr: "Français", en: "English" };

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500";

function fieldKey(key: (typeof TEXT_FIELDS)[number]["key"], lang: Lang): keyof HomeHeroInput {
  return `${key}${lang === "fr" ? "Fr" : "En"}` as keyof HomeHeroInput;
}

export function HomeHeroPage() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useHomeHero();
  const updateHomeHero = useUpdateHomeHero();
  const [values, setValues] = useState<HomeHeroInput>(EMPTY);
  const [previewLang, setPreviewLang] = useState<Lang>("fr");

  // Default texts, shown as placeholders and used by the preview when a field is empty
  const defaults: Record<Lang, (key: string) => string> = {
    fr: i18n.getFixedT("fr"),
    en: i18n.getFixedT("en"),
  };

  useEffect(() => {
    if (data) {
      setValues({
        imageUrl: data.imageUrl ?? "",
        badgeFr: data.badgeFr ?? "",
        badgeEn: data.badgeEn ?? "",
        titleFr: data.titleFr ?? "",
        titleEn: data.titleEn ?? "",
        subtitleFr: data.subtitleFr ?? "",
        subtitleEn: data.subtitleEn ?? "",
      });
    }
  }, [data]);

  const set = (key: keyof HomeHeroInput, value: string) => {
    updateHomeHero.reset();
    setValues((v) => ({ ...v, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateHomeHero.mutateAsync(values);
  };

  const resetAll = () => {
    if (window.confirm(t("admin.home_hero.reset_confirm"))) {
      updateHomeHero.reset();
      setValues(EMPTY);
    }
  };

  const preview = (key: (typeof TEXT_FIELDS)[number]["key"], i18nKey: string) =>
    values[fieldKey(key, previewLang)] || defaults[previewLang](i18nKey);

  return (
    <div>
      <div className="flex items-center gap-2.5">
        <ImageIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.home_hero.title")}</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.home_hero.subtitle")}</p>

      {isLoading ? (
        <p className="mt-6 text-sm text-slate-400 dark:text-slate-500">{t("admin.home_hero.loading")}</p>
      ) : (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card hoverable={false} className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_hero.photo")}</p>
                <ImageDropzone
                  images={values.imageUrl ? [values.imageUrl] : []}
                  // A single photo: a new upload replaces the current one
                  onChange={(images) => set("imageUrl", images[images.length - 1] ?? "")}
                />
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t("admin.home_hero.photo_hint")}</p>
              </div>

              {TEXT_FIELDS.map((field) => (
                <fieldset key={field.key} className="space-y-2">
                  <legend className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">{t(field.labelKey)}</legend>
                  {(["fr", "en"] as Lang[]).map((lang) => {
                    const key = fieldKey(field.key, lang);
                    const Input = field.rows > 1 ? "textarea" : "input";
                    return (
                      <div key={lang} className="flex items-start gap-2">
                        <span className="mt-2.5 w-7 shrink-0 text-[11px] font-semibold uppercase text-slate-400">{lang}</span>
                        <Input
                          aria-label={`${t(field.labelKey)} (${LANG_LABELS[lang]})`}
                          rows={field.rows > 1 ? field.rows : undefined}
                          maxLength={field.maxLength}
                          placeholder={defaults[lang](field.i18nKey)}
                          value={values[key]}
                          onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value)}
                          className={clsx(inputClass, field.rows > 1 && "resize-none")}
                        />
                      </div>
                    );
                  })}
                </fieldset>
              ))}

              {updateHomeHero.isError && (
                <p className="text-sm text-red-600 dark:text-red-400">{t("admin.home_hero.error")}</p>
              )}
              {updateHomeHero.isSuccess && (
                <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" /> {t("admin.home_hero.saved")}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" variant="secondary" disabled={updateHomeHero.isPending}>
                  {updateHomeHero.isPending ? "…" : t("admin.home_hero.save")}
                </Button>
                <Button type="button" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={resetAll}>
                  {t("admin.home_hero.reset")}
                </Button>
              </div>
            </form>
          </Card>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.home_hero.preview")}</p>
              <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
                {(["fr", "en"] as Lang[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setPreviewLang(lang)}
                    aria-pressed={previewLang === lang}
                    className={clsx(
                      "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                      previewLang === lang
                        ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                    )}
                  >
                    {LANG_LABELS[lang]}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl bg-slate-900 xl:sticky xl:top-6">
              <img src={values.imageUrl || DEFAULT_HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/50 to-transparent" />
              <div className="relative flex min-h-[320px] flex-col justify-end p-6">
                <Badge tone="emerald" className="w-fit">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  {preview("badge", "hero.badge")}
                </Badge>
                <p className="mt-3 text-2xl font-extrabold tracking-tight text-white">{preview("title", "hero.title")}</p>
                <p className="mt-2 text-sm text-slate-200">{preview("subtitle", "hero.subtitle")}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
