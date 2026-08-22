import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "cem_theme";

function applyTheme(preference: ThemePreference) {
  const isDark =
    preference === "dark" ||
    (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", isDark);
}

function readStoredPreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable (private mode, etc.) - fall back silently.
  }
  return "system";
}

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference>(readStoredPreference);

  useEffect(() => {
    applyTheme(preference);
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // ignore write failures
    }
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [preference]);

  const cyclePreference = useCallback(() => {
    setPreference((current) =>
      current === "light" ? "dark" : current === "dark" ? "system" : "light",
    );
  }, []);

  return { preference, setPreference, cyclePreference };
}
