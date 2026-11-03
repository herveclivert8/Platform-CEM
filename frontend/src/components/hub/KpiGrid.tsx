import { useTranslation } from "react-i18next";
import { BookOpen, Briefcase, FlaskConical, HandHeart, Leaf } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { useBranchPillarCounts } from "../../hooks/useBranchPillarCounts";

const KPI_CONFIG = [
  { pillar: "EDUCATION" as const, icon: BookOpen, tone: "emerald" as const, i18nKey: "posts_education" },
  { pillar: "ENTERPRISE" as const, icon: Briefcase, tone: "orange" as const, i18nKey: "posts_enterprise" },
  { pillar: "RESEARCH" as const, icon: FlaskConical, tone: "emerald" as const, i18nKey: "posts_research" },
  { pillar: "SOLIDARITY" as const, icon: HandHeart, tone: "orange" as const, i18nKey: "posts_solidarity" },
  { pillar: "SUSTAINABILITY" as const, icon: Leaf, tone: "emerald" as const, i18nKey: "posts_sustainability" },
];

export function KpiGrid({ branchId }: { branchId: number }) {
  const { t } = useTranslation();
  const { data, isLoading } = useBranchPillarCounts(branchId);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {KPI_CONFIG.map((kpi) => (
          <Card key={kpi.pillar} className="p-5">
            <IconBadge icon={<kpi.icon className="h-4.5 w-4.5" aria-hidden />} tone={kpi.tone} />
            {isLoading ? (
              <Skeleton className="mt-3 h-8 w-14" />
            ) : (
              <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {data?.[kpi.pillar] ?? 0}
              </p>
            )}
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              {t(`hub.kpi.${kpi.i18nKey}`)}
            </p>
          </Card>
        ))}
      </div>
    </section>
  );
}
