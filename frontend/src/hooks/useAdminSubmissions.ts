import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  mapProjectSubmission,
  type ProjectSubmission,
  type ProjectSubmissionDto,
} from "../types/submission";
import type { PaginatedDto } from "../types/post";
import { useAdminScopeStore } from "../store/adminScopeStore";
import { useAuthStore } from "../store/authStore";
import { useBranches } from "./useBranches";

export function useAdminSubmissions() {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  const { data: branchesData } = useBranches();

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
