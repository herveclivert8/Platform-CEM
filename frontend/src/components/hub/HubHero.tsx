import { useTranslation } from "react-i18next";
import { MapPin, Mail, Phone } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { Branch } from "../../types/branch";
import { QuickSwitchCombobox } from "./QuickSwitchCombobox";

export function HubHero({ branch }: { branch: Branch }) {
  const { t } = useTranslation();

  return (
    <section className="relative bg-slate-900">
      {branch.bannerUrl && (
        <div className="absolute inset-0">
          <img src={branch.bannerUrl} alt="" className="h-full w-full object-cover opacity-40" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/70 to-slate-900/40" />

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-20 sm:px-6 lg:px-8">
        {branch.status === "inactive" ? (
          <Badge tone="glass">{t("hub.inactive_badge")}</Badge>
        ) : (
          <Badge tone="emerald">{t("hub.official_badge")}</Badge>
        )}
        <h1 className="mt-5 text-3xl font-extrabold uppercase tracking-tight text-white lg:text-5xl">
          {branch.cityName}, {branch.country}
        </h1>

        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
          {branch.address && (
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-emerald-400" aria-hidden />
              {branch.address}
            </span>
          )}
          {branch.contactEmail && (
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-emerald-400" aria-hidden />
              {branch.contactEmail}
            </span>
          )}
          {branch.contactPhone && (
            <span className="flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-emerald-400" aria-hidden />
              {branch.contactPhone}
            </span>
          )}
        </div>

        {branch.status === "inactive" && (
          <p className="mt-6 max-w-2xl rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-slate-100 backdrop-blur-sm">
            {t("hub.inactive_notice")}
          </p>
        )}

        <div className="mt-8">
          <QuickSwitchCombobox currentBranchId={branch.id} />
        </div>
      </div>
    </section>
  );
}
