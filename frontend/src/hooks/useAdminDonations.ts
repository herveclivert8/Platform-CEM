import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapDonation, type Donation, type DonationDto } from "../types/donation";
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
