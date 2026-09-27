import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { usePost } from "../hooks/usePosts";
import { useBranch } from "../hooks/useBranches";
import { PostContent } from "../components/hub/PostContent";
import { Skeleton } from "../components/ui/Skeleton";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../hooks/usePageMeta";

export function PostDetailPage() {
  const { t } = useTranslation();
  const { branchId, postId } = useParams<{ branchId: string; postId: string }>();
  const { data: post, isLoading, isError } = usePost(postId ? Number(postId) : undefined);
  const { data: branch } = useBranch(branchId ? Number(branchId) : undefined);
  usePageMeta(post?.title ?? (isError ? t("not_found.title") : undefined), post?.content);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-10 w-full" />
        <Skeleton className="mt-4 h-64 w-full" />
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          {t("posts_page.not_found")}
        </p>
        <Link
          to={branchId ? `/antennes/${branchId}` : "/"}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t("posts_page.back_branch")}
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <Link
        to={`/antennes/${post.branchId}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        {branch ? t("posts_page.back_branch_of", { city: branch.cityName }) : t("posts_page.back_branch")}
      </Link>

      {post.images[0] && (
        <div className="mt-6 aspect-[16/9] w-full overflow-hidden rounded-2xl">
          <img src={post.images[0]} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      <PostContent post={post} headingLevel="h1" />
    </article>
  );
}
