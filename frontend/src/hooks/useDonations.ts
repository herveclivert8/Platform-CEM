import { useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapDonation, type Donation, type DonationDto, type DonationInput } from "../types/donation";

export function useCreateDonation() {
  return useMutation<Donation, unknown, DonationInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<DonationDto>("/donations", {
        branch_id: input.branchId ?? null,
        amount: input.amount,
        donor_email: input.donorEmail,
      });
      return mapDonation(data);
    },
  });
}
