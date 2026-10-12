import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock } from "lucide-react";
import { buttonClasses } from "../ui/buttonStyles";
import { useAuthStore } from "../../store/authStore";

/** Ongoing projects are members-only: invites visitors to join, and members behind on their fee to pay it. */
export function MembersOnlyNotice() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
        <Lock className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{t("projects.members_only_title")}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        {t(isAuthenticated ? "projects.members_only_unpaid" : "projects.members_only_text")}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {isAuthenticated ? (
          <Link to="/espace-membre" className={buttonClasses({ variant: "secondary" })}>
            {t("nav.my_area")}
          </Link>
        ) : (
          <>
            <Link to="/inscription" className={buttonClasses({ variant: "secondary" })}>
              {t("nav.register")}
            </Link>
            <Link to="/login" className={buttonClasses({ variant: "ghost", className: "border border-slate-200 dark:border-slate-700" })}>
              {t("nav.login")}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
