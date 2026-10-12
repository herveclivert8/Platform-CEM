import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Ban, CreditCard, FolderPlus, Mail, XCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { Notice, Panel, Pill } from "./memberUi";
import { RegistrationSteps } from "./MemberDues";
import { MemberProjectList } from "./MemberProjectsTab";
import { useProjects } from "../../hooks/useProjects";
import { daysUntil, formatDay, type MembershipSummary } from "../../types/membership";
import { PHASE_PATH, type Project } from "../../types/project";
import type { Branch } from "../../types/branch";
import type { CurrentUser } from "../../types/user";

export type MemberTab = "tableau" | "cotisations" | "projets" | "discussions" | "profil";

interface MemberDashboardProps {
  user: CurrentUser;
  membership: MembershipSummary;
  projects: Project[];
  branch: Branch | undefined;
  onNavigate: (tab: MemberTab, options?: { propose?: boolean }) => void;
}

function QuickAction({ icon, label, onClick, to, href }: { icon: ReactNode; label: string; onClick?: () => void; to?: string; href?: string }) {
  const className =
    "flex min-h-28 flex-col justify-between gap-4 border border-slate-200 p-5 text-left font-bold text-slate-900 transition-colors hover:border-slate-900 dark:border-slate-800 dark:text-white dark:hover:border-white";
  const content = (
    <>
      <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
      {label}
    </>
  );
  if (to) return <Link to={to} className={className}>{content}</Link>;
  if (href) return <a href={href} className={className}>{content}</a>;
  return <button type="button" onClick={onClick} className={className}>{content}</button>;
}

/** Member area home (mockup A): member card, next due date, shortcuts, projects and branch activity. */
export function MemberDashboard({ user, membership, projects, branch, onNavigate }: MemberDashboardProps) {
  const { t, i18n } = useTranslation();
  const status = membership.membershipStatus;
  const hasAccess = membership.hasAccess;
  // Latest ongoing projects of the member's branch (members-only content)
  const { data: branchProjects } = useProjects({ phase: "ONGOING", branchId: user.branchId ?? undefined, pageSize: 4 });
  const days = membership.paidUntil ? daysUntil(membership.paidUntil) : null;
  const memberSince = new Date(membership.memberSince).toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      {status === "SUSPENDED" && <Notice icon={Ban} tone="alert">{t("member.suspended_text")}</Notice>}
      {status === "REJECTED" && <Notice icon={XCircle} tone="alert">{t("member.rejected_text")}</Notice>}
      {status === "PENDING" && (
        <Panel title={t("member.steps.title")}>
          <RegistrationSteps membership={membership} />
          {!membership.registrationPaid && !membership.registrationPending && (
            <Button variant="primary" className="mt-6 rounded-full" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right" onClick={() => onNavigate("cotisations")}>
              {t("member.steps.pay_fee")}
            </Button>
          )}
        </Panel>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Member card */}
        <div className={`flex min-h-56 flex-col justify-between p-7 ${status === "ACTIVE" ? "bg-emerald-400 text-slate-950" : "border border-dashed border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400"}`}>
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-3">
              <Avatar name={`${user.firstName} ${user.lastName}`} url={user.avatarUrl} size="md" className="ring-2 ring-slate-950/10" />
              <span className="font-display text-xl font-extrabold">CEM.</span>
            </span>
            <span className="text-sm font-bold">{t(status === "ACTIVE" ? "member.card.title" : "member.card.inactive")}</span>
          </div>
          <div>
            <p className="font-display text-3xl font-extrabold leading-tight">{user.firstName} {user.lastName}</p>
            <p className="mt-1.5 font-semibold">
              {t("member.card.branch", { branch: user.branchName ?? "—" })} · n° {String(membership.memberNumber).padStart(5, "0")}
            </p>
            <p className="mt-0.5 text-sm">{t("member.card.since", { date: memberSince })}</p>
          </div>
        </div>

        {/* Next due date */}
        <div className="flex min-h-56 flex-col justify-between gap-4 border border-slate-200 bg-white p-7 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{t("member.dues_label")}</span>
            {status === "ACTIVE" && days !== null && days >= 0 ? (
              <Pill tone={days <= 5 ? "warn" : "ok"}>{t(days <= 5 ? "member.due.soon" : "member.due.ok")}</Pill>
            ) : status === "SUSPENDED" ? (
              <Pill tone="bad">{t("member.status.SUSPENDED")}</Pill>
            ) : (
              <Pill tone="neutral">{t(`member.status.${status}`)}</Pill>
            )}
          </div>
          {status === "ACTIVE" && days !== null && days >= 0 && membership.paidUntil ? (
            <div>
              <p className="font-display text-6xl font-extrabold leading-none text-slate-900 dark:text-white">
                {days === 0 ? t("member.due.today") : `J-${days}`}
              </p>
              <p className="mt-2 text-slate-500 dark:text-slate-400">{t("member.due.next", { date: formatDay(membership.paidUntil, i18n.language) })}</p>
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-300">
              {t(status === "SUSPENDED" ? "member.due.suspended" : status === "PENDING" ? "member.due.pending" : "member.due.none")}
            </p>
          )}
          {(status === "ACTIVE" || status === "SUSPENDED") && (
            <Button
              variant={status === "SUSPENDED" ? "primary" : "ghost"}
              className={`self-start rounded-full ${status === "SUSPENDED" ? "" : "border border-slate-900 dark:border-white"}`}
              onClick={() => onNavigate("cotisations")}
            >
              {t(status === "SUSPENDED" ? "member.pay_dues" : "member.due.pay_ahead")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickAction icon={<FolderPlus className="h-5 w-5" aria-hidden />} label={t("member.project.new")} onClick={() => onNavigate("projets", { propose: true })} />
        <QuickAction icon={<ArrowRight className="h-5 w-5" aria-hidden />} label={t("projects.ongoing_title")} to={`/${PHASE_PATH.ONGOING}`} />
        <QuickAction icon={<CreditCard className="h-5 w-5" aria-hidden />} label={t("member.payments_title")} onClick={() => onNavigate("cotisations")} />
        {branch?.contactEmail ? (
          <QuickAction icon={<Mail className="h-5 w-5" aria-hidden />} label={t("member.contact_branch")} href={`mailto:${branch.contactEmail}`} />
        ) : (
          <QuickAction icon={<Mail className="h-5 w-5" aria-hidden />} label={t("member.tabs.profile")} onClick={() => onNavigate("profil")} />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={t("member.projects_title")}
          action={
            <button type="button" onClick={() => onNavigate("projets")} className="text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
              {t("member.see_all")}
            </button>
          }
        >
          {projects.length ? <MemberProjectList projects={projects} limit={3} /> : <p className="text-slate-500 dark:text-slate-400">{t("member.no_projects")}</p>}
        </Panel>

        <Panel title={t("member.in_branch")}>
          {!hasAccess ? (
            <p className="text-slate-500 dark:text-slate-400">{t("projects.members_only_unpaid")}</p>
          ) : branchProjects?.items.length ? (
            <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {branchProjects.items.map((p) => (
                <li key={p.id} className="py-3.5">
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {t("member.ongoing_since", { date: new Date(p.createdAt).toLocaleDateString(i18n.language) })}
                  </span>
                  <Link to={`/${PHASE_PATH[p.phase]}/${p.id}`} className="mt-0.5 block font-semibold text-slate-900 hover:underline dark:text-white">
                    {p.title}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 dark:text-slate-400">{t("member.no_branch_projects")}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
