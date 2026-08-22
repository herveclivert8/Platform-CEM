import { useState } from "react";
import { Plus, Trash2, User, ShieldCheck } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { CreateAccountDrawer } from "../../components/admin/CreateAccountDrawer";
import { useAdminAccounts, useDeleteAccount } from "../../hooks/useAdminAccounts";
import { useAuthStore } from "../../store/authStore";

export function AccountsPage() {
  const { data: accounts, isLoading } = useAdminAccounts();
  const deleteAccount = useDeleteAccount();
  const currentUser = useAuthStore((s) => s.user);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Comptes admin</h1>
          <p className="mt-1 text-sm text-slate-400">Créez et gérez les comptes Admin d'Antenne.</p>
        </div>
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
          Nouveau compte
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <div className="mt-6 space-y-2.5">
          {accounts?.map((account) => (
            <Card key={account.id} hoverable={false} className="flex items-center gap-4 p-4">
              <IconBadge
                icon={
                  account.role === "SUPER_ADMIN" ? (
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                  ) : (
                    <User className="h-4 w-4" aria-hidden />
                  )
                }
                tone={account.role === "SUPER_ADMIN" ? "orange" : "emerald"}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white">
                    {account.firstName} {account.lastName}
                  </p>
                  <Badge tone={account.role === "SUPER_ADMIN" ? "orange" : "emerald"}>
                    {account.role === "SUPER_ADMIN" ? "Super Admin" : account.branchName ?? "Antenne"}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">{account.email}</p>
              </div>
              {account.id !== currentUser?.id && (
                <button
                  type="button"
                  onClick={() =>
                    window.confirm(`Supprimer le compte de ${account.firstName} ${account.lastName} ?`) &&
                    deleteAccount.mutate(account.id)
                  }
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Supprimer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      <CreateAccountDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
