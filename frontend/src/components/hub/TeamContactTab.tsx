import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Mail, Phone, User, Send, CheckCircle2 } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Button } from "../ui/Button";
import { useCreateSubmission } from "../../hooks/useSubmissions";
import type { Branch } from "../../types/branch";

export function TeamContactTab({ branch }: { branch: Branch }) {
  const { t } = useTranslation();
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const createSubmission = useCreateSubmission(branch.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSubmission.mutateAsync({ applicantName, email, projectSummary });
    setApplicantName("");
    setEmail("");
    setProjectSummary("");
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className="p-6">
        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          Responsable d'antenne
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
            <p className="text-sm text-slate-400">Coordonnées à venir.</p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          Porteur de projet ou artisan ?
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Soumettez votre dossier à l'antenne de {branch.cityName}.
        </p>

        {branch.status !== "active" ? (
          <p className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {t("hub.inactive_submissions")}
          </p>
        ) : createSubmission.isSuccess ? (
          <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
            Votre dossier a bien été transmis à l'antenne locale.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
            <input
              required
              placeholder="Nom complet"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <textarea
              required
              rows={4}
              placeholder="Présentez votre projet en quelques lignes"
              value={projectSummary}
              onChange={(e) => setProjectSummary(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            {createSubmission.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Une erreur est survenue. Veuillez réessayer.
              </p>
            )}
            <Button
              type="submit"
              variant="secondary"
              icon={<Send className="h-4 w-4" />}
              disabled={createSubmission.isPending}
            >
              {createSubmission.isPending ? "Envoi…" : "Envoyer mon dossier"}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
