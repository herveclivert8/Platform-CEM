import { useState } from "react";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { useAuthStore } from "../../store/authStore";
import { useChangePassword } from "../../hooks/useAuth";
import { useTranslation } from "react-i18next";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
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
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.settings.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.settings.subtitle")}</p>

      <Card hoverable={false} className="mt-6 max-w-md p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.profile")}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {user?.firstName} {user?.lastName} — {user?.email}
        </p>

        <h2 className="mt-6 text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.change_password")}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <PasswordInput
            required
            placeholder={t("admin.settings.current_password")}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <PasswordInput
            required
            minLength={8}
            placeholder={t("auth.new_password")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <PasswordInput
            required
            minLength={8}
            placeholder={t("admin.settings.confirm_new_password")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          {mismatch && <p className="text-sm text-red-600 dark:text-red-400">{t("auth.mismatch")}</p>}
          {changePassword.isError && <p className="text-sm text-red-600 dark:text-red-400">{t("admin.settings.wrong_password")}</p>}
          {changePassword.isSuccess && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> {t("admin.settings.password_updated")}
            </p>
          )}

          <Button
            type="submit"
            variant="secondary"
            icon={<KeyRound className="h-4 w-4" />}
            disabled={changePassword.isPending || mismatch}
          >
            {changePassword.isPending ? "…" : t("admin.settings.update")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
