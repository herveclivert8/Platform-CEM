import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useConfirmSubscription, useUnsubscribe } from "../hooks/useNewsletter";
import { usePageMeta } from "../hooks/usePageMeta";
import { apiErrorMessage } from "../lib/api";
import { buttonClasses } from "../components/ui/buttonStyles";

/**
 * Landing page of the links sent by e-mail: /newsletter/confirmation?token=… and
 * /newsletter/desinscription?token=…
 */
export function NewsletterStatusPage({ action }: { action: "confirm" | "unsubscribe" }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const confirm = useConfirmSubscription();
  const unsubscribe = useUnsubscribe();
  const mutation = action === "confirm" ? confirm : unsubscribe;
  const sent = useRef(false);
  usePageMeta(t(`newsletter.${action}_title`));

  useEffect(() => {
    // Single call even under React StrictMode: a confirmation link only works once
    if (sent.current || !token) return;
    sent.current = true;
    mutation.mutate(token);
  }, [token, mutation]);

  const failed = !token || mutation.isError;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      {mutation.isPending || (!failed && !mutation.isSuccess) ? (
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" aria-hidden />
      ) : failed ? (
        <XCircle className="h-10 w-10 text-red-500" aria-hidden />
      ) : (
        <CheckCircle2 className="h-10 w-10 text-emerald-600" aria-hidden />
      )}
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t(`newsletter.${action}_title`)}</h1>
      <p className="mt-3 text-slate-500 dark:text-slate-400" role="status">
        {mutation.isSuccess
          ? t(`newsletter.${action}_success`)
          : failed
            ? token
              ? apiErrorMessage(mutation.error, t("newsletter.link_invalid"))
              : t("newsletter.link_invalid")
            : t("newsletter.processing")}
      </p>
      <Link to="/" className={buttonClasses({ variant: "secondary", className: "mt-8" })}>
        {t("not_found.back_home")}
      </Link>
    </div>
  );
}
