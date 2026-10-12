import clsx from "clsx";

const SIZES = { sm: "h-9 w-9 text-xs", md: "h-12 w-12 text-sm", lg: "h-24 w-24 text-2xl" };

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Round profile photo, or the person's initials when there is none. */
export function Avatar({ name, url, size = "md", className }: { name: string; url?: string | null; size?: keyof typeof SIZES; className?: string }) {
  if (url) {
    return <img src={url} alt="" className={clsx("shrink-0 rounded-full object-cover", SIZES[size], className)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300",
        SIZES[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
