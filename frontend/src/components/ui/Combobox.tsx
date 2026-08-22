import { useEffect, useMemo, useRef, useState } from "react";
import { Search, MapPin } from "lucide-react";
import clsx from "clsx";

export interface ComboboxOption {
  id: string | number;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  placeholder: string;
  options: ComboboxOption[];
  onSelect: (option: ComboboxOption) => void;
  /** Also listen for Cmd/Ctrl+K anywhere on the page to focus this input. */
  globalShortcut?: boolean;
  className?: string;
}

export function Combobox({
  placeholder,
  options,
  onSelect,
  globalShortcut = false,
  className,
}: ComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.sublabel?.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!globalShortcut) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [globalShortcut]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm transition-all focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:text-slate-100"
        />
        {globalShortcut && (
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline-block dark:border-slate-700 dark:bg-slate-800">
            ⌘K
          </kbd>
        )}
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-lg animate-fade-in-up dark:border-slate-800 dark:bg-slate-900">
          <ul className="max-h-72 overflow-y-auto py-1.5">
            {filtered.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option);
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                  <span className="font-medium">{option.label}</span>
                  {option.sublabel && (
                    <span className="text-slate-400">{option.sublabel}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
