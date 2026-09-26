import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  mapProjectSubmission,
  type ProjectSubmission,
  type ProjectSubmissionDto,
  type ProjectSubmissionInput,
} from "../types/submission";
import type { PaginatedDto } from "../types/post";
import { useAdminScopeStore } from "../store/adminScopeStore";
import { useAuthStore } from "../store/authStore";
import { useAdminBranchList } from "./useBranches";

export function useAdminSubmissions() {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  const { data: branchesData } = useAdminBranchList();

  const targetBranchIds =
    user?.role === "SUPER_ADMIN"
      ? selectedBranchId === "all"
        ? (branchesData?.items ?? []).map((b) => b.id)
        : [selectedBranchId]
      : user?.branchId
        ? [user.branchId]
        : [];

  return useQuery<ProjectSubmission[]>({
    queryKey: ["admin-submissions", targetBranchIds],
    queryFn: async () => {
      const results = await Promise.all(
        targetBranchIds.map((branchId) =>
          api.get<PaginatedDto<ProjectSubmissionDto>>(`/branches/${branchId}/submissions`, {
            params: { page: 1, page_size: 50 },
          }),
        ),
      );
      return results
        .flatMap((r) => r.data.items)
        .map(mapProjectSubmission)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    enabled: targetBranchIds.length > 0,
  });
}

/** Admin-side entry of a dossier received outside the site (phone, email, in person). */
export function useAdminCreateSubmission(branchId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation<ProjectSubmission, unknown, ProjectSubmissionInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<ProjectSubmissionDto>(`/branches/${branchId}/submissions`, {
        applicant_name: input.applicantName,
        email: input.email,
        project_summary: input.projectSummary,
      });
      return mapProjectSubmission(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-submissions"] }),
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
