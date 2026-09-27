import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "./Toaster";
import { useNotificationStream } from "../../hooks/useNotificationStream";
import { usePageMeta } from "../../hooks/usePageMeta";

export function AdminLayout() {
  const { t } = useTranslation();
  usePageMeta(t("seo.admin"));
  useNotificationStream();

  // Small screens: the sidebar is a drawer opened from the top bar (☰); closed on each navigation
  const [navOpen, setNavOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setNavOpen(false), [pathname]);
  // Back to a large screen (drawer no longer used): close it, so the page is not left scroll-locked
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => e.matches && setNavOpen(false);
    desktop.addEventListener("change", onChange);
    return () => desktop.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        <Topbar onMenuClick={() => setNavOpen(true)} menuOpen={navOpen} />
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
