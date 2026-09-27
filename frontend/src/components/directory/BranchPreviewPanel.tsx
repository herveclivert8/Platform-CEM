import { Link } from "react-router-dom";
import { MapPin, Mail, Phone, Building2, ArrowRight, User } from "lucide-react";
import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { buttonClasses } from "../ui/buttonStyles";
import { useBranch } from "../../hooks/useBranches";
import { useTranslation } from "react-i18next";

export function BranchPreviewPanel({ branchId }: { branchId: number }) {
  const { t } = useTranslation();
  const { data: branch, isLoading, isError } = useBranch(branchId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-56 w-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !branch) {
    return (
      <p className="text-sm text-slate-400">
        {t("directory.not_found")}
      </p>
    );
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
        {branch.logoUrl ? (
          <img src={branch.logoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <Building2 className="h-12 w-12" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {branch.cityName}
        </h2>
        <p className="mt-1 text-sm font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
          {branch.country}
        </p>

        <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          {branch.address && (
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {branch.address}
            </p>
          )}
          {branch.contactEmail && (
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {branch.contactEmail}
            </p>
          )}
          {branch.contactPhone && (
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              {branch.contactPhone}
            </p>
          )}
        </div>

        {branch.description && (
          <p className="mt-6 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {branch.description}
          </p>
        )}

        {branch.manager && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("directory.manager")}
            </h3>
            <div className="mt-3 flex items-center gap-3">
              {branch.manager.avatarUrl ? (
                <img
                  src={branch.manager.avatarUrl}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <User className="h-5 w-5" aria-hidden />
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {branch.manager.fullName}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {branch.manager.email}
                </p>
              </div>
            </div>
          </div>
        )}

        {branch.teamMembers && branch.teamMembers.length > 0 && (
          <div className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("directory.team")}
            </h3>
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {branch.teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 p-2.5 dark:border-slate-800"
                >
                  {member.photoUrl ? (
                    <img
                      src={member.photoUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      <User className="h-4 w-4" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {member.name}
                    </p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {member.role}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-8">
          <Link to={`/antennes/${branch.id}`} className={buttonClasses({ variant: "secondary", className: "w-full" })}>
            {t("directory.see_full")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </Card>
  );
}
