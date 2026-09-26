import { useRef, useState } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useTranslation } from "react-i18next";

interface ImageDropzoneProps {
  images: string[];
  onChange: (images: string[]) => void;
}

export function ImageDropzone({ images, onChange }: ImageDropzoneProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    setUploading(true);
    setError(false);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const formData = new FormData();
        formData.append("file", file);
        // The shared `api` axios instance defaults Content-Type to application/json
        // (see lib/api.ts). That default is NOT auto-replaced just because the body
        // is FormData - it has to be explicitly cleared per-request so the browser
        // can generate the multipart boundary itself. Without this, FastAPI never
        // sees a multipart body at all and rejects the request with "file" missing.
        const { data } = await api.post<{ url: string }>("/upload/image", formData, {
          headers: { "Content-Type": undefined },
        });
        uploaded.push(data.url);
      }
      onChange([...images, ...uploaded]);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
          dragOver
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-slate-300 hover:border-slate-400 dark:border-slate-700 dark:hover:border-slate-600"
        }`}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden />
        ) : (
          <ImagePlus className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden />
        )}
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {uploading ? t("admin.images.uploading") : t("admin.images.drop")}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {t("admin.images.upload_failed")}
        </p>
      )}

      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          {images.map((url, i) => (
            <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, idx) => idx !== i))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/80 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label={t("admin.images.remove")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
