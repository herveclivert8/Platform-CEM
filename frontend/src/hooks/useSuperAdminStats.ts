import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export interface SuperAdminStatistics {
  total_branches: number;
  total_publications: number;
  total_posts: number;
  total_admins: number;
}

export function useSuperAdminStatistics() {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "SUPER_ADMIN");

  return useQuery<SuperAdminStatistics>({
    queryKey: ["super-admin-statistics"],
    queryFn: async () => {
      const { data } = await api.get<SuperAdminStatistics>("/super-admin/statistics");
      return data;
    },
    enabled: isSuperAdmin,
  });
}

export interface AuditLogEntry {
  id: number;
  action: string;
  resource_type: string;
  resource_id: number | null;
  user_email: string;
  branch_id: number | null;
  ip_address: string | null;
  success: number;
  created_at: string;
}

interface AuditLogListDto {
  items: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function useAuditLog(days = 30) {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "SUPER_ADMIN");

  return useQuery<AuditLogListDto>({
    queryKey: ["audit-log", days],
    queryFn: async () => {
      const { data } = await api.get<AuditLogListDto>("/super-admin/audit", {
        params: { page: 1, page_size: 50, days },
      });
      return data;
    },
    enabled: isSuperAdmin,
  });
}

export interface AuditStats {
  total_events: number;
  failed_logins: number;
  publications_created: number;
  admins_created: number;
  last_event: string | null;
}

export function useAuditStats(days = 30) {
  const isSuperAdmin = useAuthStore((s) => s.user?.role === "SUPER_ADMIN");

  return useQuery<AuditStats>({
    queryKey: ["audit-stats", days],
    queryFn: async () => {
      const { data } = await api.get<AuditStats>("/super-admin/audit/stats", { params: { days } });
      return data;
    },
    enabled: isSuperAdmin,
  });
}
