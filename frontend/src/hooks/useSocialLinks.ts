import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapSocialLinks, type SocialLinksDto, type SocialLinksInput } from "../types/settings";

export function useSocialLinks() {
  return useQuery({
    queryKey: ["social-links"],
    queryFn: async () => {
      const { data } = await api.get<SocialLinksDto>("/settings/social-links");
      return mapSocialLinks(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateSocialLinks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SocialLinksInput) => {
      const { data } = await api.put<SocialLinksDto>("/settings/social-links", {
        facebook_url: input.facebookUrl || null,
        x_url: input.xUrl || null,
        linkedin_url: input.linkedinUrl || null,
        youtube_url: input.youtubeUrl || null,
      });
      return mapSocialLinks(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["social-links"] }),
  });
}
