import { ScrollText } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuditLog, useAuditStats } from "../../hooks/useSuperAdminStats";

export function AuditPage() {
  const { data: stats, isLoading: statsLoading } = useAuditStats();
  const { data: log, isLoading: logLoading } = useAuditLog();

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Journal d'audit</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Historique des opérations sensibles (30 derniers jours).</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Événements", value: stats?.total_events },
          { label: "Connexions échouées", value: stats?.failed_logins },
          { label: "Publications créées", value: stats?.publications_created },
          { label: "Admins créés", value: stats?.admins_created },
        ].map((item) => (
          <Card key={item.label} hoverable={false} className="p-5">
            {statsLoading ? (
              <Skeleton className="h-8 w-14" />
            ) : (
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{item.value ?? 0}</p>
            )}
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
          </Card>
        ))}
      </div>

      <div className="mt-8">
        {logLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !log || log.items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">
            Aucun événement enregistré pour le moment (le journal d'audit n'est pas encore alimenté côté backend).
          </p>
        ) : (
          <div className="space-y-2">
            {log.items.map((entry) => (
              <Card key={entry.id} hoverable={false} className="flex items-center gap-4 p-4">
                <IconBadge icon={<ScrollText className="h-4 w-4" aria-hidden />} tone="slate" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold">{entry.action}</span> · {entry.resource_type}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {entry.user_email} — {new Date(entry.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <Badge tone={entry.success ? "emerald" : "orange"}>{entry.success ? "Succès" : "Échec"}</Badge>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
