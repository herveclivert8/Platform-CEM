import { create } from "zustand";
import type { NotificationType } from "../types/notification";

/** Back-office messages: real-time notifications and confirmations after an action. */
export interface Toast {
  id: number;
  title: string;
  message: string;
  tone: NotificationType;
  /** Clicking the message opens this page */
  actionUrl: string | null;
  /** Confirmation after a change: also offer to sign out (staying signed in is the default) */
  offerLogout: boolean;
}

export interface ToastInput {
  title: string;
  message?: string;
  tone?: NotificationType;
  actionUrl?: string | null;
  offerLogout?: boolean;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: ToastInput) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 8_000;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ title, message = "", tone = "info", actionUrl = null, offerLogout = false }) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, title, message, tone, actionUrl, offerLogout }].slice(-4) });
    window.setTimeout(() => get().dismiss(id), TOAST_DURATION_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
