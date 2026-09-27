import { useTranslation } from "react-i18next";
import { HeartHandshake, Mail, MapPin, Phone } from "lucide-react";
import { ALL_PILLARS } from "../../types/post";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { Link } from "react-router-dom";
import { SocialLinks } from "./SocialLinks";
import { NewsletterSignup } from "./NewsletterSignup";
import { useHomePage } from "../../hooks/useHomePage";

const DEFAULT_CONTACT_EMAIL = "contact@cem-madagascar.org";

export function Footer() {
  const { t } = useTranslation();
  const pillarLabels = usePillarLabels();
  // « Nos valeurs » and contact are set by the super admin (defaults: the four pillars, HQ address)
  const { data: home } = useHomePage();
  const values = home?.values ?? ALL_PILLARS.map((p) => pillarLabels[p]);
  const contactEmail = home?.contactEmail || DEFAULT_CONTACT_EMAIL;

  return (
    <footer className="border-t border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
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
              {values.map((value, i) => (
                <li key={i}>{value}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("footer.contact_title")}</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-slate-500 dark:text-slate-400">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                {home?.contactAddress || t("footer.address")}
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <a href={`mailto:${contactEmail}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
                  {contactEmail}
                </a>
              </li>
              {home?.contactPhone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <a href={`tel:${home.contactPhone.replace(/s+/g, "")}`} className="hover:text-emerald-600 dark:hover:text-emerald-400">
                    {home.contactPhone}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t("newsletter.title")}</h3>
            <div className="mt-4">
              <NewsletterSignup />
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row dark:border-slate-800">
          <p>
            © {new Date().getFullYear()} Club Excellence Madagascar — {t("footer.rights")}
          </p>
          <Link to="/transparence" className="font-medium hover:text-emerald-600 dark:hover:text-emerald-400">
            {t("footer.transparency")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
