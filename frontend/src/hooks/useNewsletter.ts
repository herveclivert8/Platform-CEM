import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import i18n from "../i18n/i18n";

export type SubscriberStatus = "PENDING" | "CONFIRMED" | "UNSUBSCRIBED";

export interface Subscriber {
  id: number;
  email: string;
  lang: string;
  status: SubscriberStatus;
  createdAt: string;
  confirmedAt: string | null;
  unsubscribedAt: string | null;
}

interface SubscriberDto {
  id: number;
  email: string;
  lang: string;
  status: SubscriberStatus;
  created_at: string;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
}

interface SubscriberListDto {
  items: SubscriberDto[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  counts: Record<SubscriberStatus, number>;
}

/** Footer signup: always answers the same way (the API never reveals who is subscribed). */
export function useSubscribe() {
  return useMutation({
    mutationFn: async ({ email, website }: { email: string; website: string }) => {
      await api.post("/newsletter/subscribe", {
        email,
        website,
        lang: i18n.language?.startsWith("en") ? "en" : "fr",
      });
    },
  });
}

export function useConfirmSubscription() {
  return useMutation({
    mutationFn: async (token: string) => {
      await api.post("/newsletter/confirm", { token });
    },
  });
}

export function useUnsubscribe() {
  return useMutation({
    mutationFn: async (token: string) => {
      await api.post("/newsletter/unsubscribe", { token });
    },
  });
}

/** Super Admin back-office list. */
export function useSubscribers(filters: { page: number; status?: SubscriberStatus; q?: string }) {
  return useQuery({
    queryKey: ["newsletter-subscribers", filters],
    queryFn: async () => {
      const { data } = await api.get<SubscriberListDto>("/newsletter/subscribers", {
        params: { page: filters.page, page_size: 20, status: filters.status, q: filters.q?.trim() || undefined },
      });
      return {
        items: data.items.map<Subscriber>((s) => ({
          id: s.id,
          email: s.email,
          lang: s.lang,
          status: s.status,
          createdAt: s.created_at,
          confirmedAt: s.confirmed_at,
          unsubscribedAt: s.unsubscribed_at,
        })),
        total: data.total,
        page: data.page,
        totalPages: data.total_pages,
        counts: data.counts,
      };
    },
    placeholderData: keepPreviousData,
  });
}

export function useDeleteSubscriber() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/newsletter/subscribers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["newsletter-subscribers"] }),
  });
}

/** Download the CSV of confirmed subscribers (authenticated request, then a local file link). */
export function useExportSubscribers() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<Blob>("/newsletter/subscribers/export", { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `abonnes-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}
