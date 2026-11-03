import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Eye } from "lucide-react";
import { useProjects } from "../../hooks/useProjects";
import { useAboutText } from "../../hooks/useAboutPage";
import { PHASE_PATH } from "../../types/project";
import type { CurrentUser } from "../../types/user";

const GLASS = "rounded-2xl border border-white/10 bg-slate-900/80";

/**
 * Member area home of a benefactor or sponsor: no fees, no badge, no proposals nor discussions —
 * their role in the association, and the ongoing projects they can follow.
 */
export function SupporterDashboard({ user }: { user: CurrentUser }) {
  const { t, i18n } = useTranslation();
  const aboutText = useAboutText();
  const type = user.membershipType ?? "BENEFACTOR";
  const { data: ongoing } = useProjects({ phase: "ONGOING", pageSize: 5 });
  const date = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <section className={`p-7 ${GLASS}`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">{t(`membership_types.${type}.title`)}</p>
        <p className="mt-4 leading-relaxed text-slate-200">{aboutText(`membership_types.${type}.text`)}</p>
        <p className="mt-5 flex items-start gap-2 text-sm text-slate-300">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" aria-hidden />
          {t("member.supporter.access")}
        </p>
      </section>

      <section className={`p-7 ${GLASS}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl text-white">{t("member.supporter.ongoing_title")}</h2>
          <Link to={`/${PHASE_PATH.ONGOING}`} className="text-sm font-semibold text-orange-200 underline-offset-4 hover:underline">
            {t("member.see_all")}
          </Link>
        </div>
        {ongoing?.items.length ? (
          <ul className="mt-4">
            {ongoing.items.map((p) => (
              <li key={p.id} className="border-t border-white/10 py-3.5">
                <span className="block text-sm text-slate-300">
                  {p.branchName ? `${p.branchName} · ` : ""}
                  {t("member.ongoing_since", { date: date(p.createdAt) })}
                </span>
                <Link to={`/${PHASE_PATH[p.phase]}/${p.id}`} className="mt-0.5 inline-flex items-center gap-1.5 font-semibold text-white hover:underline">
                  {p.title} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-slate-300">{t("member.supporter.no_projects")}</p>
        )}
      </section>
    </div>
  );
}
