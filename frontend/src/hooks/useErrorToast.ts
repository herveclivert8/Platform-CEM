import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiErrorMessage } from "../lib/api";
import { useToastStore } from "../store/toastStore";

/**
 * Back-office: report a failed action as a toast, with FastAPI's message when there is one.
 * Pass it as `onError` to mutations that have no inline error display, so a refused
 * action (403, 409...) never fails silently.
 */
export function useErrorToast() {
  const { t } = useTranslation();
  const push = useToastStore((s) => s.push);
  return useCallback(
    (error: unknown) =>
      push({
        title: t("common.action_failed"),
        message: apiErrorMessage(error, t("common.retry_later")),
        tone: "error",
        actionUrl: null,
      }),
    [push, t],
  );
}
