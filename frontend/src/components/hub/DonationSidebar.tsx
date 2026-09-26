import { useTranslation } from "react-i18next";
import { BookOpen, HeartHandshake } from "lucide-react";
import { Card, IconBadge } from "../ui/Card";
import { Button } from "../ui/Button";
import { useDonationUiStore } from "../../store/donationUiStore";
import type { Branch } from "../../types/branch";
import { formatAmount } from "../../types/donation";
import { PRICE_PER_BOOK } from "../donation/donationConstants";

export function DonationSidebar({ branch }: { branch: Branch }) {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);

  return (
    <Card className="hidden lg:sticky lg:top-24 lg:block p-6">
      <IconBadge icon={<HeartHandshake className="h-5 w-5" aria-hidden />} tone="orange" />
      <h3 className="mt-4 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        {t("hub.donation_sidebar_title")}
      </h3>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{branch.cityName}</p>

      <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
        <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {formatAmount(10 * PRICE_PER_BOOK.MGA, "MGA")} ≈ 10 livres scolaires
      </div>

      <Button
        variant="primary"
        className="mt-5 w-full justify-center"
        onClick={() => openDonation(branch.id, branch.cityName)}
      >
        {t("hero.cta_primary")}
      </Button>
    </Card>
  );
}
