import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
}

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-orange-600 text-white font-semibold shadow-sm hover:bg-orange-700 hover:shadow-orange-600/20 hover:shadow-lg",
  secondary:
    "bg-emerald-600 text-white font-semibold shadow-sm hover:bg-emerald-700 hover:shadow-emerald-600/20 hover:shadow-lg",
  outline:
    "border border-white/40 text-white font-semibold backdrop-blur-sm hover:bg-white/10",
  ghost:
    "text-slate-600 font-medium hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3.5 text-base rounded-xl gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon, iconPosition = "left", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={clsx(
        "inline-flex items-center justify-center whitespace-nowrap",
        "transition-all duration-200 ease-in-out hover:-translate-y-0.5 active:translate-y-0",
        "disabled:opacity-50 disabled:pointer-events-none disabled:translate-y-0",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon && iconPosition === "left" && icon}
      {children}
      {icon && iconPosition === "right" && icon}
    </button>
  );
});
