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
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { ScopeSelector } from "./ScopeSelector";

const NAV_ITEMS = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/posts", label: "Mes Publications", icon: Newspaper },
  { to: "/admin/submissions", label: "Dossiers Entrepreneurs", icon: Briefcase },
  { to: "/admin/donations", label: "Dons", icon: HeartHandshake },
  { to: "/admin/settings", label: "Paramètres", icon: Settings },
];

const BRANCH_ADMIN_ITEMS = [{ to: "/admin/my-branch", label: "Mon antenne", icon: MapPin }];

const SUPER_ADMIN_ITEMS = [
  { to: "/admin/branches", label: "Antennes", icon: MapPin },
  { to: "/admin/accounts", label: "Comptes admin", icon: Users },
  { to: "/admin/audit", label: "Journal d'audit", icon: ScrollText },
  { to: "/admin/social-links", label: "Réseaux sociaux", icon: Share2 },
  { to: "/admin/payment-info", label: "Coordonnées de paiement", icon: Wallet },
];

export function Sidebar() {
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const isBranchAdmin = user?.role === "BRANCH_ADMIN";

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    clsx(
      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
      isActive
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    );

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5 dark:border-slate-800">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <HeartHandshake className="h-4.5 w-4.5" aria-hidden />
        </span>
        <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">CEM Admin</span>
      </div>

      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <ScopeSelector />
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
            <item.icon className="h-4 w-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}

        {isBranchAdmin &&
          BRANCH_ADMIN_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}

        {isSuperAdmin && (
          <>
            <p className="mt-5 px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-600">
              Super Admin
            </p>
            {SUPER_ADMIN_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
