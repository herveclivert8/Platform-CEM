import { create } from "zustand";
import type { NotificationType } from "../types/notification";

export interface Toast {
  id: number;
  title: string;
  message: string;
  tone: NotificationType;
  actionUrl: string | null;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

const TOAST_DURATION_MS = 8_000;
let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { ...toast, id }].slice(-4) });
    window.setTimeout(() => get().dismiss(id), TOAST_DURATION_MS);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
