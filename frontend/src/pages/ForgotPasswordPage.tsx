import { useState } from "react";
import { Link } from "react-router-dom";
import { Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { AuthShell } from "../components/auth/AuthShell";
import { Button } from "../components/ui/Button";
import { useForgotPassword } from "../hooks/useAuth";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const forgotPassword = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    forgotPassword.mutate(email);
  };

  return (
    <AuthShell title="Mot de passe oublié" subtitle="Recevez un lien de réinitialisation par email.">
      {forgotPassword.isSuccess ? (
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" aria-hidden />
          </span>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.
          </p>
          <Link to="/login" className="mt-2 flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            required
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <Button
            type="submit"
            variant="secondary"
            icon={<Send className="h-4 w-4" />}
            disabled={forgotPassword.isPending}
            className="w-full justify-center"
          >
            {forgotPassword.isPending ? "Envoi…" : "Envoyer le lien"}
          </Button>
          <Link to="/login" className="flex items-center justify-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400">
            <ArrowLeft className="h-3.5 w-3.5" /> Retour à la connexion
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
