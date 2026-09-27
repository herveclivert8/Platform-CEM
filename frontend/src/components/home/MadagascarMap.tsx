import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { divIcon, latLngBounds } from "leaflet";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { useBranches } from "../../hooks/useBranches";
import { useHomePage } from "../../hooks/useHomePage";
import { networkSummary } from "./networkSummary";
import type { Branch } from "../../types/branch";
import { Skeleton } from "../ui/Skeleton";

// Neutral starting view (roughly mid-Atlantic) - FitBounds immediately zooms
// to whatever branches actually exist, wherever they are, on first render.
const FALLBACK_CENTER: [number, number] = [10, 10];

const emeraldIcon = divIcon({
  className: "",
  html: '<div class="marker-pulse"><div class="h-3.5 w-3.5 rounded-full bg-emerald-600 border-2 border-white shadow-md"></div></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

/** Keeps the map framed on every branch, regardless of how spread out they are. */
function FitBounds({ branches }: { branches: Branch[] }) {
  const map = useMap();

  useEffect(() => {
    if (branches.length === 0) return;
    if (branches.length === 1) {
      map.setView([branches[0].lat!, branches[0].lng!], 6);
      return;
    }
    const bounds = latLngBounds(branches.map((b) => [b.lat!, b.lng!] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, branches]);

  return null;
}

export function MadagascarMap() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useBranches();
  const { data: home } = useHomePage();

  const branchesWithCoords = (data?.items ?? []).filter(
    (b) => b.lat !== null && b.lng !== null,
  );
  // Sentence set by the super admin (auto-translated), otherwise computed from the branches
  const subtitle = home?.mapSubtitle || networkSummary(data?.items ?? [], t, i18n.language);

  return (
    <section id="antennes" className="bg-white py-20 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t("map.title")}
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">{isLoading ? " " : subtitle}</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-[480px] w-full rounded-2xl" />
        ) : branchesWithCoords.length === 0 ? (
          <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-400 dark:border-slate-800">
            {t("map.empty")}
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-sm dark:border-slate-800">
            <MapContainer
              center={FALLBACK_CENTER}
              zoom={2}
              scrollWheelZoom={false}
              style={{ height: 480, width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <FitBounds branches={branchesWithCoords} />
              {branchesWithCoords.map((branch) => (
                <Marker key={branch.id} position={[branch.lat!, branch.lng!]} icon={emeraldIcon}>
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="font-semibold text-slate-900">{branch.cityName}</p>
                      <p className="text-xs text-slate-500">{branch.country}</p>
                      <button
                        type="button"
                        onClick={() => navigate(`/antennes/${branch.id}`)}
                        className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        {t("map.view_branch")} <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </section>
  );
}
