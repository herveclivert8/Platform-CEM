import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, Check, XCircle } from "lucide-react";
import clsx from "clsx";
import { Button } from "../ui/Button";
import { MembershipPaymentForm } from "./MembershipPaymentForm";
import { Notice, Panel, Pill, type PillTone } from "./memberUi";
import { formatAmount } from "../../types/donation";
import { formatDay, type MembershipFees, type MembershipPaymentStatus, type MembershipSummary } from "../../types/membership";

const PAYMENT_TONES: Record<MembershipPaymentStatus, PillTone> = { PENDING: "warn", CONFIRMED: "ok", REJECTED: "bad" };

/** Today as "YYYY-MM-DD" (UTC, like the server's due dates). */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** New member: account created → membership fee → approval by the branch. */
export function RegistrationSteps({ membership }: { membership: MembershipSummary }) {
  const { t } = useTranslation();
  const feeDone = membership.registrationPaid;
  const steps = [
    { label: t("member.steps.account"), state: "done" },
    { label: t("member.steps.fee"), state: feeDone ? "done" : "current", hint: membership.registrationPending ? t("member.steps.fee_checking") : undefined },
    { label: t("member.steps.approval"), state: feeDone ? "current" : "todo" },
  ] as const;

  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {steps.map((step, i) => (
        <li
          key={step.label}
          className={clsx(
            "p-5",
            step.state === "current" ? "border-2 border-slate-900 bg-white dark:border-white dark:bg-slate-900" : "border border-slate-200 dark:border-slate-800",
            step.state === "todo" && "border-dashed",
          )}
        >
          <span
            className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-full text-sm font-extrabold",
              step.state === "done" && "bg-emerald-400 text-slate-950",
              step.state === "current" && "bg-slate-900 text-white dark:bg-white dark:text-slate-950",
              step.state === "todo" && "border border-slate-300 text-slate-500 dark:border-slate-700",
            )}
          >
            {step.state === "done" ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
          </span>
          <p className={clsx("mt-3 font-bold", step.state === "todo" ? "text-slate-500" : "text-slate-900 dark:text-white")}>{step.label}</p>
          {"hint" in step && step.hint && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{step.hint}</p>}
        </li>
      ))}
    </ol>
  );
}

/** "Cotisations" tab: membership fee (new member) or monthly fee, then the payment history. */
export function MemberDues({ membership, fees }: { membership: MembershipSummary; fees: MembershipFees }) {
  const { t, i18n } = useTranslation();
  const [paying, setPaying] = useState(false);
  const status = membership.membershipStatus;

  return (
    <div className="space-y-6">
      {status === "REJECTED" ? (
        <Panel title={t("member.status_label")}>
          <Notice icon={XCircle} tone="alert">{t("member.rejected_text")}</Notice>
        </Panel>
      ) : status === "PENDING" ? (
        <Panel title={t("member.registration_title")}>
          {membership.registrationPaid ? (
            <Notice>{t("member.awaiting_approval")}</Notice>
          ) : membership.registrationPending ? (
            <Notice>{t("member.payment_being_checked")}</Notice>
          ) : (
            <>
              <p className="mb-6 text-slate-600 dark:text-slate-300">{t("member.registration_text")}</p>
              <MembershipPaymentForm kind="REGISTRATION" fees={fees} onDone={() => undefined} />
            </>
          )}
        </Panel>
      ) : (
        <Panel title={t("member.dues_title")}>
          {status === "SUSPENDED" && (
            <div className="mb-5">
              <Notice icon={Ban} tone="alert">
                {membership.paidUntil && membership.paidUntil >= todayIso() ? t("member.suspended_paid_text") : t("member.suspended_text")}
              </Notice>
            </div>
          )}
          {membership.monthlyPending ? (
            <Notice>{t("member.payment_being_checked")}</Notice>
          ) : paying ? (
            <MembershipPaymentForm kind="MONTHLY" fees={fees} onDone={() => setPaying(false)} />
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-xl text-slate-600 dark:text-slate-300">
                {membership.hasAccess ? t("member.dues_text_paid") : t("member.dues_text_unpaid")}
              </p>
              <Button variant="primary" onClick={() => setPaying(true)}>
                {t("member.pay_dues")}
              </Button>
            </div>
          )}
        </Panel>
      )}

      {membership.payments.length > 0 && (
        <Panel title={t("member.payments_title")}>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {membership.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">
                    {t(`membership.kinds.${p.kind}`)} · {formatAmount(p.amount, p.currency)}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t(`membership.methods.${p.paymentMethod}`)} · {new Date(p.createdAt).toLocaleDateString(i18n.language)}
                    {p.periodStart && p.periodEnd && ` · ${formatDay(p.periodStart, i18n.language)} → ${formatDay(p.periodEnd, i18n.language)}`}
                  </p>
                  {p.rejectionReason && <p className="text-sm text-red-600 dark:text-red-400">{p.rejectionReason}</p>}
                </div>
                <Pill tone={PAYMENT_TONES[p.status]}>{t(`membership.payment_status.${p.status}`)}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
