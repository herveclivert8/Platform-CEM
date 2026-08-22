import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  tone?: "slate" | "emerald" | "orange" | "glass";
}

const toneClasses = {
  slate: "bg-slate-100 text-slate-500 border-slate-200",
  emerald:
    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30 backdrop-blur-sm",
  orange: "bg-orange-50 text-orange-600 border-orange-200",
  glass: "bg-white/10 text-white border-white/20 backdrop-blur-sm",
};

export function Badge({ children, tone = "slate", className, ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
