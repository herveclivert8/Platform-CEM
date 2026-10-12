import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import { Notice, Panel } from "./memberUi";
import { Skeleton } from "../ui/Skeleton";
import { useMyDiscussions } from "../../hooks/useMembership";
import { PHASE_PATH } from "../../types/project";

/** "Mes discussions" tab: projects the member has commented on, most recent activity first. */
export function MemberDiscussionsTab({ hasAccess }: { hasAccess: boolean }) {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useMyDiscussions(hasAccess);

  return (
    <Panel title={t("member.tabs.discussions")}>
      {!hasAccess ? (
        <Notice>{t("discussion.locked_member")}</Notice>
      ) : isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : !data?.length ? (
        <p className="text-slate-500 dark:text-slate-400">{t("member.no_discussions")}</p>
      ) : (
        <ul className="divide-y divide-slate-200 border-t border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {data.map((d) => (
            <li key={d.projectId}>
              <Link
                to={`/${PHASE_PATH[d.phase]}/${d.projectId}`}
                className="flex flex-wrap items-center justify-between gap-3 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              >
                <span>
                  <span className="block font-bold text-slate-900 dark:text-white">{d.title}</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">
                    {d.branchName} · {t("member.last_activity", { date: new Date(d.lastActivityAt).toLocaleDateString(i18n.language) })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  {t("member.comment_counts", { mine: d.myComments, total: d.totalComments })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
