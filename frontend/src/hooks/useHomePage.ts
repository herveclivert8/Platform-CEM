import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapHomePage, type HomePage, type HomePageDto } from "../types/settings";

/**
 * Home page & footer content. Without `lang`, the API client sends the visitor's language on
 * public pages (French in the back-office); pass "en" to preview the automatic translation.
 */
export function useHomePage(lang?: "fr" | "en") {
  return useQuery({
    queryKey: ["home-page", lang ?? "auto"],
    queryFn: async () => {
      const { data } = await api.get<HomePageDto>("/settings/home-page", { params: lang ? { lang } : undefined });
      return mapHomePage(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateHomePage() {
  const queryClient = useQueryClient();
  return useMutation({
    // French only; an empty field is sent as null and falls back to the site's default content
    mutationFn: async (input: HomePage) => {
      const { data } = await api.put<HomePageDto>("/settings/home-page", {
        hero_image_url: input.heroImageUrl || null,
        hero_badge: input.heroBadge || null,
        hero_title: input.heroTitle || null,
        hero_subtitle: input.heroSubtitle || null,
        values: input.values?.map((v) => v.trim()).filter(Boolean).length ? input.values : null,
        contact_address: input.contactAddress || null,
        contact_email: input.contactEmail || null,
        contact_phone: input.contactPhone || null,
        map_subtitle: input.mapSubtitle || null,
        show_donation_totals: input.showDonationTotals,
      });
      return mapHomePage(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["home-page"] }),
  });
}
