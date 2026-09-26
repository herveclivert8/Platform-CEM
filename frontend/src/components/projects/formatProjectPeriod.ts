import type { TFunction } from "i18next";
import type { Project } from "../../types/project";

function formatDate(iso: string, locale: string) {
  // Dates are plain YYYY-MM-DD: parse as local midnight so the day never shifts with the timezone.
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

export function formatProjectPeriod(project: Project, t: TFunction, locale: string): string | null {
  const { startDate, endDate, phase } = project;
  if (startDate && endDate && phase === "COMPLETED") {
    return t("projects.from_to", { start: formatDate(startDate, locale), end: formatDate(endDate, locale) });
  }
  if (phase === "COMPLETED" && endDate) return t("projects.completed_on", { date: formatDate(endDate, locale) });
  if (startDate) return t("projects.since", { date: formatDate(startDate, locale) });
  return null;
}
