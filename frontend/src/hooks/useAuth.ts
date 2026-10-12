import { useMutation, useQuery } from "@tanstack/react-query";
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

export interface RegisterParams {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  branchId: number;
}

/** Visitor sign-up as a member: the account is created pending approval and signed in right away. */
export function useRegister() {
  const login = useAuthStore((s) => s.login);

  return useMutation({
    mutationFn: async (params: RegisterParams) => {
      const { data } = await api.post<LoginResponseDto>("/auth/register", {
        first_name: params.firstName,
        last_name: params.lastName,
        email: params.email,
        phone: params.phone,
        password: params.password,
        branch_id: params.branchId,
      });
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

/** Fresh profile from the server (e.g. a membership approved since sign-in), kept in sync with the store. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const { data } = await api.get<CurrentUserDto>("/auth/me");
      const user = mapCurrentUser(data);
      useAuthStore.setState({ user });
      return user;
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
      const { data } = await api.post<LoginResponseDto>("/auth/password/change", {
        current_password: params.currentPassword,
        new_password: params.newPassword,
        confirm_password: params.confirmPassword,
      });
      return data;
    },
    // The backend revokes every existing session and returns fresh tokens for this one
    onSuccess: (data) => {
      useAuthStore.getState().login({
        user: mapCurrentUser(data.user),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
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
