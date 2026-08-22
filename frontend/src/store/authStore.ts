import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser } from "../types/user";

interface AuthState {
  user: CurrentUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (params: { user: CurrentUser; accessToken: string; refreshToken: string }) => void;
  setTokens: (params: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      login: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, isAuthenticated: true }),
      setTokens: ({ accessToken, refreshToken }) => set({ accessToken, refreshToken }),
      logout: () =>
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: "cem_auth" },
  ),
);
