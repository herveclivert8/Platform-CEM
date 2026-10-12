import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Skeleton } from "../components/ui/Skeleton";
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

const TABS: MemberTab[] = ["tableau", "cotisations", "projets", "discussions", "profil"];
const TAB_LABELS: Record<MemberTab, string> = {
  tableau: "member.tabs.dashboard",
  cotisations: "member.tabs.dues",
  projets: "member.tabs.projects",
  discussions: "member.tabs.discussions",
  profil: "member.tabs.profile",
};

/** Member area (mockup A): side menu + one panel per tab, the tab kept in the address (?onglet=). */
export function MemberSpacePage() {
  const { t } = useTranslation();
  usePageMeta(t("seo.member"));
  // Shows the stored profile at once, then the server's (membership possibly approved since sign-in)
  useCurrentUser();
  const user = useAuthStore((s) => s.user);
  const { data: membership, isLoading } = useMyMembership();
  const { data: fees } = useMembershipFees();
  const { data: projects } = useMyProjects();
  const { data: branch } = useBranch(user?.branchId ?? undefined);
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("onglet") as MemberTab | null;
  const tab: MemberTab = requested && TABS.includes(requested) ? requested : "tableau";
  const propose = searchParams.get("proposer") === "1";

  const navigate = (next: MemberTab, options?: { propose?: boolean }) => {
    const params: Record<string, string> = next === "tableau" ? {} : { onglet: next };
    if (options?.propose) params.proposer = "1";
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!user) return null;
  const hasAccess = membership?.hasAccess ?? false;

  return (
    <div className="bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-extrabold leading-[0.95] text-slate-900 sm:text-6xl lg:text-7xl dark:text-white">
          {t("member.hello", { name: user.firstName })}
          <span className="text-emerald-600 dark:text-emerald-400">.</span>
        </h1>

        <div className="mt-10 flex flex-wrap gap-8 lg:gap-12">
          <nav aria-label={t("member.title")} className="w-full lg:w-60 lg:shrink-0">
            <p className="mb-3 hidden text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 lg:block dark:text-slate-400">{t("member.title")}</p>
            <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
              {TABS.map((key) => (
                <li key={key} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(key)}
                    aria-current={tab === key ? "page" : undefined}
                    className={clsx(
                      "w-full whitespace-nowrap px-4 py-3 text-left font-semibold transition-colors",
                      tab === key
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white",
                    )}
                  >
                    {t(TAB_LABELS[key])}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0 flex-[999_1_640px]">
            {isLoading || !membership || !fees ? (
              <Skeleton className="h-96 w-full" />
            ) : tab === "cotisations" ? (
              <MemberDues membership={membership} fees={fees} />
            ) : tab === "projets" ? (
              <MemberProjectsTab key={propose ? "propose" : "list"} projects={projects ?? []} hasAccess={hasAccess} startProposing={propose && hasAccess} />
            ) : tab === "discussions" ? (
              <MemberDiscussionsTab hasAccess={hasAccess} />
            ) : tab === "profil" ? (
              <MemberProfileTab user={user} phone={user.phone} />
            ) : (
              <MemberDashboard user={user} membership={membership} projects={projects ?? []} branch={branch} onNavigate={navigate} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
