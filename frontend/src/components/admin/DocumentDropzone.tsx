import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Loader2, UploadCloud, X } from "lucide-react";
import { api, apiErrorMessage } from "../../lib/api";

interface DocumentDropzoneProps {
  /** URL of the uploaded PDF, or "" when none. */
  value: string;
  onChange: (url: string) => void;
}

const MAX_SIZE_MB = 20;

/** Single PDF upload (drag & drop or click), sent to POST /upload/document. */
export function DocumentDropzone({ value, onChange }: DocumentDropzoneProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError(t("admin.reports.pdf_only"));
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(t("admin.reports.pdf_too_big", { max: MAX_SIZE_MB }));
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post<{ url: string }>("/upload/document", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setFileName(file.name);
      onChange(data.url);
    } catch (err) {
      setError(apiErrorMessage(err, t("admin.reports.upload_failed")));
    } finally {
      setUploading(false);
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
        <FileText className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden />
        <a href={value} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 hover:underline dark:text-slate-200">
          {fileName ?? t("admin.reports.current_file")}
        </a>
        <button
          type="button"
          onClick={() => {
            setFileName(null);
            onChange("");
          }}
          aria-label={t("admin.reports.remove_file")}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) upload(file);
        }}
        disabled={uploading}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-60 dark:border-slate-700 dark:text-slate-400"
      >
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <UploadCloud className="h-5 w-5" aria-hidden />}
        {uploading ? t("admin.reports.uploading") : t("admin.reports.drop_pdf", { max: MAX_SIZE_MB })}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
