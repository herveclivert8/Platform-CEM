import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapPaymentInfo, type PaymentInfo, type PaymentInfoDto, type PaymentInfoInput } from "../types/settings";

/** Mobile Money accounts shown to donors (editable by the Super Admin). */
export function usePaymentInfo() {
  return useQuery<PaymentInfo>({
    queryKey: ["payment-info"],
    queryFn: async () => {
      const { data } = await api.get<PaymentInfoDto>("/settings/payment-info");
      return mapPaymentInfo(data);
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdatePaymentInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentInfoInput) => {
      const { data } = await api.put<PaymentInfoDto>("/settings/payment-info", {
        mobile_money_holder: input.mobileMoneyHolder,
        mvola_number: input.mvolaNumber,
        orange_money_number: input.orangeMoneyNumber,
        airtel_money_number: input.airtelMoneyNumber,
      });
      return mapPaymentInfo(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-info"] }),
  });
}
