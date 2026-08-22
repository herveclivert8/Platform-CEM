import { useState } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { useAuthStore } from "../../store/authStore";
import { useChangePassword } from "../../hooks/useAuth";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const changePassword = useChangePassword();

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-white">Paramètres</h1>
      <p className="mt-1 text-sm text-slate-400">Gérez votre compte.</p>

      <Card hoverable={false} className="mt-6 max-w-md p-6">
        <h2 className="text-sm font-semibold text-white">Profil</h2>
        <p className="mt-2 text-sm text-slate-400">
          {user?.firstName} {user?.lastName} — {user?.email}
        </p>

        <h2 className="mt-6 text-sm font-semibold text-white">Changer de mot de passe</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <input
            type="password"
            required
            placeholder="Mot de passe actuel"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Nouveau mot de passe"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
          <input
            type="password"
            required
            minLength={8}
            placeholder="Confirmer le nouveau mot de passe"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />

          {mismatch && <p className="text-sm text-red-400">Les mots de passe ne correspondent pas.</p>}
          {changePassword.isError && <p className="text-sm text-red-400">Mot de passe actuel incorrect.</p>}
          {changePassword.isSuccess && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Mot de passe mis à jour.
            </p>
          )}

          <Button
            type="submit"
            variant="secondary"
            icon={<KeyRound className="h-4 w-4" />}
            disabled={changePassword.isPending || mismatch}
          >
            {changePassword.isPending ? "…" : "Mettre à jour"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
