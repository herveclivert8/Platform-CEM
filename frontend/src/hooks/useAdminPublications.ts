import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaginated, type Paginated, type PaginatedDto } from "../types/post";
import {
  mapPublication,
  mapAdminPublication,
  type AdminPublication,
  type AdminPublicationDto,
  type PublicationDto,
  type PublicationInput,
} from "../types/publication";
import { useScopedBranchId } from "./useAdminScope";

/** Back-office list of annual reports, in the current scope (own branch, or the Super Admin's pick). */
export function useAdminPublications(filters: { page: number; q?: string } = { page: 1 }) {
  const branchId = useScopedBranchId();
  return useQuery<Paginated<AdminPublication>>({
    queryKey: ["admin-publications", branchId ?? "all", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<AdminPublicationDto>>("/branches/publications/admin", {
        params: { branch_id: branchId, page: filters.page, page_size: 20, q: filters.q?.trim() || undefined },
      });
      return mapPaginated(data, mapAdminPublication);
    },
    placeholderData: keepPreviousData,
  });
}

/** Back-office list and the public « Rapports » tab of each branch. */
function invalidatePublications(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: ["admin-publications"] });
  queryClient.invalidateQueries({ queryKey: ["branch-publications"] });
}

export function useCreatePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, input }: { branchId: number; input: PublicationInput }) => {
      const { data } = await api.post<PublicationDto>(`/branches/${branchId}/publications`, input);
      return mapPublication(data);
    },
    onSuccess: () => invalidatePublications(queryClient),
  });
}

export function useUpdatePublication(publicationId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PublicationInput>) => {
      const { data } = await api.put<PublicationDto>(`/branches/publications/${publicationId}`, input);
      return mapPublication(data);
    },
    onSuccess: () => invalidatePublications(queryClient),
  });
}

export function useDeletePublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (publicationId: number) => {
      await api.delete(`/branches/publications/${publicationId}`);
    },
    onSuccess: () => invalidatePublications(queryClient),
  });
}
