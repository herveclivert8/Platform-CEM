import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Briefcase, HeartHandshake, LogOut } from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useLogout } from "../../hooks/useAuth";
import { ThemeToggle } from "../layout/ThemeToggle";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../../hooks/useNotifications";
import type { Notification } from "../../types/notification";

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  donation: HeartHandshake,
  submission: Briefcase,
};

function formatRelativeTime(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function Topbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) markRead.mutate(notification.id);
    setNotifOpen(false);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-2 border-b border-slate-200 bg-white px-6 dark:border-slate-800 dark:bg-slate-900 lg:px-10">
      <ThemeToggle />

      <div ref={notifRef} className="relative">
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          aria-label="Notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <Bell className="h-4.5 w-4.5" aria-hidden />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-fade-in-up dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between px-3.5 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                Notifications
              </p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {!data || data.items.length === 0 ? (
              <p className="px-3.5 py-4 text-center text-sm text-slate-400 dark:text-slate-500">
                Aucune notification pour le moment.
              </p>
            ) : (
              <div className="max-h-96 overflow-y-auto border-t border-slate-200 dark:border-slate-800">
                {data.items.map((notification) => {
                  const Icon = NOTIFICATION_ICONS[notification.icon ?? ""] ?? Bell;
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="flex w-full items-start gap-2.5 border-b border-slate-100 px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/60"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={
                              notification.isRead
                                ? "truncate text-sm font-medium text-slate-600 dark:text-slate-300"
                                : "truncate text-sm font-semibold text-slate-900 dark:text-white"
                            }
                          >
                            {notification.title}
                          </span>
                          {!notification.isRead && (
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden />
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-slate-400 dark:text-slate-500">
                          {notification.message}
                        </span>
                        <span className="mt-1 block text-[11px] text-slate-400 dark:text-slate-600">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mx-1 h-6 w-px bg-slate-200 dark:bg-slate-800" aria-hidden />

      <div className="min-w-0 text-right">
        <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
          {user?.firstName} {user?.lastName}
        </p>
        <p className="truncate text-xs text-slate-400 dark:text-slate-500">{user?.email}</p>
      </div>

      <button
        type="button"
        onClick={() => setConfirmLogoutOpen(true)}
        aria-label="Déconnexion"
        className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-red-400"
      >
        <LogOut className="h-4 w-4" aria-hidden />
      </button>

      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Déconnexion"
        message="Voulez-vous vraiment vous déconnecter ?"
        confirmLabel="Se déconnecter"
        onConfirm={logout}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </header>
  );
}
