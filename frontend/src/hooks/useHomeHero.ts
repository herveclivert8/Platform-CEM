import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapHomeHero, type HomeHeroDto, type HomeHeroInput } from "../types/settings";

export function useHomeHero() {
  return useQuery({
    queryKey: ["home-hero"],
    queryFn: async () => {
      const { data } = await api.get<HomeHeroDto>("/settings/home-hero");
      return mapHomeHero(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateHomeHero() {
  const queryClient = useQueryClient();
  return useMutation({
    // An empty field is sent as null: the site falls back to its default text / photo
    mutationFn: async (input: HomeHeroInput) => {
      const { data } = await api.put<HomeHeroDto>("/settings/home-hero", {
        hero_image_url: input.imageUrl || null,
        hero_badge_fr: input.badgeFr || null,
        hero_badge_en: input.badgeEn || null,
        hero_title_fr: input.titleFr || null,
        hero_title_en: input.titleEn || null,
        hero_subtitle_fr: input.subtitleFr || null,
        hero_subtitle_en: input.subtitleEn || null,
      });
      return mapHomeHero(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["home-hero"] }),
  });
}
