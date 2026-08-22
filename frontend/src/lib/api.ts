import axios from "axios";
import { useAuthStore } from "../store/authStore";

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
