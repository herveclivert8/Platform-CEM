import { useEffect, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { BranchProfileFields } from "../../components/admin/BranchProfileFields";
import { useAuthStore } from "../../store/authStore";
import { useBranch } from "../../hooks/useBranches";
import { useUpdateBranch, type TeamMemberInput } from "../../hooks/useAdminBranches";
import { useTranslation } from "react-i18next";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { apiErrorMessage } from "../../lib/api";

export function MyBranchPage() {
  const { t } = useTranslation();
  const branchId = useAuthStore((s) => s.user?.branchId ?? undefined);
  const { data: branch, isLoading } = useBranch(branchId);
  const updateBranch = useUpdateBranch(branchId);

  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);

  const values = { address, contactEmail, contactPhone, description, logoUrl, teamMembers };
  const { isDirty, markSaved } = useUnsavedChanges(values);
  const showSuccess = useSuccessToast();

  useEffect(() => {
    if (branch) {
      markSaved({
        address: branch.address ?? "",
        contactEmail: branch.contactEmail ?? "",
        contactPhone: branch.contactPhone ?? "",
        description: branch.description ?? "",
        logoUrl: branch.logoUrl ?? "",
        teamMembers: branch.teamMembers?.map((m) => ({ name: m.name, role: m.role, photo_url: m.photoUrl ?? undefined })) ?? [],
      });
      setAddress(branch.address ?? "");
      setContactEmail(branch.contactEmail ?? "");
      setContactPhone(branch.contactPhone ?? "");
      setDescription(branch.description ?? "");
      setLogoUrl(branch.logoUrl ?? "");
      setTeamMembers(
        branch.teamMembers?.map((m) => ({ name: m.name, role: m.role, photo_url: m.photoUrl ?? undefined })) ?? [],
      );
    }
  }, [branch, markSaved]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateBranch.mutateAsync({
      physical_address: address || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      description: description || null,
      logo_url: logoUrl || null,
      team_members: teamMembers.filter((m) => m.name.trim() && m.role.trim()),
    });
    } catch {
      return; // erreur affichée sous le formulaire
    }
    markSaved(values);
    showSuccess(t("admin.branch_edit.updated"));
  };

  if (!branchId) {
    return (
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.my_branch.title")}</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t("admin.my_branch.none")}</p>
      </div>
    );
  }

  return (
    <div>
      <UnsavedChangesGuard when={isDirty} />
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.my_branch.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {t("admin.my_branch.subtitle")}
      </p>

      {isLoading ? (
        <Skeleton className="mt-6 h-96 w-full max-w-2xl" />
      ) : (
        <Card hoverable={false} className="mt-6 max-w-2xl p-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            {branch?.cityName} — {branch?.country}
          </h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.my_branch.address")}</label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <BranchProfileFields
              contactEmail={contactEmail}
              onContactEmailChange={setContactEmail}
              contactPhone={contactPhone}
              onContactPhoneChange={setContactPhone}
              logoUrl={logoUrl}
              onLogoUrlChange={setLogoUrl}
              description={description}
              onDescriptionChange={setDescription}
              teamMembers={teamMembers}
              onTeamMembersChange={setTeamMembers}
            />

            {updateBranch.isError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {apiErrorMessage(updateBranch.error, t("admin.branch_edit.save_error"))}
              </p>
            )}

            <Button type="submit" variant="secondary" disabled={updateBranch.isPending || !isDirty}>
              {updateBranch.isPending ? "…" : t("common.save")}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
