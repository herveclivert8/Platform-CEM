import { Link } from "react-router-dom";
import { MapPin, Building2 } from "lucide-react";
import clsx from "clsx";
import { Card } from "../ui/Card";
import { useBranches } from "../../hooks/useBranches";
import { useTranslation } from "react-i18next";

export function BranchSwitcherList({ currentBranchId }: { currentBranchId: number }) {
  const { t } = useTranslation();
  const { data } = useBranches();
  const others = (data?.items ?? []).filter((b) => b.id !== currentBranchId);

  if (others.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t("directory.others")}
      </h3>
      <div className="mt-3 max-h-[70vh] space-y-2.5 overflow-y-auto pr-1">
        {others.map((branch) => (
          <Link key={branch.id} to={`/antennes/apercu/${branch.id}`} className="block">
            <Card
              className={clsx(
                "flex items-center gap-3 p-3 transition-transform duration-200 hover:-translate-y-0.5",
              )}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                {branch.logoUrl ? (
                  <img src={branch.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-5 w-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {branch.cityName}
                </p>
                <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                  {branch.country}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
