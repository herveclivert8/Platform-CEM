import { useState } from "react";
import { Plus, Pencil, Trash2, ImageOff, Search } from "lucide-react";
import clsx from "clsx";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { PostDrawer } from "../../components/admin/PostDrawer";
import { Pagination } from "../../components/ui/Pagination";
import type { Pillar, Post } from "../../types/post";
import { useAdminPosts, useDeletePost } from "../../hooks/useAdminPosts";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useScopedBranchId } from "../../hooks/useAdminScope";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useTranslation } from "react-i18next";

const fieldClass =
  "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";

export function PostsPage() {
  const { t } = useTranslation();
  const targetBranchId = useScopedBranchId();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [pillar, setPillar] = useState("");
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search);
  const { data, isLoading } = useAdminPosts({ page, status, pillar, q });
  const posts = data?.items;
  const deletePost = useDeletePost();
  const pillarLabels = usePillarLabels();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>(undefined);
  const hasFilters = Boolean(status || pillar || q.trim());

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const openCreate = () => {
    setEditingPost(undefined);
    setDrawerOpen(true);
  };

  const openEdit = (post: Post) => {
    setEditingPost(post);
    setDrawerOpen(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{t("admin.posts.title")}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("admin.posts.subtitle")}</p>
        </div>
        {/* Pas d'antenne ciblée (Super Admin en vue "Toutes les antennes") : le formulaire la demande. */}
        <Button variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          {t("admin.posts.new")}
        </Button>
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => resetPage(setSearch)(e.target.value)}
            placeholder={t("admin.posts.search")}
            className={clsx(fieldClass, "w-full pl-9")}
          />
        </label>
        <select value={status} onChange={(e) => resetPage(setStatus)(e.target.value)} aria-label={t("admin.posts.all_statuses")} className={fieldClass}>
          <option value="">{t("admin.posts.all_statuses")}</option>
          <option value="PUBLISHED">{t("admin.posts.published_plural")}</option>
          <option value="DRAFT">{t("admin.posts.drafts")}</option>
        </select>
        <select value={pillar} onChange={(e) => resetPage(setPillar)(e.target.value)} aria-label={t("admin.posts.pillar")} className={fieldClass}>
          <option value="">{t("admin.posts.all_pillars")}</option>
          {(Object.keys(pillarLabels) as Pillar[]).map((p) => (
            <option key={p} value={p}>
              {pillarLabels[p]}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !posts || posts.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">
          {hasFilters ? t("admin.posts.none_match") : t("admin.posts.none")}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {posts.map((post) => (
            <Card key={post.id} hoverable={false} className="flex items-center gap-4 p-4">
              {post.images[0] ? (
                <img src={post.images[0]} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              ) : (
                <IconBadge icon={<ImageOff className="h-4 w-4" aria-hidden />} tone="slate" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{post.title}</p>
                  <Badge tone={post.status === "PUBLISHED" ? "emerald" : "slate"}>
                    {post.status === "PUBLISHED" ? t("admin.posts.published") : t("admin.posts.draft")}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pillarLabels[post.pillar]}</p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(post)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label={t("common.edit")}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => window.confirm(t("admin.posts.delete_confirm")) && deletePost.mutate(post.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label={t("common.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            total={data.total}
            onPageChange={setPage}
            itemLabel={t("admin.posts.count_label")}
          />
        </div>
      )}

      <PostDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        branchId={editingPost ? editingPost.branchId : targetBranchId}
        post={editingPost}
      />
    </div>
  );
}
