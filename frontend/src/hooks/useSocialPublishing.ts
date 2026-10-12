import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaginated, type Paginated, type PaginatedDto } from "../types/post";

export type SocialNetwork = "FACEBOOK" | "INSTAGRAM" | "LINKEDIN";
export type SocialPublicationStatus = "PUBLISHED" | "FAILED" | "SKIPPED";
export type SocialPublishingMode = "simulation" | "live" | "disabled";

export interface SocialStatus {
  mode: SocialPublishingMode;
  networks: { network: SocialNetwork; label: string; configured: boolean }[];
}

export interface SocialPublication {
  id: number;
  resourceType: "post" | "project";
  resourceId: number;
  network: SocialNetwork;
  status: SocialPublicationStatus;
  title: string;
  message: string;
  externalUrl: string | null;
  error: string | null;
  simulated: boolean;
  createdAt: string;
}

interface SocialPublicationDto {
  id: number;
  resource_type: "post" | "project";
  resource_id: number;
  network: SocialNetwork;
  status: SocialPublicationStatus;
  title: string;
  message: string;
  external_url: string | null;
  error: string | null;
  simulated: boolean;
  created_at: string;
}

/** Publishing mode and which networks have credentials on the server (Super Admin). */
export function useSocialStatus() {
  return useQuery<SocialStatus>({
    queryKey: ["social-status"],
    queryFn: async () => (await api.get<SocialStatus>("/social/status")).data,
  });
}

/** History of automatic posts to Facebook, Instagram and LinkedIn, newest first. */
export function useSocialPublications(status: SocialPublicationStatus | undefined, page: number) {
  return useQuery<Paginated<SocialPublication>>({
    queryKey: ["social-publications", status, page],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<SocialPublicationDto>>("/social/publications", {
        params: { status, page, page_size: 30 },
      });
      return mapPaginated(data, (dto) => ({
        id: dto.id,
        resourceType: dto.resource_type,
        resourceId: dto.resource_id,
        network: dto.network,
        status: dto.status,
        title: dto.title,
        message: dto.message,
        externalUrl: dto.external_url,
        error: dto.error,
        simulated: dto.simulated,
        createdAt: dto.created_at,
      }));
    },
    placeholderData: keepPreviousData,
  });
}

export function useRetrySocialPublication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/social/publications/${id}/retry`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-publications"] }),
  });
}
