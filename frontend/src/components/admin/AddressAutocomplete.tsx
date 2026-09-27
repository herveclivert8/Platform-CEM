import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: { city?: string; town?: string; village?: string; country?: string };
}

export interface GeoSelection {
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface AddressAutocompleteProps {
  onSelect: (selection: GeoSelection) => void;
}

export function AddressAutocomplete({ onSelect }: AddressAutocompleteProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`,
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
        <MapPin className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={t("admin.address.search")}
          className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:text-white dark:placeholder:text-slate-500"
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400 dark:text-slate-500" aria-hidden />}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-40 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          {results.map((result, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onSelect({
                  address: result.display_name,
                  city:
                    result.address?.city ?? result.address?.town ?? result.address?.village ?? query,
                  country: result.address?.country ?? "",
                  latitude: Number(result.lat),
                  longitude: Number(result.lon),
                });
                setQuery(result.display_name);
                setOpen(false);
              }}
              className="block w-full px-4 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
            >
              {result.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
