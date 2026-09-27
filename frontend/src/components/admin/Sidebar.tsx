import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import clsx from "clsx";
import {
  LayoutDashboard,
  Newspaper,
  Briefcase,
  HeartHandshake,
  Settings,
  MapPin,
  Users,
  ScrollText,
  Share2,
  Wallet,
  Image as ImageIcon,
  FolderKanban,
  FileText,
  Mail,
  X,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { ScopeSelector } from "./ScopeSelector";
import { useTranslation } from "react-i18next";
import { useAdminProjects } from "../../hooks/useAdminProjects";

const NAV_ITEMS = [
  { to: "/admin", labelKey: "admin.nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/posts", labelKey: "admin.nav.posts", icon: Newspaper },
  { to: "/admin/projects", labelKey: "admin.nav.projects", icon: FolderKanban },
  { to: "/admin/reports", labelKey: "admin.nav.reports", icon: FileText },
  { to: "/admin/submissions", labelKey: "admin.nav.submissions", icon: Briefcase },
  { to: "/admin/donations", labelKey: "admin.nav.donations", icon: HeartHandshake },
  { to: "/admin/settings", labelKey: "admin.nav.settings", icon: Settings },
];

const BRANCH_ADMIN_ITEMS = [{ to: "/admin/my-branch", labelKey: "admin.nav.my_branch", icon: MapPin }];

const SUPER_ADMIN_ITEMS = [
  { to: "/admin/home-page", labelKey: "admin.nav.home_page", icon: ImageIcon },
  { to: "/admin/branches", labelKey: "admin.nav.branches", icon: MapPin },
  { to: "/admin/accounts", labelKey: "admin.nav.accounts", icon: Users },
  { to: "/admin/audit", labelKey: "admin.nav.audit", icon: ScrollText },
  { to: "/admin/social-links", labelKey: "admin.nav.social_links", icon: Share2 },
  { to: "/admin/subscribers", labelKey: "admin.nav.subscribers", icon: Mail },
  { to: "/admin/payment-info", labelKey: "admin.nav.payment_info", icon: Wallet },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  // Mobile drawer: Escape closes it, and the page behind does not scroll while it is open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isBranchAdmin = user?.role === "BRANCH_ADMIN";
  const { data: projects } = useAdminProjects();
  const pendingCount = isSuperAdmin ? (projects?.counts.PENDING ?? 0) : 0;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
      isActive
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    );

  return (
    <>
      {/* Mobile: dimmed backdrop, click to close */}
      {open && (
        <div className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm animate-fade-in-up lg:hidden" onClick={onClose} aria-hidden />
      )}
      {/*
        Large screens: fixed to the viewport height, only the link list scrolls (independently of the
        page, and reaching its end does not scroll the page). Small screens: a drawer over the page.
      */}
      <aside
        id="admin-sidebar"
        aria-label={t("admin.nav.menu")}
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex h-dvh w-72 max-w-[85vw] shrink-0 flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900",
          "lg:sticky lg:top-0 lg:z-auto lg:w-64 lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
      <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <HeartHandshake className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">CEM Admin</span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 lg:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="shrink-0 border-b border-slate-200 p-4 dark:border-slate-800">
        <ScopeSelector />
      </div>

      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <item.icon className="h-4 w-4" aria-hidden />
            {t(item.labelKey)}
            {item.to === "/admin/projects" && pendingCount > 0 && (
              <span
                className="ml-auto rounded-full bg-orange-600 px-1.5 text-[11px] font-bold text-white"
                title={t("admin.nav.projects_pending")}
              >
                {pendingCount}
              </span>
            )}
          </NavLink>
        ))}

        {isBranchAdmin &&
          BRANCH_ADMIN_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <item.icon className="h-4 w-4" aria-hidden />
              {t(item.labelKey)}
            </NavLink>
          ))}

        {isSuperAdmin && (
          <>
            <p className="mt-5 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-600">
              {t("admin.nav.super_admin")}
            </p>
            {SUPER_ADMIN_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <item.icon className="h-4 w-4" aria-hidden />
                {t(item.labelKey)}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      </aside>
    </>
  );
}
