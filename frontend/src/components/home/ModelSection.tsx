import { useTranslation } from "react-i18next";
import { Plane, Sprout, ArrowRight } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { useBranches } from "../../hooks/useBranches";

export function ModelSection() {
  const { t } = useTranslation();
  const { data, isLoading } = useBranches();

  const franceCount = data?.items.filter((b) => b.country === "France").length ?? 0;
  const madagascarCount = data?.items.filter((b) => b.country === "Madagascar").length ?? 0;

  return (
    <section id="modele" className="bg-slate-50 py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t("model.title")}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-slate-500 dark:text-slate-400">
            {t("model.subtitle")}
          </p>
        </div>

        <div className="relative grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-10">
          <Card className="p-7">
            <IconBadge icon={<Plane className="h-5 w-5" aria-hidden />} tone="orange" />
            <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t("model.diaspora_title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t("model.diaspora_text")}
            </p>
            {isLoading ? (
              <Skeleton className="mt-5 h-6 w-32" />
            ) : (
              <p className="mt-5 text-sm font-semibold text-orange-600 dark:text-orange-400">
                {franceCount} {t("model.diaspora_count")}
              </p>
            )}
          </Card>

          <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:flex">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-400 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <ArrowRight className="h-4 w-4" aria-hidden />
            </span>
          </div>

          <Card className="p-7">
            <IconBadge icon={<Sprout className="h-5 w-5" aria-hidden />} tone="emerald" />
            <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {t("model.terrain_title")}
            </h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t("model.terrain_text")}
            </p>
            {isLoading ? (
              <Skeleton className="mt-5 h-6 w-32" />
            ) : (
              <p className="mt-5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                {madagascarCount} {t("model.terrain_count")}
              </p>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
