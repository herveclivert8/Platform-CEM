import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { PostContent } from "./PostContent";
import type { Post } from "../../types/post";

interface PostModalProps {
  post: Post;
  onClose: () => void;
}

/**
 * Quick-read overlay opened from a PostCard click. The dedicated
 * /antennes/:branchId/actualites/:postId route (PostDetailPage) stays the
 * shareable/direct-link entry point - this modal is a same-page shortcut only.
 */
export function PostModal({ post, onClose }: PostModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  // Rendered via portal: PostCard can sit inside an ancestor whose
  // `animate-fade-in-up` animation leaves a non-`none` transform in place
  // (fill-mode "both"), which would otherwise turn that ancestor into the
  // containing block for this fixed-position overlay instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in-up"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl animate-fade-in-up dark:border-slate-800 dark:bg-slate-900"
      >
        {/* Close button lives outside the scrollable region below so it stays
            reachable no matter how far the post content is scrolled. */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur-md transition-colors hover:bg-slate-900/80"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="max-h-[90vh] overflow-y-auto">
          {post.images[0] && (
            <div className="aspect-[16/9] w-full overflow-hidden rounded-t-2xl">
              <img src={post.images[0]} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          <div className="p-6 pr-14 sm:p-8 sm:pr-16" id="post-modal-title">
            <PostContent post={post} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
