import { HeartHandshake } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Skeleton } from "../../components/ui/Skeleton";
import { useAdminDonations } from "../../hooks/useAdminDonations";
import { useBranches } from "../../hooks/useBranches";

export function DonationsPage() {
  const { data: donations, isLoading } = useAdminDonations();
  const { data: branchesData } = useBranches();

  const branchName = (branchId: number | null) =>
    branchId ? (branchesData?.items.find((b) => b.id === branchId)?.cityName ?? `#${branchId}`) : "Don global";

  const total = donations?.reduce((sum, d) => sum + d.amount, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Dons reçus</h1>
          <p className="mt-1 text-sm text-slate-400">Dons fléchés vers cette antenne.</p>
        </div>
        {!isLoading && (
          <div className="text-right">
            <p className="text-2xl font-extrabold tracking-tight text-emerald-400">{total.toFixed(0)}€</p>
            <p className="text-xs text-slate-500">{donations?.length ?? 0} dons</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !donations || donations.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">Aucun don reçu pour le moment.</p>
      ) : (
        <div className="mt-6 space-y-2.5">
          {donations.map((d) => (
            <Card key={d.id} hoverable={false} className="flex items-center gap-4 p-4">
              <IconBadge icon={<HeartHandshake className="h-4 w-4" aria-hidden />} tone="orange" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{d.donorEmail}</p>
                <p className="text-xs text-slate-500">
                  {branchName(d.branchId)} ·{" "}
                  {new Date(d.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <p className="text-sm font-bold text-emerald-400">{d.amount.toFixed(0)}€</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
