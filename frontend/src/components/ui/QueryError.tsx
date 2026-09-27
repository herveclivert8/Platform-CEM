import { useTranslation } from "react-i18next";
import { AlertTriangle, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { Button } from "./Button";
import { apiErrorMessage } from "../../lib/api";

/**
 * A failed query, shown instead of the "nothing yet" empty state: an outage must never look
 * like an empty list. Shows FastAPI's message when there is one, and a retry button.
 */
export function QueryError({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className={clsx(
        "mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("common.load_error")}</p>
        <p className="mt-0.5">{apiErrorMessage(error, t("common.retry_later"))}</p>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" icon={<RotateCcw className="h-4 w-4" />} onClick={onRetry}>
          {t("common.retry")}
        </Button>
      )}
    </div>
  );
}
