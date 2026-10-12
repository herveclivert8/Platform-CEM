import clsx from "clsx";

/** "CEM." wordmark of the public site (Éditorial style), until the association's official logo. */
export function Wordmark({ withName = true, className }: { withName?: boolean; className?: string }) {
  return (
    <span className={clsx("flex items-center gap-3", className)}>
      <span className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        CEM<span className="text-emerald-600 dark:text-emerald-400">.</span>
      </span>
      {withName && (
        <span className="hidden border-l border-slate-300 pl-3 text-xs font-semibold uppercase leading-tight tracking-[0.12em] text-slate-500 sm:block dark:border-slate-700 dark:text-slate-400">
          Club Excellence
          <br />
          Madagascar
        </span>
      )}
    </span>
  );
}
