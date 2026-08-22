import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  mapProjectSubmission,
  type ProjectSubmission,
  type ProjectSubmissionDto,
  type ProjectSubmissionInput,
} from "../types/submission";

export function useCreateSubmission(branchId: number | undefined) {
  return useMutation<ProjectSubmission, unknown, ProjectSubmissionInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<ProjectSubmissionDto>(
        `/branches/${branchId}/submissions`,
        {
          applicant_name: input.applicantName,
          email: input.email,
          project_summary: input.projectSummary,
        },
      );
      return mapProjectSubmission(data);
    },
  });
}
