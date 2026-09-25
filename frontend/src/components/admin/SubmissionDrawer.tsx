import { useState } from "react";
import { Drawer } from "./Drawer";
import { Button } from "../ui/Button";
import { useBranches } from "../../hooks/useBranches";
import { useAdminCreateSubmission } from "../../hooks/useAdminSubmissions";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

interface SubmissionDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Undefined when the Super Admin is scoped to "all branches": the form then asks for one. */
  branchId: number | undefined;
}

export function SubmissionDrawer({ open, onClose, branchId }: SubmissionDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title="Nouveau dossier">
      {/* Remounted on each opening so the form always starts empty. */}
      {open && <SubmissionForm branchId={branchId} onDone={onClose} />}
    </Drawer>
  );
}

function SubmissionForm({ branchId, onDone }: { branchId: number | undefined; onDone: () => void }) {
  const [applicantName, setApplicantName] = useState("");
  const [email, setEmail] = useState("");
  const [projectSummary, setProjectSummary] = useState("");
  const [chosenBranchId, setChosenBranchId] = useState<number | undefined>(undefined);
  const { data: branchesData } = useBranches();
  const needsBranchChoice = branchId === undefined;
  const targetBranchId = needsBranchChoice ? chosenBranchId : branchId;
  const createSubmission = useAdminCreateSubmission(targetBranchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (targetBranchId === undefined) return;
    await createSubmission.mutateAsync({ applicantName, email, projectSummary });
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Enregistrez un dossier reçu hors du site (email, téléphone, rendez-vous…).
      </p>

      {needsBranchChoice && (
        <select
          required
          value={chosenBranchId ?? ""}
          onChange={(e) => setChosenBranchId(e.target.value ? Number(e.target.value) : undefined)}
          className={inputClass}
        >
          <option value="">Antenne concernée…</option>
          {branchesData?.items.map((b) => (
            <option key={b.id} value={b.id}>
              {b.cityName}
            </option>
          ))}
        </select>
      )}
      <input
        required
        placeholder="Nom complet du porteur de projet"
        value={applicantName}
        onChange={(e) => setApplicantName(e.target.value)}
        className={inputClass}
      />
      <input
        required
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <textarea
        required
        rows={5}
        placeholder="Résumé du projet"
        value={projectSummary}
        onChange={(e) => setProjectSummary(e.target.value)}
        className={`${inputClass} resize-none`}
      />

      {createSubmission.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Une erreur est survenue lors de l'enregistrement. Vérifiez l'email et réessayez.
        </p>
      )}

      <Button
        type="submit"
        variant="secondary"
        className="w-full justify-center"
        disabled={createSubmission.isPending || targetBranchId === undefined}
      >
        {createSubmission.isPending ? "…" : "Ajouter le dossier"}
      </Button>
    </form>
  );
}
