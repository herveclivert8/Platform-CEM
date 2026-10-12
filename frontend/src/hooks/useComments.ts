import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapProjectComment, type ProjectComment, type ProjectCommentDto } from "../types/membership";

/** Discussion under a published project: approved members with this month's fee paid, and admins. */
export function useProjectComments(projectId: number, enabled: boolean) {
  return useQuery<ProjectComment[]>({
    queryKey: ["project-comments", projectId],
    queryFn: async () => {
      const { data } = await api.get<ProjectCommentDto[]>(`/projects/${projectId}/comments`);
      return data.map(mapProjectComment);
    },
    enabled,
  });
}

export function useAddComment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ body, parentId }: { body: string; parentId?: number }) => {
      const { data } = await api.post<ProjectCommentDto>(`/projects/${projectId}/comments`, {
        body,
        parent_id: parentId ?? null,
      });
      return mapProjectComment(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] }),
  });
}

export function useDeleteComment(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (commentId: number) => api.delete(`/projects/${projectId}/comments/${commentId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-comments", projectId] }),
  });
}
