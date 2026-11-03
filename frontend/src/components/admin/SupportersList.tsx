import { useState } from "react";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { Check, KeyRound, Mail, Phone, RotateCcw, Search, ShieldOff, Trash2, UserCheck } from "lucide-react";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Skeleton } from "../ui/Skeleton";
import { Pagination } from "../ui/Pagination";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { QueryError } from "../ui/QueryError";
import {
  useAcceptSupporterContact,
  useDeleteSupporterContact,
  useSetSupporterAccess,
  useSupporterContacts,
  useUpdateSupporterContact,
  type SupporterContact,
  type SupporterContactStatus,
} from "../../hooks/useSupporterContacts";
import type { SupporterKind } from "../../config/membershipTypes";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import { dateLocale } from "../../lib/locale";
import { apiErrorMessage } from "../../lib/api";

const TABS: (SupporterContactStatus | undefined)[] = ["NEW", "CONTACTED", "ACCEPTED", undefined];

const STATUS_TONES: Record<SupporterContactStatus, string> = {
  NEW: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  CONTACTED: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  ACCEPTED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
};

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

/** Split « Rakoto Jean » into a first name guess and a last name, to be corrected by the Super Admin. */
function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return parts.length < 2 ? { firstName: parts[0] ?? "", lastName: "" } : { firstName: parts.slice(1).join(" "), lastName: parts[0] };
}

interface CreatedAccount {
  fullName: string;
  email: string;
  temporaryPassword: string;
  welcomeEmailSent: boolean;
}

