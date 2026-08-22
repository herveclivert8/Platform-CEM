import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function AdminLayout() {
  useEffect(() => {
    const wasDark = document.documentElement.classList.contains("dark");
    document.documentElement.classList.add("dark");
    return () => {
      if (!wasDark) document.documentElement.classList.remove("dark");
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-6xl px-6 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
