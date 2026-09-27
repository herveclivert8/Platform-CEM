import { useCallback } from "react";
import { useToastStore } from "../store/toastStore";

/**
 * Back-office: confirm that a change was saved. The message stays short and also offers to sign
 * out; staying signed in is the default (nothing to do).
 */
export function useSuccessToast() {
  const push = useToastStore((s) => s.push);
  return useCallback(
    (title: string, message?: string, options: { tone?: "success" | "info" } = {}) =>
      push({ title, message, tone: options.tone ?? "success", offerLogout: true }),
    [push],
  );
}
