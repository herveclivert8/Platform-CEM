import { useState } from "react";
import { Drawer } from "./Drawer";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useBranches } from "../../hooks/useBranches";
import { useCreateAccount } from "../../hooks/useAdminAccounts";

export function CreateAccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const { data: branchesData } = useBranches();
  const createAccount = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    await createAccount.mutateAsync({ email, firstName, lastName, branchId });
  };

  const handleClose = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setBranchId("");
    createAccount.reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title="Nouveau compte administrateur">
      {createAccount.isSuccess ? (
        <div className="space-y-4">
          <Badge tone="emerald">Compte créé</Badge>
          <p className="text-sm text-slate-300">
            Mot de passe temporaire à communiquer à l'admin (il pourra le modifier depuis Paramètres) :
          </p>
          <div className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 font-mono text-sm text-emerald-400">
            {createAccount.data?.temporary_password}
          </div>
          {!createAccount.data?.welcome_email_sent && (
            <p className="text-xs text-slate-500">
              L'email de bienvenue n'a pas pu être envoyé (SMTP non configuré) — communiquez ce mot de passe manuellement.
            </p>
          )}
          <Button variant="secondary" onClick={handleClose}>
            Terminer
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="Prénom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
            <input
              required
              placeholder="Nom"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <select
            required
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="">Antenne à attribuer…</option>
            {branchesData?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>

          {createAccount.isError && (
            <p className="text-sm text-red-400">Cet email existe peut-être déjà.</p>
          )}

          <Button type="submit" variant="secondary" className="w-full justify-center" disabled={createAccount.isPending}>
            {createAccount.isPending ? "…" : "Créer le compte"}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
