import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Banknote, Check, RotateCcw, Search, X } from "lucide-react";
import clsx from "clsx";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { RejectDialog } from "../../components/admin/RejectDialog";
import { CashPaymentDialog } from "../../components/admin/CashPaymentDialog";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useSuccessToast } from "../../hooks/useSuccessToast";
import {
  useAdminMembers,
  useAdminMembershipPayments,
  useApproveMember,
  useReactivateMember,
  useConfirmMembershipPayment,
  useRejectMember,
  useRejectMembershipPayment,
} from "../../hooks/useMembership";
import { OPERATOR_LABELS, formatAmount, formatDateTime, formatMgPhone } from "../../types/donation";
import { formatDay, type AdminMember, type AdminMembershipPayment, type MembershipPaymentStatus } from "../../types/membership";
import type { MembershipStatus } from "../../types/user";

type Tab = "payments" | "members";

const PAYMENT_TONES: Record<MembershipPaymentStatus, "orange" | "emerald" | "slate"> = {
  PENDING: "orange",
  CONFIRMED: "emerald",
  REJECTED: "slate",
};
const MEMBER_TONES: Record<MembershipStatus, "orange" | "emerald" | "slate"> = {
  PENDING: "orange",
  ACTIVE: "emerald",
  REJECTED: "slate",
  SUSPENDED: "orange",
};

function FilterTabs<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
            o.value === value
              ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function PaymentsTab() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<MembershipPaymentStatus | "ALL">("PENDING");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminMembershipPayments(status === "ALL" ? undefined : status, page);
  const confirm = useConfirmMembershipPayment();
  const reject = useRejectMembershipPayment();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [rejecting, setRejecting] = useState<AdminMembershipPayment | null>(null);

  const method = (p: AdminMembershipPayment) =>
    p.paymentMethod === "MOBILE_MONEY" && p.mobileOperator ? OPERATOR_LABELS[p.mobileOperator] : t(`membership.methods.${p.paymentMethod}`);

  return (
    <>
      <FilterTabs
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        options={(["PENDING", "CONFIRMED", "REJECTED", "ALL"] as const).map((v) => ({
          value: v,
          label: v === "ALL" ? t("admin.members.filter_all") : t(`membership.payment_status.${v}`),
        }))}
      />
      {isLoading ? (
        <Skeleton className="mt-5 h-40 w-full" />
      ) : !data?.items.length ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t("admin.members.no_payments")}</p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {data.items.map((p) => (
            <Card key={p.id} hoverable={false} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{p.memberName}</p>
                  <Badge tone={PAYMENT_TONES[p.status]}>{t(`membership.payment_status.${p.status}`)}</Badge>
                  {p.branchName && <Badge>{p.branchName}</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                  {t(`membership.kinds.${p.kind}`)} · <strong>{formatAmount(p.amount, p.currency)}</strong> · {method(p)}
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {p.memberEmail} · {formatDateTime(p.createdAt)}
                  {p.senderPhone && ` · ${formatMgPhone(p.senderPhone)}`}
                  {p.transactionReference && ` · ${t("admin.members.reference")} ${p.transactionReference}`}
                </p>
                {p.rejectionReason && <p className="text-xs text-red-600 dark:text-red-400">{p.rejectionReason}</p>}
              </div>
              {p.status === "PENDING" && (
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check className="h-4 w-4" />}
                    disabled={confirm.isPending}
                    onClick={() =>
                      confirm.mutate(p.id, {
                        onSuccess: () => showSuccess(t("admin.members.payment_confirmed"), p.memberName),
                        onError: showError,
                      })
                    }
                  >
                    {t("admin.members.confirm_payment")}
                  </Button>
                  <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(p)}>
                    {t("admin.members.reject")}
                  </Button>
                </div>
              )}
            </Card>
          ))}
          <Pagination page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </div>
      )}
      <RejectDialog
        open={rejecting !== null}
        projectTitle=""
        title={t("admin.members.reject_payment_title", { name: rejecting?.memberName ?? "" })}
        text={t("admin.members.reject_payment_text")}
        isPending={reject.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) =>
          rejecting &&
          reject.mutate(
            { paymentId: rejecting.id, reason },
            { onSuccess: () => setRejecting(null), onError: showError },
          )
        }
      />
    </>
  );
}

