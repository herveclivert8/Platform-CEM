import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../../theme/useTheme";

const ICONS = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function ThemeToggle() {
  const { preference, cyclePreference } = useTheme();
  const Icon = ICONS[preference];

  return (
    <button
      type="button"
      onClick={cyclePreference}
      aria-label={`Thème : ${preference}. Cliquer pour changer.`}
      title={`Thème : ${preference}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  );
}
