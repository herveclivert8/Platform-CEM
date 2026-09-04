import { useState } from "react";
import { Plus, Pencil, Trash2, ImageOff } from "lucide-react";
import { Card, IconBadge } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { PostDrawer } from "../../components/admin/PostDrawer";
import type { Post } from "../../types/post";
import { useAdminPosts, useDeletePost } from "../../hooks/useAdminPosts";
import { usePillarLabels } from "../../hooks/usePillarLabels";
import { useAdminScopeStore } from "../../store/adminScopeStore";
import { useAuthStore } from "../../store/authStore";

export function PostsPage() {
  const user = useAuthStore((s) => s.user);
  const { selectedBranchId } = useAdminScopeStore();
  const { data: posts, isLoading } = useAdminPosts();
  const deletePost = useDeletePost();
  const pillarLabels = usePillarLabels();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | undefined>(undefined);

  const targetBranchId =
    user?.role === "SUPER_ADMIN"
      ? selectedBranchId === "all"
        ? undefined
        : selectedBranchId
      : (user?.branchId ?? undefined);

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
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Mes Publications</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Actualités, rapports de terrain et projets.</p>
        </div>
        <Button
          variant="secondary"
          icon={<Plus className="h-4 w-4" />}
          disabled={!targetBranchId}
          onClick={openCreate}
          title={!targetBranchId ? "Sélectionnez une antenne spécifique pour créer un post" : undefined}
        >
          Nouveau post
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !posts || posts.length === 0 ? (
        <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">Aucun post pour le moment.</p>
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
                    {post.status === "PUBLISHED" ? "Publié" : "Brouillon"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{pillarLabels[post.pillar]}</p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(post)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => window.confirm("Supprimer ce post ?") && deletePost.mutate(post.id)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                aria-label="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
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
