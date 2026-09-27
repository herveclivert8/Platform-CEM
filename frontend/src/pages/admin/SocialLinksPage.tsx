import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { NETWORK_CONFIG } from "../../components/layout/SocialLinks";
import { useSocialLinks, useUpdateSocialLinks } from "../../hooks/useSocialLinks";
import { useTranslation } from "react-i18next";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { apiErrorMessage } from "../../lib/api";

const FIELDS = [
  { key: "facebookUrl", network: "facebook", placeholder: "https://facebook.com/votre-page" },
  { key: "xUrl", network: "x", placeholder: "https://x.com/votre-compte" },
  { key: "linkedinUrl", network: "linkedin", placeholder: "https://linkedin.com/company/votre-page" },
  { key: "youtubeUrl", network: "youtube", placeholder: "https://youtube.com/@votre-chaine" },
] as const;

export function SocialLinksPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useSocialLinks();
  const updateSocialLinks = useUpdateSocialLinks();

  const [values, setValues] = useState<Record<(typeof FIELDS)[number]["key"], string>>({
    facebookUrl: "",
    xUrl: "",
    linkedinUrl: "",
    youtubeUrl: "",
  });

  const { isDirty, markSaved } = useUnsavedChanges(values);
  const showSuccess = useSuccessToast();

  useEffect(() => {
    if (data) {
      const loaded = {
        facebookUrl: data.facebookUrl ?? "",
        xUrl: data.xUrl ?? "",
        linkedinUrl: data.linkedinUrl ?? "",
        youtubeUrl: data.youtubeUrl ?? "",
      };
      setValues(loaded);
      markSaved(loaded);
    }
  }, [data, markSaved]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSocialLinks.mutateAsync(values);
    } catch {
      return; // erreur affichée sous le formulaire
    }
    markSaved(values);
    showSuccess(t("admin.social.updated"));
  };

  return (
    <div>
      <UnsavedChangesGuard when={isDirty} />
      <div className="flex items-center gap-2.5">
        <Share2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden />
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.social.title")}</h1>
      </div>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t("admin.social.subtitle")}
      </p>

      <Card hoverable={false} className="mt-6 max-w-lg p-6">
        {isLoading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("common.loading")}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {FIELDS.map((field) => {
              const network = NETWORK_CONFIG[field.network];
              return (
                <div key={field.key}>
                  <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <network.icon className="h-3.5 w-3.5" aria-hidden />
                    {network.name}
                  </label>
                  <input
                    type="url"
                    placeholder={field.placeholder}
                    value={values[field.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              );
            })}

            {updateSocialLinks.isError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(updateSocialLinks.error, t("common.error_retry"))}</p>
            )}

            <Button type="submit" variant="secondary" disabled={updateSocialLinks.isPending || !isDirty}>
              {updateSocialLinks.isPending ? "…" : t("common.save")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
