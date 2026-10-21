import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Ban, XCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Notice, Panel } from "./memberUi";
import { RegistrationSteps } from "./MemberDues";
import { useProjects } from "../../hooks/useProjects";
import { useMyDiscussions } from "../../hooks/useMembership";
import { useMyBadge } from "../../hooks/useBadge";
import { BadgeCard } from "../badge/BadgeQrCode";
import { useSiteLogo } from "../../hooks/useSiteLogo";
import { daysUntil, formatDay, type MembershipSummary } from "../../types/membership";
import { PHASE_PATH, type Project } from "../../types/project";
import type { CurrentUser } from "../../types/user";

export type MemberTab = "tableau" | "cotisations" | "projets" | "discussions" | "profil";

interface MemberDashboardProps {
  user: CurrentUser;
  membership: MembershipSummary;
  projects: Project[];
  onNavigate: (tab: MemberTab, options?: { propose?: boolean }) => void;
}

const GLASS = "rounded-2xl border border-white/10 bg-slate-900/80";
const CYCLE_DAYS = 30;

/** Member area home ("Prestige" mockup): member card, next due date, figures, history, branch activity. */
export function MemberDashboard({ user, membership, projects, onNavigate }: MemberDashboardProps) {
  const { t, i18n } = useTranslation();
  const status = membership.membershipStatus;
  const hasAccess = membership.hasAccess;
  // Latest ongoing projects of the member's branch (members-only content)
  const { data: branchProjects } = useProjects({ phase: "ONGOING", branchId: user.branchId ?? undefined, pageSize: 3 });
  const { data: discussions } = useMyDiscussions(hasAccess);
  const days = membership.paidUntil ? daysUntil(membership.paidUntil) : null;
  const upToDate = status === "ACTIVE" && hasAccess && days !== null && days >= 0;
  // QR code badge: from the approval of the membership, as long as the fees are paid
  const { data: badgeToken } = useMyBadge(upToDate);
  const { logo } = useSiteLogo();
  const date = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" });
  const memberSince = new Date(membership.memberSince).toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  // Figures from the member's own data
  const confirmed = membership.payments.filter((p) => p.status === "CONFIRMED");
  const published = projects.filter((p) => p.reviewStatus === "APPROVED");
  const messages = discussions?.reduce((sum, d) => sum + d.myComments, 0) ?? 0;

  // "Mon parcours": confirmed payments, published projects and sign-up, most recent first
  const history = [
    ...confirmed.map((p) => ({
      at: p.createdAt,
      title:
        p.kind === "REGISTRATION"
          ? t("member.history.fee_paid")
          : t("member.history.dues_paid", { period: p.periodStart ? formatDay(p.periodStart, i18n.language) : "" }),
      detail: t(`membership.methods.${p.paymentMethod}`),
      first: false,
    })),
    ...published.map((p) => ({
      at: p.reviewedAt ?? p.updatedAt,
      title: t("member.history.project_published", { title: p.title }),
      detail: t("member.history.validated"),
      first: false,
    })),
    { at: membership.memberSince, title: t("member.history.joined"), detail: t("member.card.branch", { branch: user.branchName ?? "—" }), first: true },
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {status === "SUSPENDED" && <Notice icon={Ban} tone="alert">{t("member.suspended_text")}</Notice>}
      {status === "REJECTED" && <Notice icon={XCircle} tone="alert">{t("member.rejected_text")}</Notice>}
      {status === "PENDING" && (
        <Panel title={t("member.steps.title")}>
          <RegistrationSteps membership={membership} />
          {!membership.registrationPaid && !membership.registrationPending && (
            <Button variant="primary" className="mt-6" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right" onClick={() => onNavigate("cotisations")}>
              {t("member.steps.pay_fee")}
            </Button>
          )}
        </Panel>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Member card: navy with a gold edge when up to date, dimmed otherwise */}
        <div
          className={`flex min-h-60 flex-col justify-between rounded-2xl border bg-slate-900 p-7 shadow-[0_24px_48px_-24px_rgb(0_0_0_/_0.6)] ${
            upToDate ? "border-orange-400" : "border-dashed border-white/25"
          }`}
        >
          <div className="flex items-center gap-3">
            <img src={logo} alt="" width={44} height={44} className="h-11 w-11 rounded-full bg-white/95 p-0.5" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
              {t(upToDate ? "member.card.title" : "member.card.inactive")}
            </span>
          </div>
          <div>
            <p className="font-display text-3xl text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="mt-2 text-sm text-slate-300">
              {t("member.card.number", { number: String(membership.memberNumber).padStart(5, "0") })} · {t("member.card.since", { date: memberSince })}
            </p>
            <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-orange-400/35 pt-3.5 text-sm text-slate-300">
              <span>{t("member.card.branch", { branch: user.branchName ?? "—" })}</span>
              {upToDate && membership.paidUntil && (
                <span>
                  {t("member.card.valid_until")} <strong className="text-white">{formatDay(membership.paidUntil, i18n.language)}</strong>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Next due date */}
        <div className={`flex min-h-60 flex-col justify-between gap-4 p-7 ${GLASS}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{t("member.due.title")}</p>
          {upToDate && membership.paidUntil ? (
            <div>
              <p className="font-display text-6xl text-orange-300">{days === 0 ? t("member.due.today") : `J-${days}`}</p>
              <p className="mt-2 text-slate-300">{t("member.due.next", { date: formatDay(membership.paidUntil, i18n.language) })}</p>
              <div className="mt-4 h-1.5 rounded-full bg-white/10" role="img" aria-label={t("member.due.progress", { left: days, total: CYCLE_DAYS })}>
                <div
                  className="h-1.5 rounded-full bg-orange-400"
                  style={{ width: `${Math.min(100, Math.max(4, ((CYCLE_DAYS - (days ?? 0)) / CYCLE_DAYS) * 100))}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-slate-200">
              {t(
                status === "SUSPENDED"
                  ? "member.due.suspended"
                  : status === "PENDING"
                    ? "member.due.pending"
                    : status === "ACTIVE"
                      ? "member.dues_text_unpaid"
                      : "member.due.none",
              )}
            </p>
          )}
          {(status === "ACTIVE" || status === "SUSPENDED") && (
            <Button variant="primary" className="self-start" onClick={() => onNavigate("cotisations")}>
              {t(upToDate ? "member.due.pay_ahead" : "member.pay_dues")}
            </Button>
          )}
        </div>
      </div>

      {upToDate && badgeToken && (
        <Panel title={t("badge.title")}>
          <BadgeCard token={badgeToken} holder={user} />
        </Panel>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { value: confirmed.length, label: t("member.figures.months", { count: confirmed.length }) },
          { value: published.length, label: t("member.figures.projects", { count: published.length }) },
          { value: messages, label: t("member.figures.messages", { count: messages }) },
        ].map((figure) => (
          <div key={figure.label} className={`p-6 ${GLASS}`}>
            <p className="font-display text-4xl text-white">{figure.value}</p>
            <p className="mt-2 text-sm text-slate-300">{figure.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={`p-7 ${GLASS}`}>
          <h2 className="text-2xl text-white">{t("member.history.title")}</h2>
          <ol className="mt-5 space-y-5">
            {history.map((item, i) => (
              <li key={i} className="flex gap-3.5">
                <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${item.first ? "border-2 border-orange-400" : "bg-orange-400"}`} aria-hidden />
                <span>
                  <span className="block font-semibold text-white">{item.title}</span>
                  <span className="block text-sm text-slate-300">
                    {item.detail} · {date(item.at)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className={`p-7 ${GLASS}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-2xl text-white">{t("member.in_branch")}</h2>
            {hasAccess && (
              <Link to={`/${PHASE_PATH.ONGOING}`} className="text-sm font-semibold text-orange-200 underline-offset-4 hover:underline">
                {t("member.see_all")}
              </Link>
            )}
          </div>
          {!hasAccess ? (
            <p className="mt-4 text-slate-300">{t("projects.members_only_unpaid")}</p>
          ) : branchProjects?.items.length ? (
            <ul className="mt-4">
              {branchProjects.items.map((p) => (
                <li key={p.id} className="border-t border-white/10 py-3.5">
                  <span className="block text-sm text-slate-300">{t("member.ongoing_since", { date: date(p.createdAt) })}</span>
                  <Link to={`/${PHASE_PATH[p.phase]}/${p.id}`} className="mt-0.5 block font-semibold text-white hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-slate-300">{t("member.no_branch_projects")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
