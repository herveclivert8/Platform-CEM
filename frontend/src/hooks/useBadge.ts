import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types/user";

/** Information read live by the server when a badge QR code is scanned. */
export interface BadgeVerification {
  valid: boolean;
  role: UserRole | null;
  firstName: string | null;
  lastName: string | null;
  /** Members only */
  email: string | null;
  /** "CEM Antananarivo", "ADMIN Antananarivo" or "Superadmin" */
  title: string | null;
}

interface BadgeVerificationDto {
  valid: boolean;
  role: UserRole | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  title: string | null;
}

/** Signed-in user's badge token (approved member up to date, admin or Super Admin). */
export function useMyBadge(enabled: boolean) {
  // Per account: another user signing in on the same browser never sees the previous badge
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["my-badge", userId],
    queryFn: async () => (await api.get<{ token: string }>("/badges/me")).data.token,
    enabled: enabled && !!userId,
    retry: false,
  });
}

/** Public verification page: null when the QR code matches no badge. */
export function useBadgeVerification(token: string | undefined) {
  return useQuery({
    queryKey: ["badge-verification", token],
    queryFn: async (): Promise<BadgeVerification | null> => {
      try {
        const { data } = await api.get<BadgeVerificationDto>(`/badges/verify/${encodeURIComponent(token!)}`);
        return {
          valid: data.valid,
          role: data.role,
          firstName: data.first_name,
          lastName: data.last_name,
          email: data.email,
          title: data.title,
        };
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) return null;
        throw error;
      }
    },
    enabled: !!token,
    retry: false,
    // Always the current state: never shown from cache
    staleTime: 0,
    gcTime: 0,
  });
}
