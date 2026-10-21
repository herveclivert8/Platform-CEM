import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { Button } from "../ui/Button";
import { fieldClass } from "../donation/donationConstants";
import { apiErrorMessage } from "../../lib/api";
import { formatFileSize, uploadProjectDocument } from "../../hooks/useProjectDocuments";
import { DOCUMENT_ACCEPT, MAX_DOCUMENT_BYTES, MAX_PROJECT_DOCUMENTS, type ProjectDocument } from "../../types/project";

/** Attach up to 3 documents (PDF / Office, 10 MB each) to a project, each with an optional title. */
export function DocumentUploader({ documents, onChange }: { documents: ProjectDocument[]; onChange: (next: ProjectDocument[]) => void }) {
  const { t, i18n } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = documents.length >= MAX_PROJECT_DOCUMENTS;

  const pick = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_DOCUMENT_BYTES) {
      setError(t("documents.too_large"));
      return;
    }
    setUploading(true);
    try {
      const doc = await uploadProjectDocument(file, title.trim());
      onChange([...documents, doc]);
      setTitle("");
    } catch (err) {
      setError(apiErrorMessage(err, t("documents.upload_error")));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {documents.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {documents.map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <FileText className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{doc.title}</span>
                <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                  {doc.fileName} · {formatFileSize(doc.size, i18n.language)}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onChange(documents.filter((d) => d.id !== doc.id))}
                aria-label={t("documents.remove", { title: doc.title })}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-400"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div className="flex flex-wrap gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={150}
            placeholder={t("documents.title_placeholder")}
            aria-label={t("documents.title_placeholder")}
            className={`${fieldClass} min-w-0 flex-1 basis-56`}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            icon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            onClick={() => inputRef.current?.click()}
          >
            {t("documents.add")}
          </Button>
          <input ref={inputRef} type="file" accept={DOCUMENT_ACCEPT} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      )}
      {error && <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
