import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, LogIn } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { useLogin } from "../hooks/useAuth";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const login = useLogin();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      navigate(location.state?.from ?? "/admin", { replace: true });
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
        Retour à l'accueil
      </Link>

      <AuthShell title="Espace Admin" subtitle="Connectez-vous pour accéder au back-office.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Email
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
              Mot de passe
            </label>
            <Link to="/forgot-password" className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              Mot de passe oublié ?
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
          <p className="text-sm text-red-600 dark:text-red-400">Email ou mot de passe incorrect.</p>
        )}

        <Button
          type="submit"
          variant="secondary"
          icon={<LogIn className="h-4 w-4" />}
          disabled={login.isPending}
          className="w-full justify-center"
        >
          {login.isPending ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
      </AuthShell>
    </>
  );
}
