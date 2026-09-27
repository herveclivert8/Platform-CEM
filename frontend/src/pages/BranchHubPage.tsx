import { useParams } from "react-router-dom";
import { useBranch } from "../hooks/useBranches";
import type { Branch } from "../types/branch";
import { HubHero } from "../components/hub/HubHero";
import { KpiGrid } from "../components/hub/KpiGrid";
import { HubTabs } from "../components/hub/HubTabs";
import { DonationSidebar } from "../components/hub/DonationSidebar";
import { BottomActionBar } from "../components/hub/BottomActionBar";
import { OtherBranchesCarousel } from "../components/hub/OtherBranchesCarousel";
import { Skeleton } from "../components/ui/Skeleton";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../hooks/usePageMeta";

export function BranchHubPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const { data: branch, isLoading, isError } = useBranch(branchId ? Number(branchId) : undefined);
  return <BranchHub branch={branch} isLoading={isLoading} isError={isError} />;
}

function BranchHub({ branch, isLoading, isError }: { branch?: Branch; isLoading: boolean; isError: boolean }) {
  const { t } = useTranslation();
  usePageMeta(
    branch ? t(/^[aeiouyâéèêîôûh]/i.test(branch.cityName) ? "seo.branch_of_elided" : "seo.branch_of", { city: branch.cityName }) : isError ? t("hub.not_found") : undefined,
    branch?.description,
  );

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !branch) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          {t("hub.not_found")}
        </p>
      </div>
    );
  }

  const acceptsDonations = branch.status === "active";

  return (
    <div className={acceptsDonations ? "pb-20 lg:pb-0" : undefined}>
      <HubHero branch={branch} />
      <KpiGrid branchId={branch.id} />

      <div
        className={`mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pt-6 sm:px-6 lg:px-8 ${
          acceptsDonations ? "lg:grid-cols-[1fr_320px]" : ""
        }`}
      >
        <div className="min-w-0">
          <HubTabs branch={branch} />
        </div>
        {acceptsDonations && (
          <div className="lg:py-16">
            <DonationSidebar branch={branch} />
          </div>
        )}
      </div>

      <OtherBranchesCarousel currentBranchId={branch.id} />
      {acceptsDonations && <BottomActionBar branch={branch} />}
    </div>
  );
}
