import type { TFunction } from "i18next";
import type { Branch } from "../../types/branch";

/**
 * Default sentence under « Nos antennes », computed from the active branches so it never goes
 * stale: « 4 antennes dans 2 pays : Madagascar et France ». No country is hard-coded.
 */
export function networkSummary(branches: Branch[], t: TFunction, lang: string): string {
  if (branches.length === 0) return t("map.empty");
  const countries = [...new Set(branches.map((b) => b.country))].sort((a, b) => a.localeCompare(b, lang));
  return t("map.summary", {
    branches: t("map.branch_count", { count: branches.length }),
    countries: t("map.country_count", { count: countries.length }),
    list: new Intl.ListFormat(lang, { style: "long", type: "conjunction" }).format(countries),
  });
}
