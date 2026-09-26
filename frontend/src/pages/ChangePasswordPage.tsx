import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { KeyRound } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useChangePassword, useLogout } from "../hooks/useAuth";
import { useAuthStore } from "../store/authStore";
import { useTranslation } from "react-i18next";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

/** First login with a temporary password: the admin must choose their own before going further. */
export function ChangePasswordPage() {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword ?? false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const changePassword = useChangePassword();
  const logout = useLogout();
  const navigate = useNavigate();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!mustChangePassword && !changePassword.isPending) return <Navigate to="/admin" replace />;

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword, confirmPassword });
      navigate("/admin", { replace: true });
    } catch {
      // error surfaced below via changePassword.isError
    }
  };

  const errorDetail = isAxiosError(changePassword.error) ? changePassword.error.response?.data?.detail : undefined;

  return (
    <AuthShell
      title={t("auth.change_title")}
      subtitle={t("auth.change_subtitle")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <PasswordInput
          required
          placeholder={t("auth.temporary_password")}
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className={inputClass}
        />
        <PasswordInput
          required
          minLength={8}
          placeholder={t("auth.new_password_min")}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
        <PasswordInput
          required
          minLength={8}
          placeholder={t("auth.confirm_password")}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
        {mismatch && <p className="text-sm text-red-600 dark:text-red-400">{t("auth.mismatch")}</p>}
        {changePassword.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {typeof errorDetail === "string" ? errorDetail : t("common.error_retry")}
          </p>
        )}
        <Button
          type="submit"
          variant="secondary"
          icon={<KeyRound className="h-4 w-4" />}
          disabled={changePassword.isPending || mismatch}
          className="w-full justify-center"
        >
          {changePassword.isPending ? "…" : t("auth.change_submit")}
        </Button>
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full text-center text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400"
        >
          {t("auth.sign_out")}
        </button>
      </form>
    </AuthShell>
  );
}
