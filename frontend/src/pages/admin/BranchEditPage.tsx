import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { AddressAutocomplete, type GeoSelection } from "../../components/admin/AddressAutocomplete";
import { BranchProfileFields } from "../../components/admin/BranchProfileFields";
import { useBranch } from "../../hooks/useBranches";
import { useUpdateBranch, type TeamMemberInput } from "../../hooks/useAdminBranches";

export function BranchEditPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const id = branchId ? Number(branchId) : undefined;
  const { data: branch, isLoading } = useBranch(id);
  const updateBranch = useUpdateBranch(id);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMemberInput[]>([]);

  useEffect(() => {
    if (branch) {
      setName(branch.cityName);
      setCountry(branch.country);
      setAddress(branch.address ?? "");
      setCoords(branch.lat && branch.lng ? { lat: branch.lat, lng: branch.lng } : null);
      setContactEmail(branch.contactEmail ?? "");
      setContactPhone(branch.contactPhone ?? "");
      setDescription(branch.description ?? "");
      setLogoUrl(branch.logoUrl ?? "");
      setTeamMembers(
        branch.teamMembers?.map((m) => ({ name: m.name, role: m.role, photo_url: m.photoUrl ?? undefined })) ?? [],
      );
    }
  }, [branch]);

  const handleGeoSelect = (selection: GeoSelection) => {
    setName(selection.city);
    setCountry(selection.country || country);
    setAddress(selection.address);
    setCoords({ lat: selection.latitude, lng: selection.longitude });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateBranch.mutateAsync({
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
  };

  return (
    <div>
      <Link
        to="/admin/branches"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Retour aux antennes
      </Link>

      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {isLoading ? "…" : `${branch?.cityName} — ${branch?.country}`}
      </h1>

      {isLoading ? (
        <Skeleton className="mt-6 h-96 w-full max-w-2xl" />
      ) : (
        <Card hoverable={false} className="mt-6 max-w-2xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Rechercher une adresse (autocomplétion)
              </label>
              <AddressAutocomplete onSelect={handleGeoSelect} />
              {coords && (
                <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  Coordonnées : {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Ville</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Pays</label>
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

            {updateBranch.isError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.
              </p>
            )}
            {updateBranch.isSuccess && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> Antenne mise à jour.
              </p>
            )}

            <Button type="submit" variant="secondary" disabled={updateBranch.isPending}>
              {updateBranch.isPending ? "…" : "Enregistrer"}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
