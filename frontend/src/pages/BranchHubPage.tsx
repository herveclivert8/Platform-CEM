import { useParams } from "react-router-dom";
import { useBranch } from "../hooks/useBranches";
import { HubHero } from "../components/hub/HubHero";
import { KpiGrid } from "../components/hub/KpiGrid";
import { HubTabs } from "../components/hub/HubTabs";
import { DonationSidebar } from "../components/hub/DonationSidebar";
import { BottomActionBar } from "../components/hub/BottomActionBar";
import { OtherBranchesCarousel } from "../components/hub/OtherBranchesCarousel";
import { Skeleton } from "../components/ui/Skeleton";
import { useTranslation } from "react-i18next";

export function BranchHubPage() {
  const { t } = useTranslation();
  const { branchId } = useParams<{ branchId: string }>();
  const id = branchId ? Number(branchId) : undefined;
  const { data: branch, isLoading, isError } = useBranch(id);

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

  return (
    <div className="pb-20 lg:pb-0">
      <HubHero branch={branch} />
      <KpiGrid branchId={branch.id} />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 pt-6 sm:px-6 lg:grid-cols-[1fr_320px] lg:px-8">
        <div className="min-w-0">
          <HubTabs branch={branch} />
        </div>
        <div className="lg:py-16">
          <DonationSidebar branch={branch} />
        </div>
      </div>

      <OtherBranchesCarousel currentBranchId={branch.id} />
      <BottomActionBar branch={branch} />
    </div>
  );
}
