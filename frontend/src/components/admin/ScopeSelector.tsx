import { useEffect, useRef, useState } from "react";
import { ChevronsUpDown, Check, MapPin, Globe2 } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "../../store/authStore";
import { useBranches } from "../../hooks/useBranches";
import { useAdminScopeStore } from "../../store/adminScopeStore";

export function ScopeSelector() {
  const user = useAuthStore((s) => s.user);
  const { data } = useBranches();
  const { selectedBranchId, setSelectedBranchId } = useAdminScopeStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (user?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-slate-800/60 px-3 py-2">
        <MapPin className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
        <span className="truncate text-sm font-medium text-slate-200">
          {user?.branchName ?? "Mon antenne"}
        </span>
      </div>
    );
  }

  const branches = data?.items ?? [];
  const currentLabel =
    selectedBranchId === "all"
      ? "Toutes les antennes"
      : (branches.find((b) => b.id === selectedBranchId)?.cityName ?? "…");

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Globe2 className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
          <span className="truncate">{currentLabel}</span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-40 mt-1.5 overflow-hidden rounded-xl border border-slate-700 bg-slate-800 py-1.5 shadow-xl animate-fade-in-up">
          <button
            type="button"
            onClick={() => {
              setSelectedBranchId("all");
              setOpen(false);
            }}
            className={clsx(
              "flex w-full items-center justify-between px-3.5 py-2 text-sm hover:bg-slate-700/60",
              selectedBranchId === "all" ? "font-semibold text-emerald-400" : "text-slate-300",
            )}
          >
            Toutes les antennes
            {selectedBranchId === "all" && <Check className="h-3.5 w-3.5" />}
          </button>
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => {
                setSelectedBranchId(branch.id);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center justify-between px-3.5 py-2 text-sm hover:bg-slate-700/60",
                selectedBranchId === branch.id ? "font-semibold text-emerald-400" : "text-slate-300",
              )}
            >
              {branch.cityName}
              {selectedBranchId === branch.id && <Check className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
