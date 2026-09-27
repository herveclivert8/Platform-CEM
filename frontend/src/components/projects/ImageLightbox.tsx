import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  /** Index of the open photo, or null when closed */
  index: number | null;
  onChange: (index: number | null) => void;
}

/** Full-screen photo viewer: arrows / swipe-free keyboard navigation, Escape or click outside to close. */
export function ImageLightbox({ images, index, onChange }: ImageLightboxProps) {
  const { t } = useTranslation();
  const open = index !== null;
  const count = images.length;
  const go = useCallback((delta: number) => onChange(index === null ? null : (index + delta + count) % count), [index, count, onChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChange(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, go, onChange]);

  if (!open) return null;

  const navButton =
    "absolute top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition-colors hover:bg-white/20";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("projects.gallery_label", { current: index + 1, total: count })}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 p-4"
      onClick={() => onChange(null)}
    >
      <img
        src={images[index]}
        alt=""
        className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button type="button" onClick={() => onChange(null)} aria-label={t("common.close")}
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20">
        <X className="h-5 w-5" />
      </button>
      {count > 1 && (
        <>
          <button type="button" aria-label={t("common.previous")} className={`${navButton} left-4`}
            onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" aria-label={t("common.next")} className={`${navButton} right-4`}
            onClick={(e) => { e.stopPropagation(); go(1); }}>
            <ChevronRight className="h-6 w-6" />
          </button>
          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {count}
          </p>
        </>
      )}
    </div>
  );
}
