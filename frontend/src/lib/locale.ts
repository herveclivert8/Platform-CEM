import i18n from "../i18n/i18n";

/** BCP 47 locale for dates and numbers, following the interface language. */
export function dateLocale(): string {
  return i18n.language?.startsWith("en") ? "en-GB" : "fr-FR";
}
