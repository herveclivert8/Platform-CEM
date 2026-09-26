import { useState } from "react";
import { Mail, MailCheck, Plus, Search, StickyNote, Trash2, User } from "lucide-react";
import clsx from "clsx";
import { Card, IconBadge } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Pagination } from "../../components/ui/Pagination";
import { SubmissionDrawer } from "../../components/admin/SubmissionDrawer";
import { useAdminSubmissions, useDeleteSubmission, useUpdateSubmission } from "../../hooks/useAdminSubmissions";
import { useScopedBranchId } from "../../hooks/useAdminScope";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import {
  SUBMISSION_STATUSES,
  type ProjectSubmission,
  type SubmissionStatus,
} from "../../types/submission";
import { useTranslation } from "react-i18next";
import { dateLocale } from "../../lib/locale";

const STATUS_TONES: Record<SubmissionStatus, string> = {
  RECEIVED: "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300",
  IN_REVIEW: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  ACCEPTED: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  REJECTED: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

const STATUSES = SUBMISSION_STATUSES;

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" });
}

function SubmissionCard({ submission }: { submission: ProjectSubmission }) {
  const { t } = useTranslation();
  const updateSubmission = useUpdateSubmission();
  const deleteSubmission = useDeleteSubmission();
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(submission.internalNotes ?? "");

  const saveNotes = () =>
    updateSubmission.mutate(
      { submission, internalNotes: notes },
      { onSuccess: () => setNotesOpen(false) },
    );

  return (
    <Card hoverable={false} className="p-5">
      <div className="flex items-start gap-3">
        <IconBadge icon={<User className="h-4 w-4" aria-hidden />} tone="orange" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{submission.applicantName}</p>
            <select
              value={submission.status}
              onChange={(e) => updateSubmission.mutate({ submission, status: e.target.value as SubmissionStatus })}
              disabled={updateSubmission.isPending}
              aria-label={t("admin.submissions.status_label")}
              className={clsx(
                "rounded-full border-0 px-2.5 py-0.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-emerald-500/30",
                STATUS_TONES[submission.status],
              )}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`admin.submissions.status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          <a
            href={`mailto:${submission.email}`}
            className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
          >
            <Mail className="h-3 w-3" /> {submission.email}
          </a>
          <p className="mt-2.5 whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{submission.projectSummary}</p>

          {notesOpen ? (
            <div className="mt-3 space-y-2">
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("admin.submissions.notes_placeholder")}
                className={clsx(fieldClass, "w-full resize-y")}
              />
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={saveNotes} disabled={updateSubmission.isPending}>
                  {t("common.save")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNotes(submission.internalNotes ?? "");
                    setNotesOpen(false);
                  }}
                >
                  {t("common.cancel")}
                </Button>
              </div>
            </div>
          ) : submission.internalNotes ? (
            <button
              type="button"
              onClick={() => setNotesOpen(true)}
              className="mt-3 block w-full rounded-lg bg-amber-50/70 px-3 py-2 text-left text-xs text-amber-900 hover:bg-amber-50 dark:bg-amber-500/5 dark:text-amber-200"
            >
              <span className="font-semibold">{t("admin.submissions.notes")}</span> <span className="whitespace-pre-line">{submission.internalNotes}</span>
            </button>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
            <span>{t("admin.submissions.received_on", { date: formatDate(submission.createdAt) })}</span>
            {submission.acknowledgmentSentAt && (
              <span className="inline-flex items-center gap-1">
                <MailCheck className="h-3 w-3" /> {t("admin.submissions.ack_sent")}
              </span>
            )}
            {!notesOpen && !submission.internalNotes && (
              <button
                type="button"
                onClick={() => setNotesOpen(true)}
                className="inline-flex items-center gap-1 font-medium hover:text-slate-700 dark:hover:text-slate-300"
              >
                <StickyNote className="h-3 w-3" /> {t("admin.submissions.add_note")}
              </button>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() =>
            window.confirm(t("admin.submissions.delete_confirm", { name: submission.applicantName })) && deleteSubmission.mutate(submission)
          }
          disabled={deleteSubmission.isPending}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          aria-label={t("common.delete")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

export function SubmissionsPage() {
  const { t } = useTranslation();
  const targetBranchId = useScopedBranchId();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<SubmissionStatus | "">("");
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading } = useAdminSubmissions({ page, status, q });

  const hasFilters = Boolean(status || q.trim());

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.submissions.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("admin.submissions.subtitle")}
          </p>
        </div>
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setDrawerOpen(true)}>
          {t("admin.submissions.new")}
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin.submissions.search")}
            className={clsx(fieldClass, "w-full pl-9")}
          />
        </label>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SubmissionStatus | "");
            setPage(1);
          }}
          aria-label={t("admin.submissions.filter_status")}
          className={fieldClass}
        >
          <option value="">{t("admin.submissions.all_statuses")}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`admin.submissions.status.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
          {hasFilters ? t("admin.submissions.none_match") : t("admin.submissions.none")}
        </p>
      ) : (
        <>
          <div className="mt-6 space-y-3">
            {data.items.map((s) => (
              <SubmissionCard key={s.id} submission={s} />
            ))}
          </div>
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={setPage}
            itemLabel={t("admin.submissions.count_label")}
          />
        </>
      )}

      <SubmissionDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} branchId={targetBranchId} />
    </div>
  );
}