/** Accept the membership of a benefactor / sponsor: creates their account (ongoing projects, read only). */
function AcceptPanel({ contact, onClose, onAccepted }: { contact: SupporterContact; onClose: () => void; onAccepted: (account: CreatedAccount) => void }) {
  const { t } = useTranslation();
  const accept = useAcceptSupporterContact();
  const [names, setNames] = useState(() => splitName(contact.fullName));

  return (
    <form
      className="mt-3 space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"
      onSubmit={(e) => {
        e.preventDefault();
        accept.mutate(
          { id: contact.id, firstName: names.firstName.trim(), lastName: names.lastName.trim() },
          { onSuccess: (result) => onAccepted({ fullName: contact.fullName, email: contact.email, ...result }) },
        );
      }}
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{t("admin.supporters.accept_text")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required aria-label={t("admin.supporters.last_name")} placeholder={t("admin.supporters.last_name")} value={names.lastName}
          onChange={(e) => setNames((n) => ({ ...n, lastName: e.target.value }))} className={inputClass} />
        <input required aria-label={t("admin.supporters.first_name")} placeholder={t("admin.supporters.first_name")} value={names.firstName}
          onChange={(e) => setNames((n) => ({ ...n, firstName: e.target.value }))} className={inputClass} />
      </div>
      {accept.isError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{apiErrorMessage(accept.error, t("common.error_retry"))}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" size="sm" icon={<UserCheck className="h-4 w-4" />} disabled={accept.isPending}>
          {accept.isPending ? "…" : t("admin.supporters.accept_confirm")}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={accept.isPending}>{t("common.cancel")}</Button>
      </div>
    </form>
  );
}

const iconButton =
  "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors dark:text-slate-400";

/**
 * Super Admin, « Membres » page: benefactors or sponsors who left their details. Confidential,
 * never shown to members nor to branch admins.
 */
export function SupportersList({ kind }: { kind: SupporterKind }) {
  const { t } = useTranslation();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [status, setStatus] = useState<SupporterContactStatus | undefined>("NEW");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading, isError, error, refetch } = useSupporterContacts({ page, kind, status, q });
  const updateContact = useUpdateSupporterContact();
  const deleteContact = useDeleteSupporterContact();
  const setAccess = useSetSupporterAccess();
  const [accepting, setAccepting] = useState<number | null>(null);
  // Shown once above the list: the accepted record leaves the « à contacter » tab
  const [created, setCreated] = useState<CreatedAccount | null>(null);
  const [deleting, setDeleting] = useState<SupporterContact | undefined>(undefined);

  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">{t("admin.supporters.subtitle")}</p>

      {created && (
        <Card hoverable={false} className="mt-5 space-y-2 border-emerald-300 p-4 dark:border-emerald-500/40">
          <p className="font-semibold text-slate-900 dark:text-white">{t("admin.supporters.created_title", { name: created.fullName })}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("admin.supporters.temp_password_hint", { email: created.email })}</p>
          <p className="w-fit rounded-lg border border-slate-200 bg-white px-4 py-2 font-mono text-sm text-emerald-700 dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400">
            {created.temporaryPassword}
          </p>
          {!created.welcomeEmailSent && <p className="text-xs text-slate-500 dark:text-slate-400">{t("admin.accounts.welcome_not_sent")}</p>}
          <Button type="button" variant="ghost" size="sm" onClick={() => setCreated(null)}>{t("admin.supporters.done")}</Button>
        </Card>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
            {TABS.map((tab) => (
              <button
                key={tab ?? "all"}
                type="button"
                onClick={() => {
                  setStatus(tab);
                  setPage(1);
                }}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  status === tab
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
                )}
              >
                {t(tab ? `admin.supporters.status_${tab.toLowerCase()}` : "admin.supporters.all")}
                {tab && data && data.counts[tab] > 0 && (
                  <span className="rounded-full bg-slate-200 px-1.5 text-[11px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                    {data.counts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin.supporters.search")}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : isError ? (
        <QueryError error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">{t("admin.supporters.empty")}</p>
      ) : (
        <>
          <div className="mt-6 space-y-2.5">
            {data.items.map((c) => {
              const accepted = c.status === "ACCEPTED";
              const next: SupporterContactStatus = c.status === "NEW" ? "CONTACTED" : "NEW";
              const toggleLabel = t(next === "CONTACTED" ? "admin.supporters.mark_contacted" : "admin.supporters.mark_new");
              return (
                <Card key={c.id} hoverable={false} className="p-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white">{c.fullName}</p>
                    <span className={clsx("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_TONES[c.status])}>
                      {t(`admin.supporters.status_${c.status.toLowerCase()}`)}
                    </span>
                    {accepted && !c.hasAccountAccess && (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        {t("admin.supporters.access_removed")}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {accepted && c.acceptedAt
                        ? t("admin.supporters.accepted_on", { date: date(c.acceptedAt) })
                        : t("admin.supporters.received", { date: date(c.createdAt) })}
                    </span>
                    {accepted ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={c.hasAccountAccess ? <ShieldOff className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
                        disabled={setAccess.isPending}
                        onClick={() =>
                          setAccess.mutate(
                            { id: c.id, active: !c.hasAccountAccess },
                            { onError: showError, onSuccess: () => showSuccess(t("admin.supporters.updated")) },
                          )
                        }
                      >
                        {t(c.hasAccountAccess ? "admin.supporters.remove_access" : "admin.supporters.restore_access")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon={<UserCheck className="h-4 w-4" />}
                        onClick={() => setAccepting(accepting === c.id ? null : c.id)}
                        aria-expanded={accepting === c.id}
                      >
                        {t("admin.supporters.accept")}
                      </Button>
                    )}
                    {!accepted && (
                    <button
                      type="button"
                      title={toggleLabel}
                      aria-label={toggleLabel}
                      disabled={updateContact.isPending}
                      onClick={() =>
                        updateContact.mutate(
                          { id: c.id, status: next },
                          { onError: showError, onSuccess: () => showSuccess(t("admin.supporters.updated")) },
                        )
                      }
                      className={clsx(iconButton, "hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400")}
                    >
                      {next === "CONTACTED" ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                    </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleting(c)}
                      aria-label={t("common.delete")}
                      className={clsx(iconButton, "hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400">
                      <Mail className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {c.email}
                    </a>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 hover:text-emerald-700 dark:hover:text-emerald-400">
                        <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden /> {c.phone}
                      </a>
                    )}
                  </div>
                  {c.message && <p className="mt-2 whitespace-pre-line text-sm text-slate-500 dark:text-slate-400">{c.message}</p>}
                  {accepting === c.id && (
                    <AcceptPanel
                      contact={c}
                      onClose={() => setAccepting(null)}
                      onAccepted={(account) => {
                        setAccepting(null);
                        setCreated(account);
                      }}
                    />
                  )}
                </Card>
              );
            })}
          </div>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        title={t("common.delete")}
        message={t("admin.supporters.delete_confirm", { name: deleting?.fullName ?? "" })}
        confirmLabel={t("common.delete")}
        onConfirm={() => {
          if (deleting) deleteContact.mutate(deleting.id, { onError: showError, onSuccess: () => showSuccess(t("admin.supporters.deleted")) });
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      />
    </div>
  );
}
