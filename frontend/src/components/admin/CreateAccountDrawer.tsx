import { useState } from "react";
import { Drawer } from "./Drawer";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useBranches } from "../../hooks/useBranches";
import { useCreateAccount } from "../../hooks/useAdminAccounts";
import { useTranslation } from "react-i18next";

export function CreateAccountDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [branchId, setBranchId] = useState<number | "">("");
  const { data: branchesData } = useBranches({ includeInactive: true });
  const createAccount = useCreateAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId) return;
    await createAccount.mutateAsync({ email, firstName, lastName, branchId });
  };

  const handleClose = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setBranchId("");
    createAccount.reset();
    onClose();
  };

  return (
    <Drawer open={open} onClose={handleClose} title={t("admin.accounts.drawer_title")}>
      {createAccount.isSuccess ? (
        <div className="space-y-4">
          <Badge tone="emerald">{t("admin.accounts.created")}</Badge>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t("admin.accounts.temp_password_hint")}
          </p>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400">
            {createAccount.data?.temporary_password}
          </div>
          {!createAccount.data?.welcome_email_sent && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {t("admin.accounts.welcome_not_sent")}
            </p>
          )}
          <Button variant="secondary" onClick={handleClose}>
            {t("admin.accounts.done")}
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder={t("admin.accounts.first_name")}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <input
              required
              placeholder={t("admin.accounts.last_name")}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <input
            required
            type="email"
            placeholder={t("auth.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <select
            required
            value={branchId}
            onChange={(e) => setBranchId(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">{t("admin.accounts.branch_to_assign")}</option>
            {branchesData?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>

          {createAccount.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">{t("admin.accounts.email_exists")}</p>
          )}

          <Button type="submit" variant="secondary" className="w-full justify-center" disabled={createAccount.isPending}>
            {createAccount.isPending ? "…" : t("admin.accounts.create")}
          </Button>
        </form>
      )}
    </Drawer>
  );
}
