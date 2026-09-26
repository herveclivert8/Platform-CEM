import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../theme/useTheme";
import { useTranslation } from "react-i18next";

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function ThemeToggle() {
  const { t } = useTranslation();
  const { preference, cyclePreference } = useTheme();
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={t("theme.label", { mode: preference })}
      title={t("theme.title", { mode: preference })}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
