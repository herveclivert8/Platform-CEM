import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { buttonClasses } from "../components/ui/buttonStyles";
import { usePageMeta } from "../hooks/usePageMeta";

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageMeta(t("not_found.title"));

  return (
    <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-32 text-center sm:px-6 lg:px-8">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <Compass className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
        {t("not_found.title")}
      </h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">{t("not_found.subtitle")}</p>
      <Link to="/" className={buttonClasses({ variant: "secondary", className: "mt-6" })}>
        {t("not_found.back_home")}
      </Link>
    </div>
  );
}
