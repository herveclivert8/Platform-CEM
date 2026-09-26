import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapBranch, type Branch, type BranchDto } from "../types/branch";
import { mapPaginated, type PaginatedDto } from "../types/post";

interface BranchListParams {
  page?: number;
  pageSize?: number;
}

export function useBranches(params: BranchListParams = {}) {
  const { page = 1, pageSize = 50 } = params;

  return useQuery({
    queryKey: ["branches", page, pageSize],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<BranchDto>>("/branches", {
        params: { page, page_size: pageSize },
      });
      return mapPaginated(data, mapBranch);
    },
    staleTime: 60_000,
  });
}

/** Admin list: every status (active, inactive, pending); a branch admin only gets their own branch. */
export function useAdminBranchList() {
  return useQuery({
    queryKey: ["branches", "admin"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<BranchDto>>("/branches/admin", {
        params: { page: 1, page_size: 100 },
      });
      return mapPaginated(data, mapBranch);
    },
    staleTime: 60_000,
  });
}

export function useBranch(branchId: number | undefined) {
  return useQuery<Branch>({
    queryKey: ["branch", branchId],
    queryFn: async () => {
      const { data } = await api.get<BranchDto>(`/branches/${branchId}`);
      return mapBranch(data);
    },
    enabled: branchId !== undefined,
    staleTime: 60_000,
  });
}
