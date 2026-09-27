import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Globe2, MapPin } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { useBranches } from "../../hooks/useBranches";
import { useProjects } from "../../hooks/useProjects";
import type { Branch } from "../../types/branch";

/**
 * « Un réseau international » : built only from the data (active branches, published
 * achievements) - no country is hard-coded, so a new branch in Turkey or Italy shows up on
 * its own.
 */
export function NetworkSection() {
  const { t, i18n } = useTranslation();
  const { data: branchesData, isLoading } = useBranches();
  const { data: achievements } = useProjects({ phase: "COMPLETED", pageSize: 1 });

  const byCountry = new Map<string, Branch[]>();
  for (const branch of branchesData?.items ?? []) {
    byCountry.set(branch.country, [...(byCountry.get(branch.country) ?? []), branch]);
  }
  const countries = [...byCountry.entries()].sort(
    ([a, aBranches], [b, bBranches]) => bBranches.length - aBranches.length || a.localeCompare(b, i18n.language),
  );

  const stats = [
    { value: branchesData?.total, label: t("network.stat_branches") },
    { value: countries.length, label: t("network.stat_countries") },
    { value: achievements?.total, label: t("network.stat_achievements") },
  ];

  return (
    <section id="reseau" className="bg-slate-50 py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("network.title")}</h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-500 dark:text-slate-400">{t("network.subtitle")}</p>
        </div>

        <dl className="mx-auto mb-10 grid max-w-3xl grid-cols-3 gap-4 text-center">
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col">
              <dt className="order-2 mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
                {isLoading || value === undefined ? <Skeleton className="mx-auto h-9 w-12" /> : value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
            : countries.map(([country, branches]) => (
                <Card key={country} className="p-6">
                  <div className="flex items-center gap-3">
                    <IconBadge icon={<Globe2 className="h-5 w-5" aria-hidden />} tone="emerald" />
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{country}</h3>
                      <p className="text-xs font-medium text-slate-400">{t("network.branch_count", { count: branches.length })}</p>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {branches.map((branch) => (
                      <li key={branch.id}>
                        <Link
                          to={`/antennes/${branch.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-400"
                        >
                          <MapPin className="h-3 w-3" aria-hidden />
                          {branch.cityName}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
        </div>
      </div>
    </section>
  );
}
