import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapBranch, type BranchDto } from "../types/branch";
import type { PaginatedDto, PostDto } from "../types/post";

export interface GlobalStats {
  activeBranches: number;
  publishedPosts: number;
  educationPosts: number;
  enterprisePosts: number;
}

/**
 * Derived from real, publicly-readable data only (no fabricated numbers):
 * branch count + published-post totals per branch/pillar, aggregated client-side
 * since the backend has no dedicated public aggregate-stats endpoint yet.
 */
export function useGlobalStats() {
  return useQuery<GlobalStats>({
    queryKey: ["global-stats"],
    queryFn: async () => {
      const { data: branchesDto } = await api.get<PaginatedDto<BranchDto>>("/branches", {
        params: { page: 1, page_size: 100 },
      });
      const branches = branchesDto.items.map(mapBranch);

      const perBranchTotals = await Promise.all(
        branches.map(async (branch) => {
          const [all, education, enterprise] = await Promise.all([
            api.get<PaginatedDto<PostDto>>(`/branches/${branch.id}/posts`, {
              params: { page: 1, page_size: 1 },
            }),
            api.get<PaginatedDto<PostDto>>(`/branches/${branch.id}/posts`, {
              params: { page: 1, page_size: 1, pillar: "EDUCATION" },
            }),
            api.get<PaginatedDto<PostDto>>(`/branches/${branch.id}/posts`, {
              params: { page: 1, page_size: 1, pillar: "ENTERPRISE" },
            }),
          ]);
          return {
            total: all.data.total,
            education: education.data.total,
            enterprise: enterprise.data.total,
          };
        }),
      );

      return {
        activeBranches: branchesDto.total,
        publishedPosts: perBranchTotals.reduce((sum, b) => sum + b.total, 0),
        educationPosts: perBranchTotals.reduce((sum, b) => sum + b.education, 0),
        enterprisePosts: perBranchTotals.reduce((sum, b) => sum + b.enterprise, 0),
      };
    },
    staleTime: 60_000,
  });
}
