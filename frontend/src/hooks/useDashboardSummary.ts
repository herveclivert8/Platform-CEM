import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Currency } from "../types/donation";
import { useScopedBranchId } from "./useAdminScope";

export interface DashboardSummary {
  posts_published: number;
  posts_draft: number;
  submissions_total: number;
  submissions_new: number;
  donations_pending: number;
  donations_confirmed: number;
  donations_rejected: number;
  donations_confirmed_totals: { currency: Currency; amount: number }[];
}

/** Counters computed by the backend over the whole database (exact whatever the volume). */
export function useDashboardSummary() {
  const branchId = useScopedBranchId();
  return useQuery<DashboardSummary>({
    queryKey: ["dashboard-summary", branchId ?? "all"],
    queryFn: async () => {
      const { data } = await api.get<DashboardSummary>("/dashboard/summary", {
        params: branchId !== undefined ? { branch_id: branchId } : undefined,
      });
      return data;
    },
  });
}
