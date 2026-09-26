import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check } from "lucide-react";
import clsx from "clsx";

const LANGUAGES = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

export function LanguageDropdown() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = i18n.language.startsWith("en") ? "en" : "fr";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
        aria-label={t("common.change_language")}
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span className="uppercase">{current}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-xl border border-slate-200/80 bg-white py-1.5 shadow-lg animate-fade-in-up dark:border-slate-800 dark:bg-slate-900">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              onClick={() => {
                i18n.changeLanguage(lang.code);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center justify-between px-3.5 py-2 text-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-800",
                current === lang.code
                  ? "font-semibold text-emerald-600 dark:text-emerald-400"
                  : "text-slate-600 dark:text-slate-300",
              )}
            >
              {lang.label}
              {current === lang.code && <Check className="h-3.5 w-3.5" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
