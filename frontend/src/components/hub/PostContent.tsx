import DOMPurify from "dompurify";
import { Calendar } from "lucide-react";
import { Badge } from "../ui/Badge";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import type { Post } from "../../types/post";

const PILLAR_TONE: Record<Post["pillar"], "emerald" | "orange"> = {
  EDUCATION: "emerald",
  SOCIAL: "orange",
  SPORT: "emerald",
  ENTERPRISE: "orange",
};

interface PostContentProps {
  post: Post;
  headingLevel?: "h1" | "h2";
}

/**
 * Full-article body, shared between the standalone post page (direct/shareable
 * URL) and the quick-read modal opened from a card - one place for the
 * sanitize + formatting rules instead of duplicating them.
 */
export function PostContent({ post, headingLevel = "h2" }: PostContentProps) {
  const pillarLabels = usePillarLabels();
  const safeContent = DOMPurify.sanitize(post.content);
  const Heading = headingLevel;

  return (
    <>
      <Badge tone={PILLAR_TONE[post.pillar]} className="w-fit">
        {pillarLabels[post.pillar]}
      </Badge>

      <Heading className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
        {post.title}
      </Heading>

      <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-400">
        <Calendar className="h-4 w-4" aria-hidden />
        {new Date(post.createdAt).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })}
      </p>

      {/*
        No typography plugin installed - the back-office RichTextEditor only ever
        produces a small, known set of tags (bold/italic/links/lists, plus
        browser-inserted <div>/<br> line breaks from contentEditable), so we style
        those explicitly rather than pulling in @tailwindcss/typography for it.
      */}
      <div
        className="mt-6 text-base leading-relaxed text-slate-700 dark:text-slate-300 [&>div]:mb-4 [&>p]:mb-4 [&_a]:text-emerald-600 [&_a]:underline dark:[&_a]:text-emerald-400 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1"
        dangerouslySetInnerHTML={{ __html: safeContent }}
      />

      {post.images.length > 1 && (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {post.images.slice(1).map((url) => (
            <div key={url} className="aspect-square overflow-hidden rounded-xl">
              <img src={url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
