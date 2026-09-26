import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  mapProjectSubmission,
  type ProjectSubmission,
  type ProjectSubmissionDto,
  type ProjectSubmissionInput,
  type SubmissionStatus,
} from "../types/submission";
import { mapPaginated, type Paginated, type PaginatedDto } from "../types/post";
import { useScopedBranchId } from "./useAdminScope";

export interface AdminSubmissionFilters {
  page: number;
  status?: string;
  q?: string;
}

/** Dossiers filtered and paginated server-side, in the current scope. */
export function useAdminSubmissions(filters: AdminSubmissionFilters = { page: 1 }) {
  const branchId = useScopedBranchId();

  return useQuery<Paginated<ProjectSubmission>>({
    queryKey: ["admin-submissions", branchId ?? "all", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<ProjectSubmissionDto>>("/submissions", {
        params: {
          branch_id: branchId,
          page: filters.page,
          page_size: 20,
          status: filters.status || undefined,
          q: filters.q?.trim() || undefined,
        },
      });
      return mapPaginated(data, mapProjectSubmission);
    },
    placeholderData: keepPreviousData,
  });
}

/** Follow-up of a dossier: status and internal notes. */
export function useUpdateSubmission() {
  const queryClient = useQueryClient();
  return useMutation<
    ProjectSubmission,
    unknown,
    { submission: ProjectSubmission; status?: SubmissionStatus; internalNotes?: string }
  >({
    mutationFn: async ({ submission, status, internalNotes }) => {
      const { data } = await api.patch<ProjectSubmissionDto>(
        `/branches/${submission.branchId}/submissions/${submission.id}`,
        { status, internal_notes: internalNotes },
      );
      return mapProjectSubmission(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

/** Admin-side entry of a dossier received outside the site (phone, email, in person). */
export function useAdminCreateSubmission(branchId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation<void, unknown, ProjectSubmissionInput>({
    mutationFn: async (input) => {
      await api.post(`/branches/${branchId}/submissions`, {
        applicant_name: input.applicantName,
        email: input.email,
        project_summary: input.projectSummary,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submission: ProjectSubmission) => {
      await api.delete(`/branches/${submission.branchId}/submissions/${submission.id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-submissions"] }),
  });
}
