import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useToastStore } from "../store/toastStore";
import { mapNotification, type NotificationDto } from "../types/notification";
import { invalidateProjectQueries } from "./useAdminProjects";

const RECONNECT_DELAY_MS = 3_000;

/**
 * Keeps a Server-Sent Events connection to /notifications/stream open while an admin
 * is signed in, so notifications (e.g. a project awaiting validation) show up instantly
 * instead of on the next 30s poll.
 *
 * Read with fetch rather than EventSource so the access token travels in the
 * Authorization header, not the URL. The server closes the stream when the token
 * expires; on reconnect a 401 is resolved by an ordinary API call, which goes through
 * the axios refresh interceptor and stores a fresh token.
 */
export function useNotificationStream() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pushToast = useToastStore((s) => s.push);

  useEffect(() => {
    if (!isAuthenticated) return;

    const controller = new AbortController();
    let reconnectTimer: number | undefined;

    const handleEvent = (event: string, rawData: string) => {
      if (event !== "notification") return;
      const notification = mapNotification(JSON.parse(rawData) as NotificationDto);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (notification.icon === "project") invalidateProjectQueries(queryClient);
      pushToast({
        title: notification.title,
        message: notification.message,
        tone: notification.notificationType,
        actionUrl: notification.actionUrl,
      });
    };

    const connect = async () => {
      try {
        const token = useAuthStore.getState().accessToken;
        const response = await fetch("/api/v1/notifications/stream", {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
        });

        if (response.status === 401) {
          await api.get("/auth/me"); // triggers the refresh interceptor (or logout if it fails)
        } else if (response.ok && response.body) {
          // Anything that happened while disconnected: catch up once the stream is open.
          queryClient.invalidateQueries({ queryKey: ["notifications"] });

          const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
          let buffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += value;
            let separator: number;
            while ((separator = buffer.indexOf("\n\n")) !== -1) {
              const block = buffer.slice(0, separator);
              buffer = buffer.slice(separator + 2);
              let event = "message";
              const data: string[] = [];
              for (const line of block.split("\n")) {
                if (line.startsWith("event:")) event = line.slice(6).trim();
                else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
              }
              if (data.length) handleEvent(event, data.join("\n"));
            }
          }
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (!controller.signal.aborted && useAuthStore.getState().isAuthenticated) {
        reconnectTimer = window.setTimeout(connect, RECONNECT_DELAY_MS);
      }
    };

    connect();
    return () => {
      controller.abort();
      window.clearTimeout(reconnectTimer);
    };
  }, [isAuthenticated, queryClient, pushToast]);
}
