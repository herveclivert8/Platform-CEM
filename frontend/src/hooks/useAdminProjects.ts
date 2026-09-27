import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaginated } from "../types/post";
import {
  mapProject,
  type ProjectAdminListDto,
  type ProjectDto,
  type ProjectInput,
  type ProjectPhase,
  type ProjectReviewStatus,
} from "../types/project";
import { useAdminScopeStore } from "../store/adminScopeStore";
import { useAuthStore } from "../store/authStore";

interface AdminProjectsParams {
  reviewStatus?: ProjectReviewStatus;
  phase?: ProjectPhase;
}

/**
 * Admin listing, all review statuses, with per-status counts. The API already scopes a
 * Branch Admin to their own branch; for a Super Admin we pass the back-office scope.
 */
export function useAdminProjects({ reviewStatus, phase }: AdminProjectsParams = {}) {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  const branchId = user?.role === "SUPER_ADMIN" && selectedBranchId !== "all" ? selectedBranchId : undefined;

  return useQuery({
    queryKey: ["admin-projects", branchId, reviewStatus, phase],
    queryFn: async () => {
      const { data } = await api.get<ProjectAdminListDto>("/projects/admin", {
        params: { branch_id: branchId, review_status: reviewStatus, phase, page_size: 100 },
      });
      return { ...mapPaginated(data, mapProject), counts: data.counts };
    },
    enabled: !!user,
  });
}

export function useAdminProject(projectId: number | undefined) {
  return useQuery({
    queryKey: ["admin-project", projectId],
    queryFn: async () => {
      const { data } = await api.get<ProjectDto>(`/projects/admin/${projectId}`);
      return mapProject(data);
    },
    enabled: projectId !== undefined,
    retry: false,
  });
}

/** Every cache that shows projects: back-office lists and the public pages. */
export function invalidateProjectQueries(queryClient: QueryClient) {
  for (const key of ["admin-projects", "admin-project", "projects", "project"]) {
    queryClient.invalidateQueries({ queryKey: [key] });
  }
}

function useProjectMutation<TVars, TResult>(mutationFn: (vars: TVars) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => invalidateProjectQueries(queryClient),
  });
}

export function useCreateProject() {
  return useProjectMutation(async (input: ProjectInput) => {
    const { data } = await api.post<ProjectDto>("/projects", input);
    return mapProject(data);
  });
}

export function useUpdateProject(projectId: number | undefined) {
  return useProjectMutation(async (input: Partial<ProjectInput>) => {
    const { data } = await api.put<ProjectDto>(`/projects/${projectId}`, input);
    return mapProject(data);
  });
}

/** Show / hide a project on the platform (no new validation needed). */
export function useSetProjectVisibility() {
  return useProjectMutation(async ({ projectId, isVisible }: { projectId: number; isVisible: boolean }) => {
    const { data } = await api.put<ProjectDto>(`/projects/${projectId}`, { is_visible: isVisible });
    return mapProject(data);
  });
}

export function useDeleteProject() {
  return useProjectMutation(async (projectId: number) => {
    await api.delete(`/projects/${projectId}`);
  });
}

export function useApproveProject() {
  return useProjectMutation(async (projectId: number) => {
    const { data } = await api.post<ProjectDto>(`/projects/${projectId}/approve`);
    return mapProject(data);
  });
}

export function useRejectProject() {
  return useProjectMutation(async ({ projectId, reason }: { projectId: number; reason: string }) => {
    const { data } = await api.post<ProjectDto>(`/projects/${projectId}/reject`, { reason });
    return mapProject(data);
  });
}
