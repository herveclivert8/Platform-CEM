import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapBranch, type Branch, type BranchDto } from "../types/branch";

export interface TeamMemberInput {
  name: string;
  role: string;
  photo_url?: string;
}

export interface BranchInput {
  name: string;
  country: string;
  continent?: string;
  latitude?: number;
  longitude?: number;
  physical_address?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  description?: string;
  logo_url?: string;
  team_members?: TeamMemberInput[];
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation<Branch, unknown, BranchInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<BranchDto>("/branches/admin", input);
      return mapBranch(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useUpdateBranch(branchId: number | undefined) {
  const queryClient = useQueryClient();
  return useMutation<Branch, unknown, Partial<BranchInput>>({
    mutationFn: async (input) => {
      const { data } = await api.put<BranchDto>(`/branches/${branchId}`, input);
      return mapBranch(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: number) => {
      await api.delete(`/branches/${branchId}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["branches"] }),
  });
}
