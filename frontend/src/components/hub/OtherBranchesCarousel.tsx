import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, ArrowRight } from "lucide-react";
import { Card } from "../ui/Card";
import { useBranches } from "../../hooks/useBranches";

export function OtherBranchesCarousel({ currentBranchId }: { currentBranchId: number }) {
  const { t } = useTranslation();
  const { data } = useBranches();
  const others = (data?.items ?? []).filter((b) => b.id !== currentBranchId);

  if (others.length === 0) return null;

  return (
    <section className="border-t border-slate-200/80 bg-white py-16 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t("hub.other_branches")}
        </h2>
        <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
          {others.map((branch) => (
            <Link key={branch.id} to={`/antennes/${branch.id}`} className="shrink-0">
              <Card className="flex w-64 items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {branch.cityName}
                  </p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {branch.country}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
