import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface AdminAccount {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  branchId: number | null;
  branchName: string | null;
  /** Temporary password not replaced yet */
  mustChangePassword: boolean;
  createdAt: string;
}

interface AdminAccountDto {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  branch_id: number | null;
  branch_name: string | null;
  must_change_password: boolean;
  created_at: string;
}

interface AdminAccountListDto {
  items: AdminAccountDto[];
  total: number;
}

function mapAccount(dto: AdminAccountDto): AdminAccount {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.first_name,
    lastName: dto.last_name,
    role: dto.role,
    branchId: dto.branch_id,
    branchName: dto.branch_name,
    mustChangePassword: dto.must_change_password,
    createdAt: dto.created_at,
  };
}

export function useAdminAccounts() {
  return useQuery({
    queryKey: ["admin-accounts"],
    queryFn: async () => {
      const { data } = await api.get<AdminAccountListDto>("/super-admin/admins", {
        params: { page: 1, page_size: 100 },
      });
      return data.items.map(mapAccount);
    },
  });
}

export interface CreateAccountInput {
  email: string;
  firstName: string;
  lastName: string;
  branchId: number;
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAccountInput) => {
      const { data } = await api.post("/super-admin/admins", {
        email: input.email,
        first_name: input.firstName,
        last_name: input.lastName,
        branch_id: input.branchId,
      });
      return data as { temporary_password: string; welcome_email_sent: boolean };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (accountId: number) => {
      await api.delete(`/super-admin/admins/${accountId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}
