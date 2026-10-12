import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Lock, MessageCircle, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Avatar } from "../ui/Avatar";
import { buttonClasses } from "../ui/buttonStyles";
import { useAddComment, useDeleteComment, useProjectComments } from "../../hooks/useComments";
import { useErrorToast } from "../../hooks/useErrorToast";
import { useAuthStore } from "../../store/authStore";
import { isAdminRole } from "../../types/user";
import type { ProjectComment } from "../../types/membership";

const inputClass =
  "w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white";


function CommentForm({ projectId, parentId, onDone, autoFocus }: { projectId: number; parentId?: number; onDone?: () => void; autoFocus?: boolean }) {
  const { t } = useTranslation();
  const [body, setBody] = useState("");
  const add = useAddComment(projectId);
  const showError = useErrorToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    add.mutate(
      { body, parentId },
      {
        onSuccess: () => {
          setBody("");
          onDone?.();
        },
        onError: showError,
      },
    );
  };

  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <textarea
        rows={parentId ? 1 : 2}
        maxLength={2000}
        autoFocus={autoFocus}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t(parentId ? "discussion.reply_placeholder" : "discussion.placeholder")}
        aria-label={t(parentId ? "discussion.reply_placeholder" : "discussion.placeholder")}
        className={inputClass}
      />
      <Button type="submit" variant="secondary" size="sm" disabled={add.isPending || !body.trim()}>
        {t("discussion.send")}
      </Button>
    </form>
  );
}

function CommentItem({ comment, projectId, onReply }: { comment: ProjectComment; projectId: number; onReply?: () => void }) {
  const { t, i18n } = useTranslation();
  const remove = useDeleteComment(projectId);
  const showError = useErrorToast();

  return (
    <div className="flex gap-3">
      <Avatar name={comment.authorName} url={comment.authorAvatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-slate-100 px-4 py-2.5 dark:bg-slate-800">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
            {comment.authorName}
            {comment.authorIsAdmin && (
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3 w-3" aria-hidden /> {t("discussion.team")}
              </span>
            )}
          </p>
          <p className="whitespace-pre-line break-words text-sm text-slate-700 dark:text-slate-200">{comment.body}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 px-2 text-xs text-slate-500 dark:text-slate-400">
          <time dateTime={comment.createdAt}>
            {new Date(comment.createdAt).toLocaleString(i18n.language, { dateStyle: "medium", timeStyle: "short" })}
          </time>
          {onReply && (
            <button type="button" onClick={onReply} className="font-semibold hover:underline">
              {t("discussion.reply")}
            </button>
          )}
          {comment.canDelete && (
            <button
              type="button"
              onClick={() => window.confirm(t("discussion.delete_confirm")) && remove.mutate(comment.id, { onError: showError })}
              className="inline-flex items-center gap-1 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" aria-hidden /> {t("common.delete")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Discussion under a project: members with their fee paid and admins; others see an invitation to join. */
export function ProjectComments({ projectId }: { projectId: number }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const canTakePart = !!user && (isAdminRole(user.role) || user.memberAccess);
  const { data: comments } = useProjectComments(projectId, canTakePart);
  const [replyTo, setReplyTo] = useState<number | null>(null);

  return (
    <section className="mt-10 border-t border-slate-200 pt-8 dark:border-slate-800">
      <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 dark:text-white">
        <MessageCircle className="h-5 w-5 text-emerald-600" aria-hidden />
        {t("discussion.title")}
        {comments && comments.length > 0 && <span className="text-sm font-medium text-slate-400">({comments.length})</span>}
      </h2>

      {!canTakePart ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-5 py-4 dark:bg-slate-900">
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Lock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            {t(user ? "discussion.locked_member" : "discussion.locked_visitor")}
          </p>
          <Link
            to={user ? "/espace-membre" : "/inscription"}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            {t(user ? "nav.member_area" : "nav.register")}
          </Link>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <CommentForm projectId={projectId} />
          {comments?.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t("discussion.empty")}</p>}
          {comments?.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentItem comment={comment} projectId={projectId} onReply={() => setReplyTo(comment.id)} />
              {(comment.replies.length > 0 || replyTo === comment.id) && (
                <div className="ml-12 space-y-3">
                  {comment.replies.map((reply) => (
                    <CommentItem key={reply.id} comment={reply} projectId={projectId} />
                  ))}
                  {replyTo === comment.id && (
                    <CommentForm projectId={projectId} parentId={comment.id} onDone={() => setReplyTo(null)} autoFocus />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
