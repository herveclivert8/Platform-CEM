import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText, Loader2 } from "lucide-react";
import { downloadProjectDocument, formatFileSize } from "../../hooks/useProjectDocuments";
import type { ProjectDocument } from "../../types/project";

/** Documents attached to a project (the API only sends them to members with their fee paid and admins). */
export function ProjectDocuments({ documents }: { documents: ProjectDocument[] }) {
  const { t, i18n } = useTranslation();
  const [busy, setBusy] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  if (documents.length === 0) return null;

  const download = async (doc: ProjectDocument) => {
    setBusy(doc.id);
    setFailed(false);
    try {
      await downloadProjectDocument(doc);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-8">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t("documents.section_title")}</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              onClick={() => download(doc)}
              disabled={busy === doc.id}
              className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-emerald-500 dark:border-slate-700"
            >
              <FileText className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900 dark:text-white">{doc.title}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {doc.fileName} · {formatFileSize(doc.size, i18n.language)}
                </span>
              </span>
              {busy === doc.id ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden />
              ) : (
                <Download className="h-4 w-4 shrink-0 text-slate-400" aria-label={t("documents.download")} />
              )}
            </button>
          </li>
        ))}
      </ul>
      {failed && <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{t("documents.download_error")}</p>}
    </section>
  );
}
