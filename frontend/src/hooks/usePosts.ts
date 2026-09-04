import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPost, mapPaginated, type PaginatedDto } from "../types/post";
import type { Pillar, PostDto } from "../types/post";

interface BranchPostsParams {
  page?: number;
  pageSize?: number;
  pillar?: Pillar;
}

export function useBranchPosts(branchId: number | undefined, params: BranchPostsParams = {}) {
  const { page = 1, pageSize = 20, pillar } = params;

  return useQuery({
    queryKey: ["branch-posts", branchId, page, pageSize, pillar],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<PostDto>>(`/branches/${branchId}/posts`, {
        params: { page, page_size: pageSize, pillar },
      });
      return mapPaginated(data, mapPost);
    },
    enabled: branchId !== undefined,
    staleTime: 30_000,
  });
}

export function usePost(postId: number | undefined) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: async () => {
      const { data } = await api.get<PostDto>(`/posts/${postId}`);
      return mapPost(data);
    },
    enabled: postId !== undefined,
    staleTime: 30_000,
  });
}
