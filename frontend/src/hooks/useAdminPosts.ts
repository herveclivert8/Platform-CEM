import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaginated, mapPost, type Paginated, type PaginatedDto, type Post, type PostDto } from "../types/post";
import { useScopedBranchId } from "./useAdminScope";

export interface PostInput {
  title: string;
  content: string;
  pillar: string;
  status: string;
  images: string[];
}

export interface AdminPostFilters {
  page: number;
  status?: string;
  pillar?: string;
  q?: string;
}

/** Admin listing (drafts included), filtered and paginated server-side, in the current scope. */
export function useAdminPosts(filters: AdminPostFilters = { page: 1 }) {
  const branchId = useScopedBranchId();

  return useQuery<Paginated<Post>>({
    queryKey: ["admin-posts", branchId ?? "all", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<PostDto>>("/posts/admin", {
        params: {
          branch_id: branchId,
          page: filters.page,
          page_size: 20,
          status: filters.status || undefined,
          pillar: filters.pillar || undefined,
          q: filters.q?.trim() || undefined,
        },
      });
      return mapPaginated(data, mapPost);
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreatePost(branchId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PostInput) => {
      const { data } = await api.post<PostDto>(`/branches/${branchId}/posts`, input);
      return mapPost(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useUpdatePost(postId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PostInput>) => {
      const { data } = await api.put<PostDto>(`/posts/${postId}`, input);
      return mapPost(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (postId: number) => {
      await api.delete(`/posts/${postId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
    },
  });
}
