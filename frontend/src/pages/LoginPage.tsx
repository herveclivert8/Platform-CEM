import { useState } from "react";
import { isAxiosError } from "axios";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { SignedInNotice } from "../components/auth/SignedInNotice";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useLogin } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuthStore } from "../store/authStore";
import { homePathFor } from "../types/user";

export function LoginPage() {
  const { t } = useTranslation();
  usePageMeta(t("seo.login"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();
  const signedInUser = useAuthStore((s) => (s.isAuthenticated ? s.user : null));
  const location = useLocation() as { state?: { from?: string } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { user } = await login.mutateAsync({ email, password });
      // Back to the page that required sign-in, if it belongs to this user's area
      const home = homePathFor(user.role);
      const from = location.state?.from;
      navigate(from?.startsWith(home) ? from : home, { replace: true });
    } catch {
      // error surfaced below via login.isError
    }
  };



  return (
    <>
      <Link
        to="/"
        className="fixed left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t("auth.back_home")}
      </Link>

      <AuthShell title={t("auth.login_title")} subtitle={t("auth.login_subtitle")}>
      {signedInUser && !login.isPending && !login.isSuccess ? (
        <SignedInNotice user={signedInUser} action="login" />
      ) : (
      <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t("auth.password")}
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              {t("auth.forgot_link")}
            </Link>
          </div>
          <PasswordInput
            id="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>

        {login.isError && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {isAxiosError(login.error) && login.error.response?.status === 429
              ? t("auth.too_many_logins")
              : t("auth.bad_credentials")}
          </p>
        )}

        <Button
          type="submit"
          variant="secondary"
          icon={<LogIn className="h-4 w-4" />}
          disabled={login.isPending}
          className="w-full justify-center"
        >
          {login.isPending ? t("auth.signing_in") : t("auth.sign_in")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        {t("auth.no_account")}{" "}
        <Link to="/inscription" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
          {t("auth.register_link")}
        </Link>
      </p>
      </>
      )}
      </AuthShell>
    </>
  );
}
