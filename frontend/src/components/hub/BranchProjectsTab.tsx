import { useTranslation } from "react-i18next";
import { ProjectsShowcase } from "../projects/ProjectsShowcase";
import { useCanSeeMemberContent } from "../../hooks/useProjects";

/** Branch page: this branch's ongoing projects and achievements. */
export function BranchProjectsTab({ branchId }: { branchId: number }) {
  const { t } = useTranslation();
  const memberView = useCanSeeMemberContent();
  return (
    <div className="space-y-12">
      {/* Ongoing projects: members (fee up to date) and admins only */}
      {memberView && (
        <ProjectsShowcase phase="ONGOING" branchId={branchId} title={t("projects.ongoing_title")} emptyText={t("hub.no_ongoing")} />
      )}
      <ProjectsShowcase phase="COMPLETED" branchId={branchId} title={t("projects.completed_title")} emptyText={t("hub.no_achievements")} />
    </div>
  );
}
