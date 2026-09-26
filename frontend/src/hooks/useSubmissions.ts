import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ProjectSubmissionInput } from "../types/submission";

/** Public dossier submission; the backend only returns a receipt (id + date). */
export function useCreateSubmission(branchId: number | undefined) {
  return useMutation<{ id: number; created_at: string }, unknown, ProjectSubmissionInput>({
    mutationFn: async (input) => {
      const { data } = await api.post(`/branches/${branchId}/submissions`, {
        applicant_name: input.applicantName,
        email: input.email,
        project_summary: input.projectSummary,
        website: input.website || null,
      });
      return data;
    },
  });
}
