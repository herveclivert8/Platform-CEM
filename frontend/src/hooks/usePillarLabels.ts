import { useTranslation } from "react-i18next";
import { ALL_PILLARS, type Pillar } from "../types/post";

/** Locale-aware pillar labels - re-derived from i18n on every language change. */
export function usePillarLabels(): Record<Pillar, string> {
  const { t } = useTranslation();
  return Object.fromEntries(ALL_PILLARS.map((p) => [p, t(`pillars.${p}`)])) as Record<Pillar, string>;
}
