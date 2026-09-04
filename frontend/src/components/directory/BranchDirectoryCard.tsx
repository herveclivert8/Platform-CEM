import { Link } from "react-router-dom";
import { MapPin, Mail, Phone, Building2 } from "lucide-react";
import { Card } from "../ui/Card";
import type { Branch } from "../../types/branch";

export function BranchDirectoryCard({ branch }: { branch: Branch }) {
  return (
    <Link to={`/antennes/apercu/${branch.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1">
        <div className="aspect-[16/9] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {branch.logoUrl ? (
            <img src={branch.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
              <Building2 className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-5">
          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            {branch.cityName}
          </h3>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {branch.country}
          </p>

          <div className="mt-2 space-y-1.5 text-sm text-slate-500 dark:text-slate-400">
            {branch.address && (
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2">{branch.address}</span>
              </p>
            )}
            {branch.contactEmail && (
              <p className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{branch.contactEmail}</span>
              </p>
            )}
            {branch.contactPhone && (
              <p className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{branch.contactPhone}</span>
              </p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
