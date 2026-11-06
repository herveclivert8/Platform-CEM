import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Lock, Paperclip, X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { buttonClasses } from "../components/ui/buttonStyles";
import { useCurrentUser } from "../hooks/useAuth";
import {
  MAX_APPLICATION_FILE_BYTES,
  MAX_APPLICATION_FILES,
  useApplyItaly,
  useMyItalyApplication,
} from "../hooks/useOpportunities";
import { formatFileSize } from "../hooks/useProjectDocuments";
import { usePageMeta } from "../hooks/usePageMeta";
import { useAuthStore } from "../store/authStore";
import { isSupporter, type CurrentUser } from "../types/user";
import { apiErrorMessage } from "../lib/api";

const MAX_LINES = 5;
const LEVELS = ["M1", "M2", "OTHER"] as const;

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-100 disabled:text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-800/60";
const labelClass = "mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400";

/** Validated member of a branch, with a member number: the only ones who may apply. */
function isEligible(user: CurrentUser): boolean {
  return user.role === "MEMBER" && !isSupporter(user) && user.membershipStatus === "ACTIVE" && !!user.branchId && !!user.memberNumber;
}

function ApplicationForm({ user }: { user: CurrentUser }) {
  const { t, i18n } = useTranslation();
  const apply = useApplyItaly();
  const [lastName, setLastName] = useState(user.lastName);
  const [firstName, setFirstName] = useState(user.firstName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [email, setEmail] = useState(user.email);
  const [studyLevel, setStudyLevel] = useState("");
  const [faculty, setFaculty] = useState("");
  const [major, setMajor] = useState("");
  const [motivation, setMotivation] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  const addFiles = (picked: FileList | null) => {
    if (!picked?.length) return;
    const tooBig = Array.from(picked).find((file) => file.size > MAX_APPLICATION_FILE_BYTES);
    if (tooBig) {
      setFileError(t("opportunities.apply.file_too_big", { name: tooBig.name }));
      return;
    }
    const next = [...files, ...Array.from(picked)];
    if (next.length > MAX_APPLICATION_FILES) {
      setFileError(t("opportunities.apply.files_too_many", { count: MAX_APPLICATION_FILES }));
      return;
    }
    setFileError(null);
    setFiles(next);
  };

  const lines = motivation.split("\n").filter((line) => line.trim()).length;
  const tooLong = lines > MAX_LINES;

  if (apply.isSuccess) {
    return (
      <p role="status" className="flex items-start gap-2 text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        {t("opportunities.apply.sent")}
      </p>
    );
  }

  const field = (id: string, label: string, value: string, onChange: (v: string) => void, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={id} className={labelClass}>{label}</label>
      <input id={id} required value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} {...props} />
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (tooLong || !files.length) return;
        apply.mutate({ lastName, firstName, phone, email, studyLevel, faculty, major, motivation: motivation.trim(), files });
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      {field("apply-last-name", t("opportunities.apply.last_name"), lastName, setLastName, { maxLength: 255, autoComplete: "family-name" })}
      {field("apply-first-name", t("opportunities.apply.first_name"), firstName, setFirstName, { maxLength: 255, autoComplete: "given-name" })}
      {/* From the account: an application is always tied to the member who sends it */}
      {field("apply-number", t("opportunities.apply.member_number"), user.memberNumber ?? "", () => {}, { disabled: true, required: false })}
      {field("apply-phone", t("opportunities.apply.phone"), phone, setPhone, { type: "tel", maxLength: 50, autoComplete: "tel" })}
      <div className="sm:col-span-2">
        {field("apply-email", t("opportunities.apply.email"), email, setEmail, { type: "email", maxLength: 255, autoComplete: "email" })}
      </div>
      <div>
        <label htmlFor="apply-level" className={labelClass}>{t("opportunities.apply.study_level")}</label>
        <select id="apply-level" required value={studyLevel} onChange={(e) => setStudyLevel(e.target.value)} className={inputClass}>
          <option value="" disabled>{t("opportunities.apply.study_level_placeholder")}</option>
          {LEVELS.map((level) => (
            <option key={level} value={level}>{t(`opportunities.apply.levels.${level}`)}</option>
          ))}
        </select>
      </div>
      {field("apply-faculty", t("opportunities.apply.faculty"), faculty, setFaculty, { maxLength: 255 })}
      <div className="sm:col-span-2">
        {field("apply-major", t("opportunities.apply.major"), major, setMajor, { maxLength: 255 })}
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="apply-motivation" className={labelClass}>{t("opportunities.apply.motivation")}</label>
        <textarea
          id="apply-motivation"
          required
          rows={5}
          maxLength={800}
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          aria-invalid={tooLong}
          className={inputClass}
        />
        <p className={`mt-1.5 text-xs ${tooLong ? "text-red-600 dark:text-red-400" : "text-slate-400 dark:text-slate-500"}`}>
          {tooLong ? t("opportunities.apply.motivation_too_long") : t("opportunities.apply.motivation_hint", { lines })}
        </p>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="apply-dossier" className={labelClass}>{t("opportunities.apply.dossier")}</label>
        {files.length > 0 && (
          <ul className="mb-2 space-y-1.5">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                <Paperclip className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-slate-400">{formatFileSize(file.size, i18n.language)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFiles(files.filter((_, i) => i !== index));
                    setFileError(null);
                  }}
                  aria-label={t("opportunities.apply.file_remove", { name: file.name })}
                  className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
        {files.length < MAX_APPLICATION_FILES && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:border-emerald-400 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 dark:border-slate-700 dark:text-slate-300">
            <Paperclip className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">
              {t(files.length ? "opportunities.apply.file_add_more" : "opportunities.apply.file_add", { count: MAX_APPLICATION_FILES })}
            </span>
            <input
              id="apply-dossier"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              onChange={(e) => {
                addFiles(e.target.files);
                // Allow picking the same file again after removing it
                e.target.value = "";
              }}
              className="sr-only"
            />
          </label>
        )}
        {fileError && <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">{fileError}</p>}
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {t("opportunities.apply.dossier_hint")}
        </p>
      </div>

      {apply.isError && (
        <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
          {apiErrorMessage(apply.error, t("opportunities.apply.error"))}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={apply.isPending || tooLong || !files.length}>
          {apply.isPending ? t("opportunities.apply.sending") : t("opportunities.apply.submit")}
        </Button>
      </div>
    </form>
  );
}

/** « Postuler » (studies in Italy): sign-in, eligibility, then the application form. */
export function ItalyApplicationPage() {
  const { t, i18n } = useTranslation();
  usePageMeta(t("opportunities.apply.title"));
  const location = useLocation();
  // Fresh profile: membership approved (and member number given) since sign-in
  useCurrentUser();
  const user = useAuthStore((s) => (s.isAuthenticated ? s.user : null));
  const eligible = !!user && isEligible(user);
  const { data: existing, isLoading } = useMyItalyApplication(eligible);
  const open = existing && (existing.status === "NEW" || existing.status === "IN_REVIEW");

  const notice = (text: string, action?: React.ReactNode) => (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
        {text}
      </p>
      {action}
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:px-6 lg:pt-20">
      <Link to="/opportunites#italie" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400">
        <ArrowLeft className="h-4 w-4" aria-hidden /> {t("opportunities.apply.back")}
      </Link>
      <h1 className="mt-5 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">{t("opportunities.apply.title")}</h1>

      <div className="mt-8 border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        {!user
          ? notice(
              t("opportunities.apply.login_required"),
              <Link to="/login" state={{ from: location.pathname }} className={buttonClasses({ variant: "primary", size: "sm" })}>
                {t("opportunities.apply.login")}
              </Link>,
            )
          : !eligible
            ? notice(t("opportunities.apply.not_member"))
            : isLoading
              ? null
              : open
                ? notice(
                    t("opportunities.apply.already", {
                      date: new Date(existing.createdAt).toLocaleDateString(i18n.language, { day: "numeric", month: "long", year: "numeric" }),
                      status: t(`opportunities.status.${existing.status}`),
                    }),
                  )
                : <ApplicationForm user={user} />}
      </div>
    </div>
  );
}
