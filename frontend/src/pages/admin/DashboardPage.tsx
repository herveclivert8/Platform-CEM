import { Newspaper, Briefcase, HeartHandshake, MapPin, Users, Activity } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAuthStore } from "../../store/authStore";
import { useDashboardSummary } from "../../hooks/useDashboardSummary";
import { formatAmount } from "../../types/donation";
import { useSuperAdminStatistics } from "../../hooks/useSuperAdminStats";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { QueryError } from "../../components/ui/QueryError";

function getGreeting(t: TFunction): string {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 18 ? t("admin.dashboard.good_morning") : t("admin.dashboard.good_evening");
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
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const { data: summary, isLoading, isError, error, refetch } = useDashboardSummary();
  const { data: globalStats, isLoading: globalLoading, isError: globalError, error: globalErr, refetch: refetchGlobal } = useSuperAdminStatistics();

  const donationTotals = summary?.donations_confirmed_totals ?? [];
  const donationTotal =
    donationTotals.length > 0
      ? donationTotals.map((t) => formatAmount(t.amount, t.currency)).join(" · ")
      : formatAmount(0, "EUR");

  const greetingName = isSuperAdmin ? t("admin.nav.super_admin") : user?.firstName;

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {t("admin.dashboard.greeting", { greeting: getGreeting(t), name: greetingName })}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isSuperAdmin ? t("admin.dashboard.consolidated") : t("admin.dashboard.branch_of", { name: user?.branchName })}
      </p>
      {isError && <QueryError error={error} onRetry={() => refetch()} />}
      {isSuperAdmin && globalError && <QueryError error={globalErr} onRetry={() => refetchGlobal()} />}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Newspaper} label={t("admin.dashboard.posts_published")} value={summary?.posts_published ?? 0} loading={isLoading} />
        <StatCard icon={Activity} label={t("admin.dashboard.drafts")} value={summary?.posts_draft ?? 0} loading={isLoading} />
        <StatCard
          icon={Briefcase}
          label={
            summary?.submissions_new
              ? t("admin.dashboard.submissions_new", { count: summary.submissions_new })
              : t("admin.dashboard.submissions")
          }
          value={summary?.submissions_total ?? 0}
          loading={isLoading}
        />
        <StatCard
          icon={HeartHandshake}
          label={
            summary?.donations_pending
              ? t("admin.dashboard.donations_pending", { count: summary.donations_pending })
              : t("admin.dashboard.donations")
          }
          value={donationTotal}
          loading={isLoading}
        />
      </div>

      {isSuperAdmin && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("admin.dashboard.global_view")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={MapPin} label={t("admin.dashboard.branches")} value={globalStats?.total_branches ?? 0} loading={globalLoading} />
            <StatCard icon={Users} label={t("admin.dashboard.branch_admins")} value={globalStats?.total_admins ?? 0} loading={globalLoading} />
            <StatCard icon={Newspaper} label={t("admin.dashboard.all_posts")} value={globalStats?.total_posts ?? 0} loading={globalLoading} />
            <StatCard icon={HeartHandshake} label={t("admin.dashboard.reports")} value={globalStats?.total_publications ?? 0} loading={globalLoading} />
          </div>
        </div>
      )}
    </div>
  );
}
