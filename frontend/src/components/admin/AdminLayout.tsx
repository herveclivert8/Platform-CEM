import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { Toaster } from "./Toaster";
import { useNotificationStream } from "../../hooks/useNotificationStream";

export function AdminLayout() {
  useNotificationStream();

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-x-hidden">
        <Topbar />
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
      <Toaster />
    </div>
  );
}
