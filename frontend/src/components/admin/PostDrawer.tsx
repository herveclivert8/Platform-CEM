import { useState } from "react";
import { Drawer } from "./Drawer";
import { RichTextEditor } from "./RichTextEditor";
import { ImageDropzone } from "./ImageDropzone";
import { Button } from "../ui/Button";
import { PILLAR_LABELS, type Pillar, type Post, type PostStatus } from "../../types/post";
import { useCreatePost, useUpdatePost } from "../../hooks/useAdminPosts";

interface PostDrawerProps {
  open: boolean;
  onClose: () => void;
  branchId: number | undefined;
  post?: Post;
}

const PILLARS = Object.keys(PILLAR_LABELS) as Pillar[];

export function PostDrawer({ open, onClose, branchId, post }: PostDrawerProps) {
  return (
    <Drawer open={open} onClose={onClose} title={post ? "Modifier le post" : "Nouveau post"}>
      {/*
        Keyed by the target post so the whole form (including the RichTextEditor's
        uncontrolled contentEditable DOM) fully remounts per post, with state
        initialized synchronously from props. A shared instance re-used across
        different posts via a `useEffect` reset would leave the editor's DOM out of
        sync (contentEditable doesn't re-render like a controlled <input>), silently
        showing an empty editor - and overwriting the post's content on save.
      */}
      <PostForm key={post?.id ?? "new"} branchId={branchId} post={post} onDone={onClose} />
    </Drawer>
  );
}

function PostForm({
  branchId,
  post,
  onDone,
}: {
  branchId: number | undefined;
  post?: Post;
  onDone: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [pillar, setPillar] = useState<Pillar>(post?.pillar ?? "EDUCATION");
  const [images, setImages] = useState<string[]>(post?.images ?? []);
  const createPost = useCreatePost(branchId);
  const updatePost = useUpdatePost(post?.id);

  const save = async (status: PostStatus) => {
    const payload = { title, content, pillar, status, images };
    if (post) {
      await updatePost.mutateAsync(payload);
    } else {
      await createPost.mutateAsync(payload);
    }
    onDone();
  };

  const isPending = createPost.isPending || updatePost.isPending;
  const hasError = createPost.isError || updatePost.isError;

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Titre</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'actualité"
          className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Pilier</label>
        <div className="grid grid-cols-2 gap-2">
          {PILLARS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPillar(p)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                pillar === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-700 text-slate-400 hover:border-slate-600"
              }`}
            >
              {PILLAR_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Contenu</label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Rédigez votre actualité…" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-400">Images</label>
        <ImageDropzone images={images} onChange={setImages} />
      </div>

      {hasError && (
        <p className="text-sm text-red-400">
          Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.
        </p>
      )}

      <div className="flex gap-2.5 border-t border-slate-800 pt-5">
        <Button
          variant="ghost"
          className="flex-1 justify-center border border-slate-700"
          disabled={!title || !content || isPending}
          onClick={() => save("DRAFT")}
        >
          Enregistrer en brouillon
        </Button>
        <Button
          variant="secondary"
          className="flex-1 justify-center"
          disabled={!title || !content || isPending}
          onClick={() => save("PUBLISHED")}
        >
          {isPending ? "…" : "Publier"}
        </Button>
      </div>
    </div>
  );
}
