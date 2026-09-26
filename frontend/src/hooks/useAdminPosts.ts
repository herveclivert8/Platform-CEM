import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPost, type PaginatedDto, type Post, type PostDto } from "../types/post";
import { useAdminScopeStore } from "../store/adminScopeStore";
import { useAuthStore } from "../store/authStore";
import { useAdminBranchList } from "./useBranches";

export interface PostInput {
  title: string;
  content: string;
  pillar: string;
  status: string;
  images: string[];
}

/** Admin listing (drafts included), respecting the current scope (one branch, or all for Super Admin). */
export function useAdminPosts() {
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

  return useQuery<Post[]>({
    queryKey: ["admin-posts", targetBranchIds],
    queryFn: async () => {
      const results = await Promise.all(
        targetBranchIds.map((branchId) =>
          api.get<PaginatedDto<PostDto>>(`/branches/${branchId}/posts/admin`, {
            params: { page: 1, page_size: 50 },
          }),
        ),
      );
      return results
        .flatMap((r) => r.data.items)
        .map(mapPost)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },
    enabled: targetBranchIds.length > 0,
  });
}

export function useCreatePost(branchId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostInput) => {
      const { data } = await api.post<PostDto>(`/branches/${branchId}/posts`, input);
      return mapPost(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });
}

export function useUpdatePost(postId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PostInput>) => {
      const { data } = await api.put<PostDto>(`/posts/${postId}`, input);
      return mapPost(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      await api.delete(`/posts/${postId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-posts"] }),
  });
}
