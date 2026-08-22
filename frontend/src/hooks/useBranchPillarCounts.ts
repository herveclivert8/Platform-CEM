import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { Pillar, PaginatedDto, PostDto } from "../types/post";

const PILLARS: Pillar[] = ["EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE"];

export type PillarCounts = Record<Pillar, number>;

export function useBranchPillarCounts(branchId: number | undefined) {
  return useQuery<PillarCounts>({
    queryKey: ["branch-pillar-counts", branchId],
    queryFn: async () => {
      const results = await Promise.all(
        PILLARS.map((pillar) =>
          api.get<PaginatedDto<PostDto>>(`/branches/${branchId}/posts`, {
            params: { page: 1, page_size: 1, pillar },
          }),
        ),
      );
      return PILLARS.reduce((acc, pillar, i) => {
        acc[pillar] = results[i].data.total;
        return acc;
      }, {} as PillarCounts);
    },
    enabled: branchId !== undefined,
    staleTime: 30_000,
  });
}
