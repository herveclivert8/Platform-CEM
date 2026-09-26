import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { BranchProfileFields } from "../../components/admin/BranchProfileFields";
import { useAuthStore } from "../../store/authStore";
import { useBranch } from "../../hooks/useBranches";
import { useUpdateBranch, type TeamMemberInput } from "../../hooks/useAdminBranches";
import { useTranslation } from "react-i18next";

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

  useEffect(() => {
    if (branch) {
      setAddress(branch.address ?? "");
      setContactEmail(branch.contactEmail ?? "");
      setContactPhone(branch.contactPhone ?? "");
      setDescription(branch.description ?? "");
      setLogoUrl(branch.logoUrl ?? "");
      setTeamMembers(
        branch.teamMembers?.map((m) => ({ name: m.name, role: m.role, photo_url: m.photoUrl ?? undefined })) ?? [],
      );
    }
  }, [branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBranch.mutateAsync({
      physical_address: address || null,
      contact_email: contactEmail || null,
      contact_phone: contactPhone || null,
      description: description || null,
      logo_url: logoUrl || null,
      team_members: teamMembers.filter((m) => m.name.trim() && m.role.trim()),
    });
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
              <p className="text-sm text-red-600 dark:text-red-400">
                {t("admin.branch_edit.save_error")}
              </p>
            )}
            {updateBranch.isSuccess && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {t("admin.branch_edit.updated")}
              </p>
            )}

            <Button type="submit" variant="secondary" disabled={updateBranch.isPending}>
              {updateBranch.isPending ? "…" : t("common.save")}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
