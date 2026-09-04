import { Newspaper, Briefcase, HeartHandshake, MapPin, Users, Activity } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuthStore } from "../../store/authStore";
import { useAdminPosts } from "../../hooks/useAdminPosts";
import { useAdminSubmissions } from "../../hooks/useAdminSubmissions";
import { useAdminDonations } from "../../hooks/useAdminDonations";
import { useSuperAdminStatistics } from "../../hooks/useSuperAdminStats";

function getGreeting(): string {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 18 ? "Bonjour" : "Bonsoir";
}

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
}: {
  icon: typeof Newspaper;
  label: string;
  value: number | string;
  loading?: boolean;
}) {
  return (
    <Card hoverable={false} className="p-5">
      <IconBadge icon={<Icon className="h-4.5 w-4.5" aria-hidden />} tone="emerald" />
      {loading ? (
        <Skeleton className="mt-3 h-8 w-14" />
      ) : (
        <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{value}</p>
      )}
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
    </Card>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const { data: posts, isLoading: postsLoading } = useAdminPosts();
  const { data: submissions, isLoading: submissionsLoading } = useAdminSubmissions();
  const { data: donations, isLoading: donationsLoading } = useAdminDonations();
  const { data: globalStats, isLoading: globalLoading } = useSuperAdminStatistics();

  const publishedCount = posts?.filter((p) => p.status === "PUBLISHED").length ?? 0;
  const draftCount = posts?.filter((p) => p.status === "DRAFT").length ?? 0;
  const donationTotal = donations?.reduce((sum, d) => sum + d.amount, 0) ?? 0;

  const greetingName = isSuperAdmin ? "Super Admin" : user?.firstName;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {getGreeting()}, {greetingName} !
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isSuperAdmin ? "Vue consolidée de toutes les antennes." : `Antenne de ${user?.branchName}.`}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Newspaper} label="Posts publiés" value={publishedCount} loading={postsLoading} />
        <StatCard icon={Activity} label="Brouillons" value={draftCount} loading={postsLoading} />
        <StatCard icon={Briefcase} label="Dossiers reçus" value={submissions?.length ?? 0} loading={submissionsLoading} />
        <StatCard
          icon={HeartHandshake}
          label="Total des dons"
          value={`${donationTotal.toFixed(0)}€`}
          loading={donationsLoading}
        />
      </div>

      {isSuperAdmin && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            Vue globale
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={MapPin} label="Antennes" value={globalStats?.total_branches ?? 0} loading={globalLoading} />
            <StatCard icon={Users} label="Admins d'antenne" value={globalStats?.total_admins ?? 0} loading={globalLoading} />
            <StatCard icon={Newspaper} label="Posts (toutes antennes)" value={globalStats?.total_posts ?? 0} loading={globalLoading} />
            <StatCard icon={HeartHandshake} label="Bilans publiés" value={globalStats?.total_publications ?? 0} loading={globalLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
