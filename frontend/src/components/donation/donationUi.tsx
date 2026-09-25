import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy } from "lucide-react";
import clsx from "clsx";
import type { CardBrand } from "../../lib/payments/card";
import type { MobileOperator } from "../../types/donation";
import { OPERATOR_STYLES } from "./donationConstants";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  optional,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-[13px] font-medium text-slate-700 dark:text-slate-300">
        {label}
        {optional && <span className="text-xs font-normal text-slate-400">{t("donation.optional")}</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      )}
    </div>
  );
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard unavailable (insecure context, permissions): the value stays selectable.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className={clsx(
        "inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
        copied
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white",
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? t("donation.copied") : (label ?? t("donation.copy"))}
    </button>
  );
}

/** Small card-network marks, drawn inline (no external images). */
export function CardBrandMark({ brand, className }: { brand: CardBrand; className?: string }) {
  const base = clsx("inline-flex h-6 w-9 items-center justify-center rounded-[5px] border border-slate-200 bg-white dark:border-slate-600", className);
  if (brand === "visa") {
    return (
      <span className={base} aria-label="Visa">
        <span className="text-[10px] font-black italic tracking-tight text-[#1a1f71]">VISA</span>
      </span>
    );
  }
  if (brand === "mastercard") {
    return (
      <span className={base} aria-label="Mastercard">
        <svg viewBox="0 0 24 16" className="h-3.5 w-5" aria-hidden>
          <circle cx="9" cy="8" r="6" fill="#eb001b" />
          <circle cx="15" cy="8" r="6" fill="#f79e1b" />
          <path d="M12 3.2a6 6 0 0 1 0 9.6 6 6 0 0 1 0-9.6z" fill="#ff5f00" />
        </svg>
      </span>
    );
  }
  if (brand === "amex") {
    return (
      <span className={clsx(base, "border-[#2e77bc] bg-[#2e77bc]")} aria-label="American Express">
        <span className="text-[8px] font-black tracking-tight text-white">AMEX</span>
      </span>
    );
  }
  return null;
}

export function OperatorMark({ operator, size = "md" }: { operator: MobileOperator; size?: "sm" | "md" }) {
  const style = OPERATOR_STYLES[operator];
  return (
    <span
      aria-hidden
      className={clsx(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-black tracking-tight",
        style.mark,
        size === "sm" ? "h-6 w-6 text-[9px]" : "h-9 w-9 text-xs",
      )}
    >
      {style.initials}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={clsx("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
