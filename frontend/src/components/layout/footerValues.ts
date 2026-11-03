import type { TFunction } from "i18next";

/** « Nos valeurs » shown in the footer while the super admin hasn't set their own (footer.values.* in i18n). */
const DEFAULT_VALUE_KEYS = ["humanity", "work", "excellence", "entrepreneurship", "cooperation"] as const;

export interface FooterValue {
  title: string;
  /** Shown on hover; "" = none */
  text: string;
}

export function defaultFooterValues(t: TFunction): FooterValue[] {
  return DEFAULT_VALUE_KEYS.map((key) => ({ title: t(`footer.values.${key}.title`), text: t(`footer.values.${key}.text`) }));
}
