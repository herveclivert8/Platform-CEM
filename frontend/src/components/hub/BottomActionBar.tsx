import { useTranslation } from "react-i18next";
import { Heart } from "lucide-react";
import { Button } from "../ui/Button";
import { useDonationUiStore } from "../../store/donationUiStore";
import type { Branch } from "../../types/branch";

export function BottomActionBar({ branch }: { branch: Branch }) {
  const { t } = useTranslation();
  const openDonation = useDonationUiStore((s) => s.open);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
      <Button
        variant="primary"
        icon={<Heart className="h-4 w-4" />}
        className="w-full justify-center"
        onClick={() => openDonation(branch.id, branch.cityName)}
      >
        {t("hero.cta_primary")}
      </Button>
    </div>
  );
}
