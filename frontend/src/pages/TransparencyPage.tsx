import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Download, FileText, Globe2, HeartHandshake, MapPin, Trophy, Users } from "lucide-react";
import { Card, IconBadge } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { QueryError } from "../components/ui/QueryError";
import { useTransparency } from "../hooks/useTransparency";
import { usePageMeta } from "../hooks/usePageMeta";
import { dateLocale } from "../lib/locale";
import { formatAmount } from "../types/donation";

/** « Transparence » : what the network does and, if the super admin chose so, what it receives. */
export function TransparencyPage() {
  const { t } = useTranslation();
  usePageMeta(t("transparency.title"), t("transparency.subtitle"));
  const { data, isLoading, isError, error, refetch } = useTransparency();

  const stats = data
    ? [
        { icon: MapPin, value: data.branches, label: t("transparency.stat_branches") },
        { icon: Globe2, value: data.countries, label: t("transparency.stat_countries") },
        { icon: Trophy, value: data.achievements, label: t("transparency.stat_achievements") },
        { icon: Users, value: data.beneficiaries, label: t("transparency.stat_beneficiaries") },
      ]
    : [];

  const years = [...new Set((data?.donationsByYear ?? []).map((d) => d.year))];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">{t("transparency.title")}</h1>
      <p className="mt-3 max-w-2xl text-slate-500 dark:text-slate-400">{t("transparency.subtitle")}</p>

      {isLoading ? (
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : isError || !data ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <dl className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(({ icon: Icon, value, label }) => (
              <Card key={label} hoverable={false} className="flex flex-col p-5">
                <IconBadge icon={<Icon className="h-5 w-5" aria-hidden />} tone="emerald" />
                <dd className="order-2 mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  {value.toLocaleString(dateLocale())}
                </dd>
                <dt className="order-3 mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</dt>
              </Card>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-400">
            {t("transparency.stats_note", { count: data.ongoingProjects })}{" "}
            <Link to="/realisations" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              {t("transparency.see_achievements")}
            </Link>
          </p>

          {data.donationsTotal && (
            <section className="mt-14">
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                <HeartHandshake className="h-5 w-5 text-orange-600" aria-hidden /> {t("transparency.donations_title")}
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("transparency.donations_note")}</p>
              {data.donationsTotal.length === 0 ? (
                <p className="mt-4 text-sm text-slate-400">{t("transparency.donations_none")}</p>
              ) : (
                <>
                  <div className="mt-5 flex flex-wrap gap-4">
                    {data.donationsTotal.map((d) => (
                      <Card key={d.currency} hoverable={false} className="min-w-[200px] p-5">
                        <p className="text-2xl font-extrabold tracking-tight text-orange-600 dark:text-orange-400">
                          {formatAmount(d.amount, d.currency)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("transparency.donation_count", { count: d.count })}</p>
                      </Card>
                    ))}
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[420px] text-left text-sm">
                      <thead className="text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="py-2 pr-4 font-semibold">{t("transparency.year")}</th>
                          <th className="py-2 pr-4 font-semibold">{t("transparency.amount")}</th>
                          <th className="py-2 font-semibold">{t("transparency.donations")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                        {years.map((year) =>
                          data.donationsByYear!
                            .filter((d) => d.year === year)
                            .map((d, i) => (
                              <tr key={`${year}-${d.currency}`}>
                                <td className="py-2 pr-4 font-semibold">{i === 0 ? year : ""}</td>
                                <td className="py-2 pr-4">{formatAmount(d.amount, d.currency)}</td>
                                <td className="py-2">{d.count}</td>
                              </tr>
                            )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          )}

          <section className="mt-14">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              <FileText className="h-5 w-5 text-emerald-600" aria-hidden /> {t("transparency.reports_title")}
            </h2>
            {data.reports.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400">{t("transparency.reports_none")}</p>
            ) : (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.reports.map((report) => (
                  <Card key={report.id} className="flex items-start gap-4 p-5">
                    {report.thumbnailUrl ? (
                      <img src={report.thumbnailUrl} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <IconBadge icon={<FileText className="h-5 w-5" aria-hidden />} tone="emerald" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{report.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{report.description}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        <Link
                          to={`/antennes/${report.branchId}`}
                          className="font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                        >
                          {report.branchName}
                        </Link>
                        {" · "}
                        {new Date(report.createdAt).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" })}
                      </p>
                    </div>
                    {report.fileUrl && (
                      <a
                        href={report.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t("hub.reports.download", { title: report.title })}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-emerald-600 dark:hover:bg-slate-800"
                      >
                        <Download className="h-4 w-4" aria-hidden />
                      </a>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
