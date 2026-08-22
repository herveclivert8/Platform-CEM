import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { HeartHandshake } from "lucide-react";
import { Card } from "../ui/Card";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <HeartHandshake className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-bold tracking-tight text-slate-900 dark:text-white">
            Club Excellence Madagascar
          </span>
        </Link>

        <Card className="p-8" hoverable={false}>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </Card>
      </div>
    </div>
  );
}
