import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapDonation, type Donation, type DonationDto, type ManualDonationInput } from "../types/donation";
import type { PaginatedDto } from "../types/post";
import { useAdminScopeStore } from "../store/adminScopeStore";

/**
 * The backend already scopes /donations server-side (Branch Admin sees only their
 * own; Super Admin sees everything) - so for Super Admin we filter client-side by
 * the selected scope instead of adding a new query param.
 */
export function useAdminDonations() {
  const { selectedBranchId } = useAdminScopeStore();

  const query = useQuery<Donation[]>({
    queryKey: ["admin-donations"],
    queryFn: async () => {
      const { data } = await api.get<PaginatedDto<DonationDto>>("/donations", {
        params: { page: 1, page_size: 100 },
      });
      return data.items.map(mapDonation);
    },
  });

  const items =
    selectedBranchId === "all"
      ? query.data
      : query.data?.filter((d) => d.branchId === selectedBranchId);

  return { ...query, data: items };
}

function useDonationAction<TVariables>(request: (variables: TVariables) => Promise<{ data: DonationDto }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: TVariables) => mapDonation((await request(variables)).data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-donations"] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-donations"] }),
  });
}
