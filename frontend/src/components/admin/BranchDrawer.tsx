import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { AddressAutocomplete, type GeoSelection } from "./AddressAutocomplete";
import { Button } from "../ui/Button";
import { BranchProfileFields } from "./BranchProfileFields";
import { useCreateBranch, type TeamMemberInput } from "../../hooks/useAdminBranches";
import { useTranslation } from "react-i18next";
import { useSuccessToast } from "../../hooks/useSuccessToast";

interface BranchDrawerProps {
  open: boolean;
  onClose: () => void;
}

/** Creation only - editing an existing branch happens on its own full page (BranchEditPage). */
export function BranchDrawer({ open, onClose }: BranchDrawerProps) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);

  const createBranch = useCreateBranch();

  useEffect(() => {
    if (open) {
      setName("");
      setCountry("Madagascar");
      setAddress("");
      setCoords(null);
      setContactEmail("");
      setContactPhone("");
      setDescription("");
      setLogoUrl("");
      setTeamMembers([]);
    }
  }, [open]);

  const handleGeoSelect = (selection: GeoSelection) => {
    setName(selection.city);
    setCountry(selection.country || country);
    setAddress(selection.address);
    setCoords({ lat: selection.latitude, lng: selection.longitude });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBranch.mutateAsync({
      name,
      country,
      physical_address: address || undefined,
      latitude: coords?.lat,
      longitude: coords?.lng,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
      description: description || undefined,
      logo_url: logoUrl || undefined,
      team_members: teamMembers.filter((m) => m.name.trim() && m.role.trim()),
    });
    } catch {
      return; // affiché sous le formulaire
    }
    showSuccess(t("admin.feedback.branch_created"), name);
    onClose();
  };

  return (
    <Drawer open={open} onClose={onClose} title={t("admin.branches.new")}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("admin.branch_edit.address_search")}
          </label>
          <AddressAutocomplete onSelect={handleGeoSelect} />
          {coords ? (
            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              {t("admin.branch_edit.coordinates", { lat: coords.lat.toFixed(4), lng: coords.lng.toFixed(4) })}
            </p>
          ) : (
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t("admin.branch_edit.auto_position")}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.branch_edit.city")}</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.branch_edit.country")}</label>
            <input
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
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

        {createBranch.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("admin.branch_edit.save_error")}
          </p>
        )}

        <div className="border-t border-slate-200 pt-5 dark:border-slate-800">
          <Button type="submit" variant="secondary" className="w-full justify-center" disabled={createBranch.isPending}>
            {createBranch.isPending ? "…" : t("admin.branch_edit.create")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
