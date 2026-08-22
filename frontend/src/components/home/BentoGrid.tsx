import { useTranslation } from "react-i18next";
import { BookOpen, Handshake, Landmark, HeartHandshake } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";
import { Button } from "../ui/Button";
import { useGlobalStats } from "../../hooks/useGlobalStats";
import { useDonationUiStore } from "../../store/donationUiStore";

export function BentoGrid() {
  const { t } = useTranslation();
  const { data, isLoading } = useGlobalStats();
  const openDonation = useDonationUiStore((s) => s.open);

  return (
    <section id="piliers" className="bg-slate-50 py-20 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <IconBadge icon={<BookOpen className="h-5 w-5" aria-hidden />} tone="emerald" />
            {isLoading ? (
              <Skeleton className="mt-4 h-9 w-20" />
            ) : (
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {data?.educationPosts ?? 0}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("bento.education_label")}
            </p>
          </Card>

          <Card className="p-6">
            <IconBadge icon={<Handshake className="h-5 w-5" aria-hidden />} tone="orange" />
            {isLoading ? (
              <Skeleton className="mt-4 h-9 w-20" />
            ) : (
              <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {data?.enterprisePosts ?? 0}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("bento.enterprise_label")}
            </p>
          </Card>

          <Card className="p-6">
            <IconBadge icon={<Landmark className="h-5 w-5" aria-hidden />} tone="slate" />
            <p className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {t("bento.transparency_value")}
            </p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {t("bento.transparency_label")}
            </p>
          </Card>

          <Card
            hoverable={false}
            className="flex flex-col justify-between overflow-hidden border-none bg-gradient-to-br from-orange-600 to-orange-700 p-6 text-white shadow-lg shadow-orange-600/20"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex rounded-xl bg-white/15 p-2.5">
                <HeartHandshake className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-xs font-semibold uppercase tracking-wide text-orange-100">
                {t("bento.urgent_label")}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openDonation()}
              className="mt-4 w-fit border-white/60"
            >
              {t("hero.cta_primary")}
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
