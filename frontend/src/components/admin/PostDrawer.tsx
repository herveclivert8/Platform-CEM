import { useState } from "react";
import { Eye, PenLine } from "lucide-react";
import { Drawer } from "./Drawer";
import { PostContent } from "../hub/PostContent";
import { RichTextEditor } from "./RichTextEditor";
import { ImageDropzone } from "./ImageDropzone";
import { Button } from "../ui/Button";
import { ALL_PILLARS, type Pillar, type Post, type PostStatus } from "../../types/post";
import { useCreatePost, useUpdatePost } from "../../hooks/useAdminPosts";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useBranches } from "../../hooks/useBranches";
import { useTranslation } from "react-i18next";
import { useSuccessToast } from "../../hooks/useSuccessToast";

interface PostDrawerProps {
  open: boolean;
  onClose: () => void;
  branchId: number | undefined;
  post?: Post;
}

export function PostDrawer({ open, onClose, branchId, post }: PostDrawerProps) {
  const { t } = useTranslation();
  return (
    <Drawer open={open} onClose={onClose} title={post ? t("admin.posts.edit") : t("admin.posts.new")}>
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
  const { t } = useTranslation();
  const showSuccess = useSuccessToast();
  const [title, setTitle] = useState(post?.title ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [pillar, setPillar] = useState<Pillar>(post?.pillar ?? "EDUCATION");
  const [images, setImages] = useState<string[]>(post?.images ?? []);
  // No target branch (Super Admin scoped to "all branches"): the form asks for one.
  const needsBranchChoice = !post && branchId === undefined;
  const [chosenBranchId, setChosenBranchId] = useState<number | undefined>(undefined);
  const { data: branchesData } = useBranches();
  const targetBranchId = needsBranchChoice ? chosenBranchId : branchId;
  const createPost = useCreatePost(targetBranchId);
  const updatePost = useUpdatePost(post?.id);
  const pillarLabels = usePillarLabels();
  const [preview, setPreview] = useState(false);

  const save = async (status: PostStatus) => {
    const payload = { title, content, pillar, status, images };
    try {
      if (post) await updatePost.mutateAsync(payload);
      else await createPost.mutateAsync(payload);
    } catch {
      return; // affiché sous le formulaire
    }
    showSuccess(t(status === "PUBLISHED" ? "admin.feedback.post_published" : "admin.feedback.post_draft"), title);
    onDone();
  };

  const isPending = createPost.isPending || updatePost.isPending;
  const hasError = createPost.isError || updatePost.isError;
  const canSave = Boolean(title && content && targetBranchId !== undefined) && !isPending;

  const previewPost: Post = {
    id: post?.id ?? 0,
    branchId: targetBranchId ?? 0,
    authorId: post?.authorId ?? null,
    title: title || t("admin.posts.untitled"),
    content,
    pillar,
    status: post?.status ?? "DRAFT",
    images,
    createdAt: post?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return (
    <div className="space-y-5">
      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist">
        {[
          { value: false, label: t("admin.posts.tab_write"), icon: PenLine },
          { value: true, label: t("admin.posts.tab_preview"), icon: Eye },
        ].map(({ value, label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={preview === value}
            onClick={() => setPreview(value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              preview === value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {preview && (
        <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          {previewPost.images[0] && (
            <img src={previewPost.images[0]} alt="" className="mb-4 aspect-video w-full rounded-lg object-cover" />
          )}
          <PostContent post={previewPost} />
        </div>
      )}

      {/* Hidden, not unmounted, in preview: the rich-text editor keeps its own DOM state */}
      <div className={preview ? "hidden" : "space-y-5"}>
      {needsBranchChoice && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.posts.branch")}</label>
          <select
            required
            value={chosenBranchId ?? ""}
            onChange={(e) => setChosenBranchId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">{t("admin.posts.branch_placeholder")}</option>
            {branchesData?.items.map((b) => (
              <option key={b.id} value={b.id}>
                {b.cityName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.posts.title_label")}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("admin.posts.title_placeholder")}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.posts.pillar")}</label>
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
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.posts.content")}</label>
        <RichTextEditor value={content} onChange={setContent} placeholder={t("admin.posts.content_placeholder")} />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("admin.posts.images")}</label>
        <ImageDropzone images={images} onChange={setImages} />
      </div>

      </div>

      {hasError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {t("admin.posts.save_error")}
        </p>
      )}

      <div className="flex gap-2.5 border-t border-slate-200 pt-5 dark:border-slate-800">
        <Button
          variant="ghost"
          className="flex-1 justify-center border border-slate-200 dark:border-slate-700"
          disabled={!canSave}
          onClick={() => save("DRAFT")}
        >
          {t("admin.posts.save_draft")}
        </Button>
        <Button
          variant="secondary"
          className="flex-1 justify-center"
          disabled={!canSave}
          onClick={() => save("PUBLISHED")}
        >
          {isPending ? "…" : t("admin.posts.publish")}
        </Button>
      </div>
    </div>
  );
}
