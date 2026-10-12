import type { ReactNode } from "react";
import clsx from "clsx";
import { Hourglass, type LucideIcon } from "lucide-react";

/** Member area building blocks (Éditorial style: sharp panels, display titles). */
export function Panel({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          {title && <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Notice({ icon: Icon = Hourglass, tone = "neutral", children }: { icon?: LucideIcon; tone?: "neutral" | "alert"; children: ReactNode }) {
  return (
    <p
      role={tone === "alert" ? "alert" : undefined}
      className={clsx(
        "flex gap-3 px-4 py-3.5 text-sm leading-relaxed",
        tone === "alert"
          ? "bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

const PILL_TONES = {
  ok: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300",
  bad: "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-300",
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export type PillTone = keyof typeof PILL_TONES;

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <span className={clsx("inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold", PILL_TONES[tone])}>{children}</span>;
}
