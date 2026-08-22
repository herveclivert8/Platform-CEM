import { useEffect, useState } from "react";
import { Drawer } from "./Drawer";
import { AddressAutocomplete, type GeoSelection } from "./AddressAutocomplete";
import { Button } from "../ui/Button";
import type { Branch } from "../../types/branch";
import { useCreateBranch, useUpdateBranch } from "../../hooks/useAdminBranches";

interface BranchDrawerProps {
  open: boolean;
  onClose: () => void;
  branch?: Branch;
}

export function BranchDrawer({ open, onClose, branch }: BranchDrawerProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch(branch?.id);

  useEffect(() => {
    if (open) {
      setName(branch?.cityName ?? "");
      setCountry(branch?.country ?? "Madagascar");
      setAddress(branch?.address ?? "");
      setCoords(branch?.lat && branch?.lng ? { lat: branch.lat, lng: branch.lng } : null);
      setContactEmail(branch?.contactEmail ?? "");
      setContactPhone(branch?.contactPhone ?? "");
    }
  }, [open, branch]);

  const handleGeoSelect = (selection: GeoSelection) => {
    setName(selection.city);
    setCountry(selection.country || country);
    setAddress(selection.address);
    setCoords({ lat: selection.latitude, lng: selection.longitude });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      country,
      physical_address: address || undefined,
      latitude: coords?.lat,
      longitude: coords?.lng,
      contact_email: contactEmail || undefined,
      contact_phone: contactPhone || undefined,
    };
    if (branch) {
      await updateBranch.mutateAsync(payload);
    } else {
      await createBranch.mutateAsync(payload);
    }
    onClose();
  };

  const isPending = createBranch.isPending || updateBranch.isPending;
  const hasError = createBranch.isError || updateBranch.isError;

  return (
    <Drawer open={open} onClose={onClose} title={branch ? "Modifier l'antenne" : "Nouvelle antenne"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">
            Rechercher une adresse (autocomplétion)
          </label>
          <AddressAutocomplete onSelect={handleGeoSelect} />
          {coords && (
            <p className="mt-1.5 text-xs text-emerald-400">
              Coordonnées : {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Ville</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Pays</label>
            <input
              required
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Email de contact</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-400">Téléphone</label>
          <input
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {hasError && (
          <p className="text-sm text-red-400">
            Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.
          </p>
        )}

        <div className="border-t border-slate-800 pt-5">
          <Button type="submit" variant="secondary" className="w-full justify-center" disabled={isPending}>
            {isPending ? "…" : branch ? "Enregistrer" : "Créer l'antenne"}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
