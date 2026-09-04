import { useTranslation } from "react-i18next";
import { HeartHandshake, Mail, MapPin } from "lucide-react";
import { ALL_PILLARS } from "../../types/post";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  const { t } = useTranslation();
  const pillarLabels = usePillarLabels();

  return (
    <footer className="border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <HeartHandshake className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-bold tracking-tight text-slate-900 dark:text-white">
                Club Excellence Madagascar
              </span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-slate-500 dark:text-slate-400">
              {t("footer.association")}
            </p>
            <div className="mt-5">
              <SocialLinks />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t("footer.pillars_title")}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
              {ALL_PILLARS.map((p) => (
                <li key={p}>{pillarLabels[p]}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Contact</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {t("footer.address")}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                contact@cem-madagascar.org
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800">
          <p>
            © {new Date().getFullYear()} Club Excellence Madagascar — {t("footer.rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
