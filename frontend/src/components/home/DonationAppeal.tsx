import { useTranslation } from "react-i18next";
import { HeartHandshake } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { useDonationUiStore } from "../../store/donationUiStore";

/** Donation call under the cover: the cover itself no longer has a "Donate" button. */
export function DonationAppeal() {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);

  return (
    <section className="cem-photo-section dark py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Card
          hoverable={false}
          className="flex flex-col gap-4 overflow-hidden border-none bg-gradient-to-br from-orange-600 to-orange-700 p-6 text-white shadow-lg shadow-orange-600/20 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex rounded-xl bg-white/15 p-2.5">
              <HeartHandshake className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-sm font-semibold uppercase tracking-wide text-orange-100">{t("bento.urgent_label")}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => openDonation()} className="w-fit border-white/60">
            {t("hero.cta_primary")}
          </Button>
        </Card>
      </div>
    </section>
  );
}
