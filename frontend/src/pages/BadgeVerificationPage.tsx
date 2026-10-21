import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BadgeCheck, BadgeX, HelpCircle } from "lucide-react";
import clsx from "clsx";
import { Skeleton } from "../components/ui/Skeleton";
import { QueryError } from "../components/ui/QueryError";
import { buttonClasses } from "../components/ui/buttonStyles";
import { useSiteLogo } from "../hooks/useSiteLogo";
import { useBadgeVerification } from "../hooks/useBadge";
import { usePageMeta } from "../hooks/usePageMeta";

/** Page opened by scanning a badge QR code: the holder's information, read live from the server. */
export function BadgeVerificationPage() {
  const { t, i18n } = useTranslation();
  usePageMeta(t("badge.verify.title"));
  const { token } = useParams();
  const { logo } = useSiteLogo();
  const { data: badge, isLoading, isError, error, refetch } = useBadgeVerification(token);

  const state = badge === null ? "unknown" : badge?.valid ? "valid" : "invalid";
  const Icon = state === "valid" ? BadgeCheck : state === "invalid" ? BadgeX : HelpCircle;
  const checkedAt = new Date().toLocaleString(i18n.language, { dateStyle: "long", timeStyle: "short" });

  return (
    <div className="mx-auto max-w-md px-4 py-20 sm:py-28">
      <div className="cem-card rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-white/10 dark:bg-slate-900">
        <img src={logo} alt="" width={56} height={56} className="mx-auto h-14 w-14 rounded-full bg-white p-0.5" />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          {t("badge.verify.title")}
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-3">
            <Skeleton className="mx-auto h-10 w-40" />
            <Skeleton className="mx-auto h-6 w-56" />
          </div>
        ) : isError ? (
          <QueryError error={error} onRetry={() => refetch()} />
        ) : (
          <>
            <p
              className={clsx(
                "mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold",
                state === "valid"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300"
                  : "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300",
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(`badge.verify.${state}`)}
            </p>

            {badge?.valid ? (
              <dl className="mt-6 space-y-1">
                <dt className="sr-only">{t("auth.last_name")}</dt>
                <dd className="font-display text-3xl text-slate-900 dark:text-white">
                  {badge.lastName} {badge.firstName}
                </dd>
                {badge.email && (
                  <>
                    <dt className="sr-only">{t("auth.email")}</dt>
                    <dd className="text-slate-600 dark:text-slate-300">{badge.email}</dd>
                  </>
                )}
                <dd
                  className={clsx(
                    "pt-3 text-lg font-bold uppercase tracking-wide",
                    badge.role === "SUPER_ADMIN" ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400",
                  )}
                >
                  {badge.title}
                </dd>
              </dl>
            ) : (
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                {t(state === "invalid" ? "badge.verify.invalid_text" : "badge.verify.unknown_text")}
              </p>
            )}

            <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">{t("badge.verify.checked_at", { date: checkedAt })}</p>
          </>
        )}
      </div>
      <div className="mt-6 text-center">
        <Link to="/" className={buttonClasses({ variant: "ghost" })}>
          {t("badge.verify.back_home")}
        </Link>
      </div>
    </div>
  );
}
