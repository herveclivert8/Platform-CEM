import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPublication, type PublicationDto } from "../types/publication";
import { mapPaginated, type PaginatedDto } from "../types/post";

export function useBranchPublications(branchId: number | undefined) {
  return useQuery({
    queryKey: ["branch-publications", branchId],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<PublicationDto>>(
        `/branches/${branchId}/publications`,
      );
      return mapPaginated(data, mapPublication);
    },
    enabled: branchId !== undefined,
    staleTime: 60_000,
  });
}
