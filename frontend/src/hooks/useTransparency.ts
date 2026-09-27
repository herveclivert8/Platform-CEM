import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapTransparency, type TransparencyDto } from "../types/transparency";

/** Public « Transparence » page: consolidated figures, every report, optional donation totals. */
export function useTransparency() {
  return useQuery({
    queryKey: ["transparency"],
    queryFn: async () => {
      const { data } = await api.get<TransparencyDto>("/transparency");
      return mapTransparency(data);
    },
    staleTime: 5 * 60_000,
  });
}
