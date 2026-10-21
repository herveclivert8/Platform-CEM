import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Clock, CreditCard, FolderOpen, LayoutGrid, MessageCircle, UserRound, XCircle, type LucideIcon } from "lucide-react";
import clsx from "clsx";
import { Skeleton } from "../components/ui/Skeleton";
import { Avatar } from "../components/ui/Avatar";
import { PhotoBackdrop } from "../components/layout/PhotoBackdrop";
import { DEFAULT_HERO_IMAGE } from "../components/home/Hero";
import { MemberDashboard, type MemberTab } from "../components/membership/MemberDashboard";
import { MemberDues } from "../components/membership/MemberDues";
import { MemberProjectsTab } from "../components/membership/MemberProjectsTab";
import { MemberDiscussionsTab } from "../components/membership/MemberDiscussionsTab";
import { MemberProfileTab } from "../components/membership/MemberProfileTab";
import { useCurrentUser } from "../hooks/useAuth";
import { useBranch } from "../hooks/useBranches";
import { useMembershipFees, useMyMembership, useMyProjects } from "../hooks/useMembership";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuthStore } from "../store/authStore";
import type { MembershipSummary } from "../types/membership";

const TABS: { key: MemberTab; label: string; icon: LucideIcon }[] = [
  { key: "tableau", label: "member.tabs.dashboard", icon: LayoutGrid },
  { key: "cotisations", label: "member.tabs.dues", icon: CreditCard },
  { key: "projets", label: "member.tabs.projects", icon: FolderOpen },
  { key: "discussions", label: "member.tabs.discussions", icon: MessageCircle },
  { key: "profil", label: "member.tabs.profile", icon: UserRound },
];

/** Status chip of the header: up to date, fee due, awaiting approval, deactivated or declined. */
function StatusChip({ membership }: { membership: MembershipSummary }) {
  const { t } = useTranslation();
  const status = membership.membershipStatus;
  const [key, Icon, gold] =
    status === "ACTIVE" && membership.hasAccess
      ? ["member.chip.ok", Check, true]
      : status === "PENDING"
        ? ["member.chip.pending", Clock, false]
        : status === "ACTIVE"
          ? ["member.chip.due", Clock, false]
          : ["member.chip.blocked", XCircle, false];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold",
        gold ? "border-orange-400/50 bg-orange-400/15 text-orange-200" : "border-white/20 bg-white/10 text-slate-100",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {t(key)}
    </span>
  );
}

/**
 * Member area ("Prestige" mockup): the branch's city photo fixed behind the page, header with the
 * member's photo, side menu, one panel per tab — the tab kept in the address (?onglet=).
 */
export function MemberSpacePage() {
  const { t } = useTranslation();
  usePageMeta(t("seo.member"));
  // Shows the stored profile at once, then the server's (membership possibly approved since sign-in)
  useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const { data: membership, isLoading } = useMyMembership();
  const { data: fees } = useMembershipFees();
  const { data: projects } = useMyProjects();
  const { data: branch, isLoading: branchLoading } = useBranch(user?.branchId ?? undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("onglet") as MemberTab | null;
  const tab: MemberTab = requested && TABS.some((x) => x.key === requested) ? requested : "tableau";
  const propose = searchParams.get("proposer") === "1";

  const navigate = (next: MemberTab, options?: { propose?: boolean }) => {
    const params: Record<string, string> = next === "tableau" ? {} : { onglet: next };
    if (options?.propose) params.proposer = "1";
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!user) return null;
  const hasAccess = membership?.hasAccess ?? false;
  // The member's city photo (banner, else the branch card photo), else the home page cover
  const photo = branchLoading ? null : branch?.bannerUrl || branch?.logoUrl || DEFAULT_HERO_IMAGE;

  return (
    <>
      <PhotoBackdrop src={photo} />
      {/* Veil: lighter behind the greeting, darker behind the panels (light text ≥ 4.5:1) */}
      <div
        className="cem-photo-section dark relative z-10 min-h-[calc(100vh-4rem)] text-slate-100"
        style={{ background: "linear-gradient(180deg, rgb(11 17 32 / 0.6) 0px, rgb(11 17 32 / 0.8) 320px, rgb(11 17 32 / 0.84) 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-4 pb-28 sm:px-6 lg:px-8">
          <header className="flex flex-wrap items-end justify-between gap-6 pb-12 pt-14 lg:pt-20">
            <div className="flex items-center gap-5 sm:gap-6">
              <Avatar name={`${user.firstName} ${user.lastName}`} url={user.avatarUrl} size="lg" className="ring-[3px] ring-orange-400 ring-offset-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-200">
                  {t("member.card.branch", { branch: user.branchName ?? "—" })}
                </p>
                <h1 className="mt-1.5 text-4xl text-white sm:text-5xl">{t("member.hello_comma", { name: user.firstName })}</h1>
              </div>
            </div>
            {membership && <StatusChip membership={membership} />}
          </header>

          <div className="flex flex-wrap gap-8">
            <nav
              aria-label={t("member.title")}
              className="w-full self-start rounded-2xl border border-white/10 bg-slate-900/75 p-3 lg:w-64 lg:shrink-0"
            >
              <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <li key={key} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => navigate(key)}
                      aria-current={tab === key ? "page" : undefined}
                      className={clsx(
                        "flex min-h-11 w-full items-center gap-3 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left transition-colors",
                        tab === key ? "bg-orange-400/15 font-semibold text-white" : "text-slate-300 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={clsx("h-[18px] w-[18px] shrink-0", tab === key ? "text-orange-400" : "")} aria-hidden />
                      {t(label)}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>

            <main className="min-w-0 flex-[999_1_640px]">
              {isLoading || !membership || !fees ? (
                <Skeleton className="h-96 w-full rounded-2xl" />
              ) : tab === "cotisations" ? (
                <MemberDues membership={membership} fees={fees} />
              ) : tab === "projets" ? (
                <MemberProjectsTab key={propose ? "propose" : "list"} projects={projects ?? []} hasAccess={hasAccess} startProposing={propose && hasAccess} />
              ) : tab === "discussions" ? (
                <MemberDiscussionsTab hasAccess={hasAccess} />
              ) : tab === "profil" ? (
                <MemberProfileTab user={user} phone={user.phone} />
              ) : (
                <MemberDashboard user={user} membership={membership} projects={projects ?? []} onNavigate={navigate} />
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
