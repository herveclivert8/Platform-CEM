import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import type { Branch } from "../../types/branch";
import { ProjectsTab } from "./ProjectsTab";
import { BranchProjectsTab } from "./BranchProjectsTab";
import { TeamContactTab } from "./TeamContactTab";
import { ReportsTab } from "./ReportsTab";

type TabKey = "projects" | "news" | "team" | "reports";

export function HubTabs({ branch }: { branch: Branch }) {
  const { t } = useTranslation();
  const [active, setActive] = useState<TabKey>("projects");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "projects", label: t("hub.tabs.projects") },
    { key: "news", label: t("hub.tabs.news") },
    { key: "team", label: t("hub.tabs.team") },
    { key: "reports", label: t("hub.tabs.reports") },
  ];

  return (
    <div className="py-6 lg:py-16">
      <div className="border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActive(tab.key)}
              className={clsx(
                "relative shrink-0 px-4 py-3 text-sm font-semibold transition-colors",
                active === tab.key
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              )}
            >
              {tab.label}
              {active === tab.key && (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-emerald-600 dark:bg-emerald-400" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 animate-fade-in-up">
        {active === "projects" && <BranchProjectsTab branchId={branch.id} />}
        {active === "news" && <ProjectsTab branchId={branch.id} />}
        {active === "team" && <TeamContactTab branch={branch} />}
        {active === "reports" && <ReportsTab branchId={branch.id} />}
      </div>
    </div>
  );
}
