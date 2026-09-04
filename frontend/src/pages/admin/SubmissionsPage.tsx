import { Mail, User } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAdminSubmissions } from "../../hooks/useAdminSubmissions";

export function SubmissionsPage() {
  const { data: submissions, isLoading } = useAdminSubmissions();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dossiers Entrepreneurs</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Candidatures de porteurs de projet et artisans soumises à l'antenne.
      </p>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !submissions || submissions.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">Aucun dossier reçu pour le moment.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {submissions.map((s) => (
            <Card key={s.id} hoverable={false} className="p-5">
              <div className="flex items-start gap-3">
                <IconBadge icon={<User className="h-4 w-4" aria-hidden />} tone="orange" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.applicantName}</p>
                  <a
                    href={`mailto:${s.email}`}
                    className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
                  >
                    <Mail className="h-3 w-3" /> {s.email}
                  </a>
                  <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">{s.projectSummary}</p>
                  <p className="mt-2.5 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
