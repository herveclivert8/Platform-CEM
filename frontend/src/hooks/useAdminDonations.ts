import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapDonation, type Donation, type DonationDto, type ManualDonationInput } from "../types/donation";
import { mapPaginated, type Paginated, type PaginatedDto } from "../types/post";
import { useScopedBranchId } from "./useAdminScope";

export interface AdminDonationFilters {
  page: number;
  status?: string;
  q?: string;
}

/** Donations filtered and paginated server-side, in the current scope (own branch, or Super Admin's pick). */
export function useAdminDonations(filters: AdminDonationFilters = { page: 1 }) {
  const branchId = useScopedBranchId();

  return useQuery<Paginated<Donation>>({
    queryKey: ["admin-donations", branchId ?? "all", filters],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<DonationDto>>("/donations", {
        params: {
          branch_id: branchId,
          page: filters.page,
          page_size: 20,
          status: filters.status || undefined,
          q: filters.q?.trim() || undefined,
        },
      });
      return mapPaginated(data, mapDonation);
    },
    placeholderData: keepPreviousData,
  });
}

function invalidateDonations(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-donations"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
}

function useDonationAction<TVariables>(request: (variables: TVariables) => Promise<{ data: DonationDto }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TVariables) => mapDonation((await request(variables)).data),
    onSuccess: () => invalidateDonations(queryClient),
  });
}

/** Payment found in the account history: confirm (optionally correcting amount / reference); emails the donor. */
export function useConfirmDonation() {
  return useDonationAction(({ id, amount, transactionReference }: { id: number; amount?: number; transactionReference?: string }) =>
    api.post<DonationDto>(`/donations/${id}/confirm`, {
      amount: amount ?? null,
      transaction_reference: transactionReference || null,
    }),
  );
}

export function useRejectDonation() {
  return useDonationAction(({ id, reason }: { id: number; reason: string }) =>
    api.post<DonationDto>(`/donations/${id}/reject`, { reason }),
  );
}

/** Put a confirmed / rejected donation back to "to verify" (handling mistake). */
export function useReopenDonation() {
  return useDonationAction((id: number) => api.post<DonationDto>(`/donations/${id}/reopen`));
}

/** Mobile Money payment received without a declaration from the donor. */
export function useRecordManualDonation() {
  return useDonationAction((input: ManualDonationInput) =>
    api.post<DonationDto>("/donations/manual", {
      branch_id: input.branchId ?? null,
      operator: input.operator,
      sender_phone: input.senderPhone,
      transaction_reference: input.transactionReference,
      amount: input.amount,
      donor_email: input.donorEmail || null,
      donor_name: input.donorName || null,
    }),
  );
}

/** Delete a donation that was never validated (to verify or rejected). */
export function useDeleteDonation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/donations/${id}`);
    },
    onSuccess: () => invalidateDonations(queryClient),
  });
}
