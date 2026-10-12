import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Send } from "lucide-react";
import { Button } from "../ui/Button";
import { Field } from "../donation/donationUi";
import { ImageDropzone } from "../admin/ImageDropzone";
import { fieldClass } from "../donation/donationConstants";
import { useCreateMemberProject } from "../../hooks/useMembership";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { apiErrorMessage } from "../../lib/api";
import { ALL_PILLARS, type Pillar } from "../../types/post";

/** A member's project proposal: stays pending (not public) until the Super Admin approves it. */
export function MemberProjectForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const pillarLabels = usePillarLabels();
  const create = useCreateMemberProject();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [pillar, setPillar] = useState<Pillar>("EDUCATION");
  const [beneficiaries, setBeneficiaries] = useState("");
  const [location, setLocation] = useState("");
  // A single optional photo: the last one picked replaces the previous
  const [images, setImages] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ title, summary, description, pillar, beneficiaries, location, image: images[0] ?? null });
      onDone();
    } catch {
      // error surfaced below via create.isError
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label={t("member.project.title")} htmlFor="mp-title">
        <input id="mp-title" required maxLength={255} value={title} onChange={(e) => setTitle(e.target.value)} className={fieldClass} />
      </Field>
      <Field label={t("member.project.summary")} htmlFor="mp-summary">
        <input id="mp-summary" required maxLength={500} value={summary} onChange={(e) => setSummary(e.target.value)} className={fieldClass} />
      </Field>
      <Field label={t("member.project.description")} htmlFor="mp-description">
        <textarea id="mp-description" required rows={6} maxLength={20000} value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClass} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("member.project.pillar")} htmlFor="mp-pillar">
          <select id="mp-pillar" value={pillar} onChange={(e) => setPillar(e.target.value as Pillar)} className={fieldClass}>
            {ALL_PILLARS.map((p) => (
              <option key={p} value={p}>
                {pillarLabels[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("member.project.location")} htmlFor="mp-location" optional>
          <input id="mp-location" maxLength={255} value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} />
        </Field>
      </div>
      <Field label={t("member.project.beneficiaries")} htmlFor="mp-beneficiaries">
        <input id="mp-beneficiaries" required maxLength={255} value={beneficiaries} onChange={(e) => setBeneficiaries(e.target.value)} className={fieldClass} />
      </Field>

      <Field label={t("member.project.photo")} optional hint={t("member.project.photo_hint")}>
        <ImageDropzone images={images} onChange={(next) => setImages(next.slice(-1))} />
      </Field>

      {create.isError && (
        <div role="alert" className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{apiErrorMessage(create.error, t("member.project.error"))}</span>
        </div>
      )}

      <Button type="submit" variant="secondary" icon={<Send className="h-4 w-4" />} disabled={create.isPending}>
        {t("member.project.submit")}
      </Button>
    </form>
  );
}
