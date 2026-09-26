import { isAxiosError } from "axios";
import { useState } from "react";
import { Mail, Phone, User, Send, CheckCircle2 } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Button } from "../ui/Button";
import { useCreateSubmission } from "../../hooks/useSubmissions";
import { HoneypotField } from "../ui/HoneypotField";
import type { Branch } from "../../types/branch";
import { useTranslation } from "react-i18next";

export function TeamContactTab({ branch }: { branch: Branch }) {
  const { t } = useTranslation();
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [website, setWebsite] = useState("");
  const createSubmission = useCreateSubmission(branch.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSubmission.mutateAsync({ applicantName, email, projectSummary, website });
      setApplicantName("");
      setEmail("");
      setProjectSummary("");
    } catch {
      // error surfaced below via createSubmission.isError
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          {t("hub.contact.manager")}
        </h3>
        <div className="mt-5 space-y-4">
          {branch.contactName && (
            <div className="flex items-center gap-3">
              <IconBadge icon={<User className="h-4 w-4" aria-hidden />} tone="slate" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{branch.contactName}</span>
            </div>
          )}
          {branch.contactEmail && (
            <div className="flex items-center gap-3">
              <IconBadge icon={<Mail className="h-4 w-4" aria-hidden />} tone="emerald" />
              <a href={`mailto:${branch.contactEmail}`} className="text-sm text-slate-600 hover:underline dark:text-slate-300">
                {branch.contactEmail}
              </a>
            </div>
          )}
          {branch.contactPhone && (
            <div className="flex items-center gap-3">
              <IconBadge icon={<Phone className="h-4 w-4" aria-hidden />} tone="orange" />
              <span className="text-sm text-slate-600 dark:text-slate-300">{branch.contactPhone}</span>
            </div>
          )}
          {!branch.contactName && !branch.contactEmail && !branch.contactPhone && (
            <p className="text-sm text-slate-400">{t("hub.contact.coming_soon")}</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          {t("hub.contact.apply_title")}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t("hub.contact.apply_subtitle", { city: branch.cityName })}
        </p>

        {createSubmission.isSuccess ? (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            {t("hub.contact.apply_success")}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative mt-5 space-y-3.5">
            <HoneypotField value={website} onChange={setWebsite} />
            <input
              required
              placeholder={t("hub.contact.full_name")}
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              required
              type="email"
              placeholder={t("hub.contact.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <textarea
              required
              rows={4}
              placeholder={t("hub.contact.summary")}
              value={projectSummary}
              onChange={(e) => setProjectSummary(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {createSubmission.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {isAxiosError(createSubmission.error) && createSubmission.error.response?.status === 429
                  ? t("hub.contact.too_many")
                  : t("common.error_retry")}
              </p>
            )}
            <Button
              type="submit"
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              disabled={createSubmission.isPending}
            >
              {createSubmission.isPending ? t("hub.contact.sending") : t("hub.contact.send")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
