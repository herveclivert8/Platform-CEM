import { useState } from "react";
import { Drawer } from "./Drawer";
import { Button } from "../ui/Button";
import { useBranches } from "../../hooks/useBranches";
import { useAdminCreateSubmission } from "../../hooks/useAdminSubmissions";
import { useTranslation } from "react-i18next";
import { useSuccessToast } from "../../hooks/useSuccessToast";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

interface SubmissionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined when the Super Admin is scoped to "all branches": the form then asks for one. */
  branchId: number | undefined;
}

export function SubmissionDrawer({ open, onClose, branchId }: SubmissionDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer open={open} onClose={onClose} title={t("admin.submissions.drawer_title")}>
      {/* Remounted on each opening so the form always starts empty. */}
      {open && <SubmissionForm branchId={branchId} onDone={onClose} />}
    </Drawer>
  );
}

function SubmissionForm({ branchId, onDone }: { branchId: number | undefined; onDone: () => void }) {
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [chosenBranchId, setChosenBranchId] = useState<number | undefined>(undefined);
  const { data: branchesData } = useBranches({ includeInactive: true });
  const needsBranchChoice = branchId === undefined;
  const targetBranchId = needsBranchChoice ? chosenBranchId : branchId;
  const createSubmission = useAdminCreateSubmission(targetBranchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetBranchId === undefined) return;
    try {
      await createSubmission.mutateAsync({ applicantName, email, projectSummary });
    } catch {
      return; // affiché sous le formulaire
    }
    showSuccess(t("admin.feedback.submission_created"), applicantName);
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t("admin.submissions.drawer_intro")}
      </p>

      {needsBranchChoice && (
        <select
          required
          value={chosenBranchId ?? ""}
          onChange={(e) => setChosenBranchId(e.target.value ? Number(e.target.value) : undefined)}
          className={inputClass}
        >
          <option value="">{t("admin.submissions.branch_placeholder")}</option>
          {branchesData?.items.map((b) => (
            <option key={b.id} value={b.id}>
              {b.cityName}
            </option>
          ))}
        </select>
      )}
      <input
        required
        placeholder={t("admin.submissions.applicant_placeholder")}
        value={applicantName}
        onChange={(e) => setApplicantName(e.target.value)}
        className={inputClass}
      />
      <input
        required
        type="email"
        placeholder={t("auth.email")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <textarea
        required
        rows={5}
        placeholder={t("admin.submissions.summary_placeholder")}
        value={projectSummary}
        onChange={(e) => setProjectSummary(e.target.value)}
        className={`${inputClass} resize-none`}
      />

      {createSubmission.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("admin.submissions.save_error")}
        </p>
      )}

      <Button
        type="submit"
        variant="secondary"
        className="w-full justify-center"
        disabled={createSubmission.isPending || targetBranchId === undefined}
      >
        {createSubmission.isPending ? "…" : t("admin.submissions.add")}
      </Button>
    </form>
  );
}
