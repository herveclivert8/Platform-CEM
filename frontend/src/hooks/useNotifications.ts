import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { mapNotification, type NotificationListDto } from "../types/notification";

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data } = await api.get<NotificationListDto>("/notifications", {
        params: { limit: 10 },
      });
      return {
        items: data.data.map(mapNotification),
        total: data.total,
        unreadCount: data.unread_count,
      };
    },
    // First use of polling in this app: an admin panel at this scale doesn't
    // warrant WebSockets, but the badge should still feel "alive" without a
    // manual refresh.
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: number) => {
      await api.post(`/notifications/${notificationId}/read`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.post("/notifications/read-all");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });
}