function MembersTab() {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<MembershipStatus | "ALL">("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebouncedValue(search);
  const { data, isLoading } = useAdminMembers({ page, status: status === "ALL" ? undefined : status, q });
  const approve = useApproveMember();
  const reactivate = useReactivateMember();
  const today = new Date().toISOString().slice(0, 10);
  const reject = useRejectMember();
  const showError = useErrorToast();
  const showSuccess = useSuccessToast();
  const [rejecting, setRejecting] = useState<AdminMember | null>(null);
  const [cashFor, setCashFor] = useState<AdminMember | null>(null);
  const closeCash = useCallback(() => setCashFor(null), []);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={(["PENDING", "ACTIVE", "SUSPENDED", "REJECTED", "ALL"] as const).map((v) => ({
            value: v,
            label: v === "ALL" ? t("admin.members.filter_all") : t(`member.status.${v}`),
          }))}
        />
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin.members.search")}
            aria-label={t("admin.members.search")}
            className="w-64 max-w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>
      </div>
      {isLoading ? (
        <Skeleton className="mt-5 h-40 w-full" />
      ) : !data?.items.length ? (
        <p className="mt-6 text-sm text-slate-500 dark:text-slate-400">{t("admin.members.no_members")}</p>
      ) : (
        <div className="mt-5 space-y-2.5">
          {data.items.map((m) => (
            <Card key={m.id} hoverable={false} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {m.firstName} {m.lastName}
                  </p>
                  <Badge tone={MEMBER_TONES[m.membershipStatus]}>{t(`member.status.${m.membershipStatus}`)}</Badge>
                  {m.branchName && <Badge>{m.branchName}</Badge>}
                  <Badge tone={m.registrationPaid ? "emerald" : "orange"}>
                    {t(m.registrationPaid ? "admin.members.registration_paid" : "admin.members.registration_unpaid")}
                  </Badge>
                  {(m.membershipStatus === "ACTIVE" || m.membershipStatus === "SUSPENDED") && (
                    <Badge tone={m.paidUntil && m.paidUntil >= today ? "emerald" : "orange"}>
                      {m.paidUntil && m.paidUntil >= today
                        ? t("member.paid_until", { date: formatDay(m.paidUntil, i18n.language) })
                        : t("member.dues_unpaid")}
                    </Badge>
                  )}
                  {m.pendingPayments > 0 && (
                    <Badge tone="orange">{t("admin.members.pending_payments", { count: m.pendingPayments })}</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  {m.email}
                  {m.phone && ` · ${m.phone}`} · {t("admin.members.registered_on", { date: formatDateTime(m.createdAt) })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.membershipStatus !== "REJECTED" && (!m.registrationPaid || m.membershipStatus === "ACTIVE" || m.membershipStatus === "SUSPENDED") && (
                  <Button variant="ghost" size="sm" icon={<Banknote className="h-4 w-4" />} onClick={() => setCashFor(m)}>
                    {t("admin.members.record_cash")}
                  </Button>
                )}
                {m.membershipStatus === "SUSPENDED" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RotateCcw className="h-4 w-4" />}
                    disabled={!m.paidUntil || m.paidUntil < today || reactivate.isPending}
                    title={m.paidUntil && m.paidUntil >= today ? undefined : t("admin.members.reactivate_needs_fee")}
                    onClick={() =>
                      reactivate.mutate(m.id, {
                        onSuccess: () => showSuccess(t("admin.members.member_reactivated"), `${m.firstName} ${m.lastName}`),
                        onError: showError,
                      })
                    }
                  >
                    {t("admin.members.reactivate")}
                  </Button>
                )}
                {m.membershipStatus !== "ACTIVE" && m.membershipStatus !== "SUSPENDED" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check className="h-4 w-4" />}
                    disabled={!m.registrationPaid || approve.isPending}
                    title={m.registrationPaid ? undefined : t("admin.members.approve_needs_fee")}
                    onClick={() =>
                      approve.mutate(m.id, {
                        onSuccess: () => showSuccess(t("admin.members.member_approved"), `${m.firstName} ${m.lastName}`),
                        onError: showError,
                      })
                    }
                  >
                    {t("admin.members.approve")}
                  </Button>
                )}
                {m.membershipStatus !== "REJECTED" && (
                  <Button variant="ghost" size="sm" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(m)}>
                    {t("admin.members.reject")}
                  </Button>
                )}
              </div>
            </Card>
          ))}
          <Pagination page={page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} />
        </div>
      )}
      <RejectDialog
        open={rejecting !== null}
        projectTitle=""
        title={t("admin.members.reject_member_title", { name: rejecting ? `${rejecting.firstName} ${rejecting.lastName}` : "" })}
        text={t("admin.members.reject_member_text")}
        isPending={reject.isPending}
        onCancel={() => setRejecting(null)}
        onConfirm={(reason) =>
          rejecting &&
          reject.mutate({ memberId: rejecting.id, reason }, { onSuccess: () => setRejecting(null), onError: showError })
        }
      />
      <CashPaymentDialog member={cashFor} onClose={closeCash} />
    </>
  );
}

export function MembersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("payments");

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.members.title")}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.members.subtitle")}</p>

      <div className="mt-6 flex gap-1 border-b border-slate-200 dark:border-slate-800" role="tablist">
        {(["payments", "members"] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={clsx(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === key
                ? "border-emerald-600 text-emerald-700 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            {t(`admin.members.tab_${key}`)}
          </button>
        ))}
      </div>

      <div className="mt-5">{tab === "payments" ? <PaymentsTab /> : <MembersTab />}</div>
    </div>
  );
}
