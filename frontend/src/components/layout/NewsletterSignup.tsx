import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Mail } from "lucide-react";
import { HoneypotField } from "../ui/HoneypotField";
import { useSubscribe } from "../../hooks/useNewsletter";
import { apiErrorMessage } from "../../lib/api";

/** Footer newsletter signup. The confirmation e-mail (double opt-in) completes the subscription. */
export function NewsletterSignup() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const subscribe = useSubscribe();

  if (subscribe.isSuccess) {
    return (
      <p role="status" className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        {t("newsletter.check_inbox")}
      </p>
    );
  }

  return (
    <form
      className="relative"
      onSubmit={(e) => {
        e.preventDefault();
        subscribe.mutate({ email: email.trim(), website });
      }}
    >
      <p className="text-sm text-slate-500 dark:text-slate-400">{t("newsletter.pitch")}</p>
      <div className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="newsletter-email">{t("newsletter.email_label")}</label>
        <div className="relative min-w-0 flex-1">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              subscribe.reset();
              setEmail(e.target.value);
            }}
            placeholder={t("newsletter.placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button
          type="submit"
          disabled={subscribe.isPending}
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {subscribe.isPending ? "…" : t("newsletter.subscribe")}
        </button>
      </div>
      <HoneypotField value={website} onChange={setWebsite} />
      {subscribe.isError && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{apiErrorMessage(subscribe.error, t("newsletter.error"))}</p>
      )}
      <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">{t("newsletter.consent")}</p>
    </form>
  );
}
