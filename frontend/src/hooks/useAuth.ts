import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { mapCurrentUser, type CurrentUserDto } from "../types/user";

interface LoginResponseDto {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: CurrentUserDto;
}

export function useLogin() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data } = await api.post<LoginResponseDto>("/auth/login", { email, password });
      return data;
    },
    onSuccess: (data) => {
      login({
        user: mapCurrentUser(data.user),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    },
  });
}

export function useLogout() {
  const logout = useAuthStore((s) => s.logout);

  return () => {
    // Capture the token before clearing the store: api.post() only queues the
    // request interceptor as a microtask, so calling logout() first would clear
    // accessToken before the Authorization header is actually attached.
    const token = useAuthStore.getState().accessToken;
    api
      .post("/auth/logout", null, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .catch(() => {});
    logout();
  };
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (params: {
      currentPassword: string;
      newPassword: string;
      confirmPassword: string;
    }) => {
      const { data } = await api.post("/auth/password/change", {
        current_password: params.currentPassword,
        new_password: params.newPassword,
        confirm_password: params.confirmPassword,
      });
      return data;
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data } = await api.post("/auth/password/forgot", { email });
      return data;
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (params: { token: string; newPassword: string }) => {
      const { data } = await api.post("/auth/password/reset", {
        token: params.token,
        new_password: params.newPassword,
      });
      return data;
    },
  });
}
