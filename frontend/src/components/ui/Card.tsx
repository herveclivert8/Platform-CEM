import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, hoverable = true, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        hoverable &&
          "transition-all duration-300 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function IconBadge({
  icon,
  tone = "emerald",
}: {
  icon: ReactNode;
  tone?: "emerald" | "orange" | "slate";
}) {
  const toneClasses = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    orange: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  }[tone];

  return <div className={clsx("inline-flex p-2.5 rounded-xl", toneClasses)}>{icon}</div>;
}
