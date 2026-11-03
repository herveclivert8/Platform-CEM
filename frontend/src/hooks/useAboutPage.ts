import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

/** Texts of « Qui sommes-nous » edited by the Super Admin, by i18n key (absent key = site default). */
export type AboutContent = Record<string, string>;

interface AboutPageDto {
  content: AboutContent;
  lang: string;
}

/**
 * Without `lang`, the API client sends the visitor's language on public pages (French in the
 * back-office); pass "en" to preview the automatic translation.
 */
export function useAboutPage(lang?: "fr" | "en") {
  return useQuery({
    queryKey: ["about-page", lang ?? "auto"],
    queryFn: async () => {
      const { data } = await api.get<AboutPageDto>("/settings/about-page", { params: lang ? { lang } : undefined });
      return data.content;
    },
    staleTime: 5 * 60_000,
  });
}

/** `t` for the texts of « Qui sommes-nous »: the edited text when there is one, else the site default. */
export function useAboutText() {
  const { t } = useTranslation();
  const { data } = useAboutPage();
  return useCallback((key: string) => data?.[key] || t(key), [data, t]);
}

export function useUpdateAboutPage() {
  const queryClient = useQueryClient();
  return useMutation({
    // French only; empty texts are dropped and fall back to the site's default content
    mutationFn: async (content: AboutContent) => {
      const { data } = await api.put<AboutPageDto>("/settings/about-page", {
        content: Object.fromEntries(Object.entries(content).filter(([, v]) => v.trim())),
      });
      return data.content;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["about-page"] }),
  });
}
