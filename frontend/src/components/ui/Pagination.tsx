import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  /** e.g. "posts", "dossiers" */
  itemLabel?: string;
}

const buttonClass =
  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800";

export function Pagination({ page, totalPages, total, onPageChange, itemLabel }: PaginationProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <nav aria-label={t("common.pagination")} className="mt-5 flex items-center justify-between gap-3 text-sm text-slate-500 dark:text-slate-400">
      <span>{t("common.page_of", { page, total: totalPages, count: total, label: itemLabel ?? t("common.items") })}</span>
      <div className="flex gap-1">
        <button type="button" className={buttonClass} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> {t("common.previous")}
        </button>
        <button type="button" className={buttonClass} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t("common.next")} <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
