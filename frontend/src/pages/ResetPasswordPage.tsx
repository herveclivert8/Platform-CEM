import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useResetPassword } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const resetPassword = useResetPassword();
  const navigate = useNavigate();

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mismatch) return;
    await resetPassword.mutateAsync({ token, newPassword });
  };

  if (!token) {
    return (
      <AuthShell title={t("auth.reset_invalid_title")}>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("auth.reset_invalid_text")}
        </p>
        <Link to="/forgot-password" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          {t("auth.reset_request_new")}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t("auth.reset_title")}>
      {resetPassword.isSuccess ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("auth.reset_done")}</p>
          <Button variant="secondary" onClick={() => navigate("/login")} className="mt-2">
            {t("auth.sign_in")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            required
            minLength={8}
            placeholder={t("auth.new_password")}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <PasswordInput
            required
            minLength={8}
            placeholder={t("auth.confirm_password")}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          {mismatch && <p className="text-sm text-red-600 dark:text-red-400">{t("auth.mismatch")}</p>}
          {resetPassword.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">{t("auth.reset_expired")}</p>
          )}
          <Button
            type="submit"
            variant="secondary"
            icon={<KeyRound className="h-4 w-4" />}
            disabled={resetPassword.isPending || mismatch}
            className="w-full justify-center"
          >
            {resetPassword.isPending ? "…" : t("auth.reset_submit")}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
