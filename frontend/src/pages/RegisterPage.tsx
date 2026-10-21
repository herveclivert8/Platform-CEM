import { useState } from "react";
import { isAxiosError } from "axios";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { AuthShell } from "../components/auth/AuthShell";
import { SignedInNotice } from "../components/auth/SignedInNotice";
import { Button } from "../components/ui/Button";
import { PasswordInput } from "../components/ui/PasswordInput";
import { Skeleton } from "../components/ui/Skeleton";
import { MembershipPaymentForm } from "../components/membership/MembershipPaymentForm";
import { useRegister } from "../hooks/useAuth";
import { useBranches } from "../hooks/useBranches";
import { useMembershipFees } from "../hooks/useMembership";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuthStore } from "../store/authStore";
import { apiErrorMessage } from "../lib/api";

const inputClass =
  "w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400";

/** "Step 1 of 2" dots shown above both steps of the sign-up. */
function Steps({ current }: { current: 1 | 2 }) {
  const { t } = useTranslation();
  return (
    <ol className="mb-6 grid grid-cols-2 gap-2 text-xs font-medium">
      {([1, 2] as const).map((step) => (
        <li key={step} className={clsx("border-t-2 pt-2", step <= current ? "border-emerald-500 text-emerald-700 dark:text-emerald-400" : "border-slate-200 text-slate-400 dark:border-slate-700")}>
          {t(step === 1 ? "auth.step_account" : "auth.step_payment", { step })}
        </li>
      ))}
    </ol>
  );
}

export function RegisterPage() {
  const { t } = useTranslation();
  usePageMeta(t("seo.register"));
  const navigate = useNavigate();
  const signedInUser = useAuthStore((s) => (s.isAuthenticated ? s.user : null));
  // ?antenne=<id> preselects the branch (link from a branch page)
  const [searchParams] = useSearchParams();
  const { data: branches } = useBranches();
  const { data: fees } = useMembershipFees();
  const register = useRegister();

  const [lastName, setLastName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [branchId, setBranchId] = useState(searchParams.get("antenne") ?? "");
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    try {
      // Creates the account (pending approval) and signs in: step 2 pays the membership fee
      await register.mutateAsync({ firstName, lastName, email, phone, password, branchId: Number(branchId) });
    } catch {
      // error surfaced below via register.isError
    }
  };

  const backHome = (
    <Link
      to="/"
      className="fixed left-4 top-4 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white sm:left-6 sm:top-6"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden />
      {t("auth.back_home")}
    </Link>
  );

  if (register.isSuccess) {
    return (
      <>
        {backHome}
        <AuthShell title={t("auth.payment_title")} subtitle={t("auth.payment_subtitle")}>
          <Steps current={2} />
          {fees ? (
            <MembershipPaymentForm kind="REGISTRATION" fees={fees} onDone={() => navigate("/espace-membre", { replace: true })} />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <Link to="/espace-membre" replace className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
              {t("auth.pay_later")}
            </Link>
          </p>
        </AuthShell>
      </>
    );
  }

  // Someone is still signed in on this browser (e.g. an admin): a new member account needs them signed out first
  if (signedInUser && !register.isPending && !register.isSuccess) {
    return (
      <>
        {backHome}
        <AuthShell title={t("auth.register_title")}>
          <SignedInNotice user={signedInUser} action="register" />
        </AuthShell>
      </>
    );
  }

  return (
    <>
      {backHome}
      <AuthShell title={t("auth.register_title")} subtitle={t("auth.register_subtitle")}>
        <Steps current={1} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="last_name" className={labelClass}>{t("auth.last_name")}</label>
              <input id="last_name" required autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="first_name" className={labelClass}>{t("auth.first_name")}</label>
              <input id="first_name" required autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>{t("auth.email")}</label>
            <input id="email" type="email" required autoComplete="email" placeholder={t("auth.email_placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>{t("auth.phone")}</label>
            <input id="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" placeholder="034 12 345 67" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("auth.phone_hint")}</p>
          </div>
          <div>
            <label htmlFor="password" className={labelClass}>{t("auth.password_min")}</label>
            <PasswordInput id="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="confirm" className={labelClass}>{t("auth.confirm_password")}</label>
            <PasswordInput id="confirm" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="branch" className={labelClass}>{t("auth.branch")}</label>
            <select id="branch" required value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputClass}>
              <option value="" disabled>{t("auth.branch_placeholder")}</option>
              {branches?.items.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.cityName} ({b.country})
                </option>
              ))}
            </select>
          </div>

          {mismatch && <p className="text-sm text-red-600 dark:text-red-400">{t("auth.mismatch")}</p>}
          {register.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {isAxiosError(register.error) && register.error.response?.status === 429
                ? t("auth.too_many_registrations")
                : apiErrorMessage(register.error, t("auth.register_error"))}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            icon={<UserPlus className="h-4 w-4" />}
            disabled={register.isPending}
            className="w-full justify-center"
          >
            {register.isPending ? t("auth.registering") : t("auth.register_continue")}
          </Button>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {t("auth.privacy_notice")}{" "}
            <Link to="/confidentialite" target="_blank" className="font-medium text-emerald-600 underline underline-offset-2 dark:text-emerald-400">
              {t("auth.privacy_link")}
            </Link>
            .
          </p>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {t("auth.already_member")}{" "}
          <Link to="/login" className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
            {t("auth.sign_in")}
          </Link>
        </p>
      </AuthShell>
    </>
  );
}
