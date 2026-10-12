"""
Discussions sous les projets publiés (commentaires et réponses, comme sous une publication Facebook).

Lecture et écriture réservées aux membres validés et à jour de cotisation, et aux admins.
Chacun peut supprimer ses commentaires ; un admin peut supprimer ceux des projets qu'il gère.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.core.permissions import can_access_branch
from app.core.rate_limit import rate_limit
from app.models import Project, ProjectComment, User
from app.models.project import ProjectReviewStatus
from app.schemas.comment import Comment, CommentCreate

router = APIRouter(prefix="/projects/{project_id}/comments", tags=["comments"])


async def get_discussion_user(user: User = Depends(get_current_user)) -> User:
    """Admin, ou membre validé et à jour de cotisation."""
    if not user.is_admin and not user.has_member_access(datetime.now(timezone.utc).date()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Discussions réservées aux membres à jour de cotisation",
        )
    return user


async def _get_published_project(db: AsyncSession, project_id: int) -> Project:
    project = await db.get(Project, project_id)
    if not project or project.review_status != ProjectReviewStatus.APPROVED or not project.is_visible:
        raise HTTPException(status_code=404, detail="Projet introuvable")
    return project


def _can_delete(user: User, comment: ProjectComment, project: Project) -> bool:
    return comment.author_id == user.id or can_access_branch(user, project.branch_id)


def _to_schema(user: User, comment: ProjectComment, project: Project) -> Comment:
    return Comment(
        id=comment.id,
        project_id=comment.project_id,
        parent_id=comment.parent_id,
        author_id=comment.author_id,
        author_name=comment.author.full_name,
        author_is_admin=comment.author.is_admin,
        author_avatar_url=comment.author.avatar_url,
        body=comment.body,
        created_at=comment.created_at,
        can_delete=_can_delete(user, comment, project),
    )


@router.get("", response_model=list[Comment])
async def list_comments(
    project_id: int,
    user: User = Depends(get_discussion_user),
    db: AsyncSession = Depends(get_db),
):
    """Commentaires du projet, du plus ancien au plus récent, avec leurs réponses."""
    project = await _get_published_project(db, project_id)
    result = await db.execute(
        select(ProjectComment)
        .options(selectinload(ProjectComment.author))
        .where(ProjectComment.project_id == project_id)
        .order_by(ProjectComment.created_at, ProjectComment.id)
    )
    threads: dict[int, Comment] = {}
    replies: list[Comment] = []
    for comment in result.scalars().all():
        item = _to_schema(user, comment, project)
        if comment.parent_id:
            replies.append(item)
        else:
            threads[comment.id] = item
    for reply in replies:
        if reply.parent_id in threads:
            threads[reply.parent_id].replies.append(reply)
    return list(threads.values())


@router.post(
    "",
    response_model=Comment,
    status_code=201,
    dependencies=[Depends(rate_limit("comment", limit=30, window=60 * 60))],
)
async def create_comment(
    project_id: int,
    data: CommentCreate,
    user: User = Depends(get_discussion_user),
    db: AsyncSession = Depends(get_db),
):
    """Commenter un projet, ou répondre à un commentaire."""
    project = await _get_published_project(db, project_id)
    if data.parent_id is not None:
        parent = await db.get(ProjectComment, data.parent_id)
        if not parent or parent.project_id != project_id:
            raise HTTPException(status_code=404, detail="Commentaire introuvable")
        if parent.parent_id is not None:
            raise HTTPException(status_code=400, detail="On ne peut répondre qu'à un commentaire principal.")

    comment = ProjectComment(project_id=project_id, author_id=user.id, parent_id=data.parent_id, body=data.body)
    db.add(comment)
    await db.commit()
    comment = await db.scalar(
        select(ProjectComment).options(selectinload(ProjectComment.author)).where(ProjectComment.id == comment.id)
    )
    return _to_schema(user, comment, project)


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    project_id: int,
    comment_id: int,
    user: User = Depends(get_discussion_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un commentaire (et ses réponses). Accessible: son auteur, ou un admin du projet."""
    project = await _get_published_project(db, project_id)
    comment = await db.get(ProjectComment, comment_id)
    if not comment or comment.project_id != project_id:
        raise HTTPException(status_code=404, detail="Commentaire introuvable")
    if not _can_delete(user, comment, project):
        raise HTTPException(status_code=403, detail="Vous ne pouvez supprimer que vos commentaires.")
    await db.delete(comment)
    await db.commit()
