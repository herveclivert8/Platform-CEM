import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useAuthStore } from "../../store/authStore";
import { useChangePassword, useLogout } from "../../hooks/useAuth";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { apiErrorMessage } from "../../lib/api";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const logout = useLogout();
  const showSuccess = useSuccessToast();
  const changePassword = useChangePassword();

  const [formOpen, setFormOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [choiceOpen, setChoiceOpen] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const typing = formOpen && !!(currentPassword || newPassword || confirmPassword);

  const closeForm = () => {
    setFormOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    changePassword.reset();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword });
    } catch {
      return; // message affiché sous le formulaire (vraie cause renvoyée par l'API)
    }
    closeForm();
    setChoiceOpen(true); // rester connecté, ou se déconnecter
  };

  return (
    <div>
      <UnsavedChangesGuard when={typing} />

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.settings.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.settings.subtitle")}</p>

      <Card hoverable={false} className="mt-6 max-w-md p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.profile")}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {user?.firstName} {user?.lastName} — {user?.email}
        </p>

        <h2 className="mt-6 text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.change_password")}</h2>
        {!formOpen ? (
          <div className="mt-3">
            <p className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden /> {t("admin.settings.password_hint")}
            </p>
            <Button variant="secondary" className="mt-3" icon={<KeyRound className="h-4 w-4" />} onClick={() => setFormOpen(true)}>
              {t("admin.settings.change_password")}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
            <PasswordInput
              required
              autoFocus
              autoComplete="current-password"
              placeholder={t("admin.settings.current_password")}
              value={currentPassword}
              onChange={(e) => {
                changePassword.reset();
                setCurrentPassword(e.target.value);
              }}
              className={inputClass}
            />
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("auth.new_password")}
              value={newPassword}
              onChange={(e) => {
                changePassword.reset();
                setNewPassword(e.target.value);
              }}
              className={inputClass}
            />
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("admin.settings.confirm_new_password")}
              value={confirmPassword}
              onChange={(e) => {
                changePassword.reset();
                setConfirmPassword(e.target.value);
              }}
              className={inputClass}
            />

            {mismatch && <p className="text-sm text-red-600 dark:text-red-400">{t("auth.mismatch")}</p>}
            {changePassword.isError && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {apiErrorMessage(changePassword.error, t("admin.settings.password_error"))}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                variant="secondary"
                icon={<KeyRound className="h-4 w-4" />}
                disabled={changePassword.isPending || mismatch || !currentPassword || !newPassword || !confirmPassword}
              >
                {changePassword.isPending ? "…" : t("admin.settings.update")}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} disabled={changePassword.isPending}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <ConfirmDialog
        open={choiceOpen}
        title={t("admin.settings.password_updated_title")}
        message={t("admin.settings.password_updated_text")}
        confirmLabel={t("common.sign_out")}
        cancelLabel={t("common.stay_signed_in")}
        onConfirm={() => {
          setChoiceOpen(false);
          logout();
        }}
        onCancel={() => {
          setChoiceOpen(false);
          showSuccess(t("admin.settings.password_updated"));
        }}
      />
    </div>
  );
}
