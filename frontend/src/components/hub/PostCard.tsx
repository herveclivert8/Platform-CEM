import { useState } from "react";
import DOMPurify from "dompurify";
import { Calendar } from "lucide-react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PostModal } from "./PostModal";
import type { Post } from "../../types/post";
import { usePillarLabels } from "../../hooks/usePillarLabels";

const PILLAR_TONE: Record<Post["pillar"], "emerald" | "orange"> = {
  EDUCATION: "emerald",
  SOCIAL: "orange",
  SPORT: "emerald",
  ENTERPRISE: "orange",
};

export function PostCard({ post }: { post: Post }) {
  const [open, setOpen] = useState(false);
  const excerpt = DOMPurify.sanitize(post.content, { ALLOWED_TAGS: [] });
  const pillarLabels = usePillarLabels();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block h-full w-full text-left"
      >
        <Card className="flex h-full flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1">
          {post.images[0] && (
            <div className="aspect-[16/9] w-full overflow-hidden">
              <img
                src={post.images[0]}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
              />
            </div>
          )}
          <div className="flex flex-1 flex-col p-5">
            <Badge tone={PILLAR_TONE[post.pillar]} className="w-fit">
              {pillarLabels[post.pillar]}
            </Badge>
            <h3 className="mt-3 text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {post.title}
            </h3>
            <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-500 dark:text-slate-400">
              {excerpt}
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3.5 w-3.5" aria-hidden />
              {new Date(post.createdAt).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
        </Card>
      </button>

      {open && <PostModal post={post} onClose={() => setOpen(false)} />}
    </>
  );
}
