import { useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { PasswordInput } from "../../components/ui/PasswordInput";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { UnsavedChangesGuard } from "../../components/admin/UnsavedChangesGuard";
import { useAuthStore } from "../../store/authStore";
import { useChangeEmail, useChangePassword, useLogout } from "../../hooks/useAuth";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { apiErrorMessage } from "../../lib/api";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

/** Sign-in email change, confirmed with the current password. */
function EmailCard({ onEditing }: { onEditing: (editing: boolean) => void }) {
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const changeEmail = useChangeEmail();
  const [formOpen, setFormOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");

  const closeForm = () => {
    setFormOpen(false);
    setNewEmail("");
    setPassword("");
    changeEmail.reset();
    onEditing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await changeEmail.mutateAsync({ newEmail: newEmail.trim(), currentPassword: password });
    } catch {
      return; // message affiché sous le formulaire
    }
    closeForm();
    showSuccess(t("admin.settings.email_updated"));
  };

  return (
    <Card hoverable={false} className="max-w-md p-6">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.email")}</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
      {!formOpen ? (
        <Button
          variant="secondary"
          className="mt-3"
          icon={<Mail className="h-4 w-4" />}
          onClick={() => {
            setFormOpen(true);
            onEditing(true);
          }}
        >
          {t("admin.settings.change_email")}
        </Button>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <input
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder={t("admin.settings.new_email")}
            value={newEmail}
            onChange={(e) => {
              changeEmail.reset();
              setNewEmail(e.target.value);
            }}
            className={inputClass}
          />
          <PasswordInput
            required
            autoComplete="current-password"
            placeholder={t("admin.settings.current_password")}
            value={password}
            onChange={(e) => {
              changeEmail.reset();
              setPassword(e.target.value);
            }}
            className={inputClass}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">{t("admin.settings.email_hint")}</p>
          {changeEmail.isError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {apiErrorMessage(changeEmail.error, t("admin.settings.email_error"))}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="secondary"
              icon={<Mail className="h-4 w-4" />}
              disabled={changeEmail.isPending || !newEmail.trim() || !password}
            >
              {changeEmail.isPending ? "…" : t("admin.settings.update")}
            </Button>
            <Button type="button" variant="ghost" onClick={closeForm} disabled={changeEmail.isPending}>
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

/** « Mon compte » : sign-in email and password of the signed-in admin. */
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
  const [editingEmail, setEditingEmail] = useState(false);

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
      <UnsavedChangesGuard when={typing || editingEmail} />

      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.settings.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.settings.subtitle")}</p>

      <Card hoverable={false} className="mt-6 max-w-md p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.profile")}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          {user?.firstName} {user?.lastName}
        </p>
      </Card>

      <div className="mt-4">
        <EmailCard onEditing={setEditingEmail} />
      </div>

      <Card hoverable={false} className="mt-4 max-w-md p-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{t("admin.settings.change_password")}</h2>
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
