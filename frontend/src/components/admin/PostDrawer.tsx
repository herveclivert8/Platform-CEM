import { useState } from "react";
import { Drawer } from "./Drawer";
import { RichTextEditor } from "./RichTextEditor";
import { ImageDropzone } from "./ImageDropzone";
import { Button } from "../ui/Button";
import { ALL_PILLARS, type Pillar, type Post, type PostStatus } from "../../types/post";
import { useCreatePost, useUpdatePost } from "../../hooks/useAdminPosts";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useAdminBranchList } from "../../hooks/useBranches";

interface PostDrawerProps {
  open: boolean;
  onClose: () => void;
  branchId: number | undefined;
  post?: Post;
}

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
  // No target branch (Super Admin scoped to "all branches"): the form asks for one.
  const needsBranchChoice = !post && branchId === undefined;
  const [chosenBranchId, setChosenBranchId] = useState<number | undefined>(undefined);
  const { data: branchesData } = useAdminBranchList();
  const targetBranchId = needsBranchChoice ? chosenBranchId : branchId;
  const createPost = useCreatePost(targetBranchId);
  const updatePost = useUpdatePost(post?.id);
  const pillarLabels = usePillarLabels();

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
  const canSave = Boolean(title && content && targetBranchId !== undefined) && !isPending;

  return (
    <div className="space-y-5">
      {needsBranchChoice && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Antenne</label>
          <select
            required
            value={chosenBranchId ?? ""}
            onChange={(e) => setChosenBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Antenne de publication…</option>
            {branchesData?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Titre</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre de l'actualité"
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Pilier</label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PILLARS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPillar(p)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                pillar === p
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:text-slate-400 dark:hover:border-slate-600"
              }`}
            >
              {pillarLabels[p]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Contenu</label>
        <RichTextEditor value={content} onChange={setContent} placeholder="Rédigez votre actualité…" />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Images</label>
        <ImageDropzone images={images} onChange={setImages} />
      </div>

      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.
        </p>
      )}

      <div className="flex gap-2.5 border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button
          variant="ghost"
          className="flex-1 justify-center border border-slate-200 dark:border-slate-700"
          disabled={!canSave}
          onClick={() => save("DRAFT")}
        >
          Enregistrer en brouillon
        </Button>
        <Button
          variant="secondary"
          className="flex-1 justify-center"
          disabled={!canSave}
          onClick={() => save("PUBLISHED")}
        >
          {isPending ? "…" : "Publier"}
        </Button>
      </div>
    </div>
  );
}
