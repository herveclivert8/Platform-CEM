import axios, { isAxiosError } from "axios";
import { useAuthStore } from "../store/authStore";
import i18n from "../i18n/i18n";

export const api = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Separate, un-intercepted client for the refresh call itself (avoids recursive 401 handling).
const refreshClient = axios.create({ baseURL: "/api/v1" });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Public pages read content in the visitor's language (automatic FR → EN translations).
  // Never in the back-office: admins always edit the French original. An explicit param wins.
  if (config.method === "get" && !window.location.pathname.startsWith("/admin")) {
    config.params = { lang: i18n.language?.startsWith("en") ? "en" : "fr", ...config.params };
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = useAuthStore.getState().refreshToken;
  if (!refreshToken) throw new Error("No refresh token");

  const { data } = await refreshClient.post("/auth/refresh", { refresh_token: refreshToken });
  useAuthStore
    .getState()
    .setTokens({ accessToken: data.access_token, refreshToken: data.refresh_token });
  return data.access_token as string;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Temporary password not replaced yet (e.g. stale state from another tab): force the change
    if (error.response?.status === 403 && error.response?.data?.detail === "PASSWORD_CHANGE_REQUIRED") {
      const { user } = useAuthStore.getState();
      if (user && !user.mustChangePassword) {
        useAuthStore.setState({ user: { ...user, mustChangePassword: true } });
      }
      if (window.location.pathname !== "/change-password") {
        window.location.assign("/change-password");
      }
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry || !useAuthStore.getState().isAuthenticated) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return api(originalRequest);
    } catch {
      useAuthStore.getState().logout();
      if (window.location.pathname.startsWith("/admin")) {
        window.location.assign("/login");
      }
      return Promise.reject(error);
    }
  },
);

/**
 * Readable message for a failed API call: FastAPI's HTTPException `detail`, or the first
 * validation error. Falls back to `fallback` (and to a dedicated message when offline).
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    if (!error.response) return i18n.t("common.server_unreachable");
    const data = error.response.data as { detail?: unknown; errors?: { message?: string }[] } | undefined;
    if (typeof data?.detail === "string" && data.detail !== "Erreur de validation") return data.detail;
    const first = data?.errors?.[0]?.message;
    if (typeof first === "string") return first.replace(/^Value error, /, "");
  }
  return fallback;
}
