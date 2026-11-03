import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useHomePage } from "../../hooks/useHomePage";
import type { Partner, PartnerGroup } from "../../types/settings";

/** Kinds of institutional partnership, in display order (titles in partners.groups.* of the i18n files). */
export const PARTNER_GROUPS: PartnerGroup[] = ["agreement", "tacit", "developing"];

/** Partners shown while the super admin hasn't set their own list. */
const DEFAULT_PARTNERS: { group: PartnerGroup; key: string; url?: string; keepName?: boolean }[] = [
  { group: "agreement", key: "education" },
  { group: "agreement", key: "economy" },
  { group: "agreement", key: "journalists" },
  { group: "tacit", key: "central_bank", keepName: true },
  { group: "developing", key: "cedimes", url: "https://www.cedimes.com" },
  { group: "developing", key: "egss", url: "https://www.egss-uf.mg" },
];

export function defaultPartners(t: TFunction): Partner[] {
  return DEFAULT_PARTNERS.map(({ group, key, url, keepName }) => ({
    group,
    name: t(`partners.groups.${group}.partners.${key}`),
    url: url ?? null,
    keepName: keepName ?? false,
  }));
}

/**
 * Institutional partners grouped by kind of partnership, as set by the super admin (« Page d'accueil »).
 * Shown on the home page and on « Qui sommes-nous »; groups without partners are left out.
 */
export function usePartnerGroups() {
  const { t } = useTranslation();
  const { data: home } = useHomePage();
  const partners = home?.partners ?? defaultPartners(t);
  return PARTNER_GROUPS.map((group) => ({ group, partners: partners.filter((p) => p.group === group) })).filter(
    (g) => g.partners.length,
  );
}
