import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  mapDonationReceipt,
  type CardDonationInput,
  type DonationReceipt,
  type DonationReceiptDto,
  type MobileMoneyDeclarationInput,
  type PaymentOptions,
  type PaymentOptionsDto,
} from "../types/donation";

/** Payment methods offered to donors: card (if a provider is active) and configured Mobile Money accounts. */
export function usePaymentOptions() {
  return useQuery<PaymentOptions>({
    queryKey: ["payment-options"],
    queryFn: async () => {
      const { data } = await api.get<PaymentOptionsDto>("/donations/payment-options");
      return { card: data.card, mobileMoney: data.mobile_money };
    },
    staleTime: 60_000,
  });
}

/** Pays a donation by card (token from the browser, never the card number). */
export function useCardDonation() {
  return useMutation<DonationReceipt, unknown, CardDonationInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<DonationReceiptDto>("/donations/card", {
        branch_id: input.branchId ?? null,
        amount: input.amount,
        donor_email: input.donorEmail,
        donor_name: input.donorName || null,
        payment_token: input.paymentToken,
      });
      return mapDonationReceipt(data);
    },
  });
}

/** Declares a Mobile Money payment the donor already made from their phone. */
export function useDeclareMobileMoneyDonation() {
  return useMutation<DonationReceipt, unknown, MobileMoneyDeclarationInput>({
    mutationFn: async (input) => {
      const { data } = await api.post<DonationReceiptDto>("/donations/mobile-money", {
        branch_id: input.branchId ?? null,
        operator: input.operator,
        sender_phone: input.senderPhone,
        transaction_reference: input.transactionReference,
        amount: input.amount,
        donor_email: input.donorEmail,
        donor_name: input.donorName || null,
      });
      return mapDonationReceipt(data);
    },
  });
}
