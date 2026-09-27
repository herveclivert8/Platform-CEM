import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapBranch, type Branch, type BranchDto } from "../types/branch";
import { mapPaginated, type PaginatedDto } from "../types/post";

interface BranchListParams {
  page?: number;
  pageSize?: number;
  /** Super Admin back-office: also list inactive / pending branches */
  includeInactive?: boolean;
}

export function useBranches(params: BranchListParams = {}) {
  // Every branch by default (selectors, map, directory): the network stays well under 500
  const { page = 1, pageSize = 500, includeInactive = false } = params;

  return useQuery({
    queryKey: ["branches", page, pageSize, includeInactive],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<BranchDto>>("/branches", {
        params: {
          page,
          page_size: pageSize,
          include_inactive: includeInactive || undefined,
        },
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
