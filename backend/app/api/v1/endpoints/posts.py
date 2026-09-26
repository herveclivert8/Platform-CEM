"""
Endpoints pour les posts (actualités / rapports de terrain / projets par pilier)
RÈGLE CRITIQUE: Isolation stricte par branche!
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.api.scope import like_pattern, resolve_branch_scope
from app.services.audit import record_audit
from app.models import Branch, Post, PostImage, User
from app.models.branch import BranchStatus
from app.models.post import PostStatus as PostStatusModel
from app.schemas.post import (
    Post as PostSchema,
    PostCreate,
    PostUpdate,
    PostListResponse,
    PostStatus,
    Pillar,
)
from app.core.permissions import verify_branch_access

router = APIRouter(tags=["posts"])


async def _get_post_or_404(db: AsyncSession, post_id: int) -> Post:
    query = select(Post).options(selectinload(Post.images)).where(Post.id == post_id)
    result = await db.execute(query)
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post introuvable")
    return post


@router.get("/branches/{branch_id}/posts", response_model=PostListResponse)
async def list_branch_posts(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    pillar: str | None = Query(None),
):
    """Lister les posts publiés d'une antenne. Accessible: Public."""
    branch = await db.get(Branch, branch_id)
    # Une antenne en attente n'est pas encore ouverte : invisible pour le public
    if not branch or branch.status == BranchStatus.PENDING:
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    filters = [Post.branch_id == branch_id, Post.status == PostStatusModel.PUBLISHED]
    if pillar:
        filters.append(Post.pillar == pillar)

    total = await db.scalar(select(func.count(Post.id)).where(*filters))

    query = (
        select(Post)
        .options(selectinload(Post.images))
        .where(*filters)
        .order_by(Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    posts = result.scalars().all()

    return PostListResponse(
        items=[PostSchema.from_orm_post(p) for p in posts],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.get("/posts/admin", response_model=PostListResponse)
async def list_posts_admin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    branch_id: int | None = Query(None, description="Super Admin : limiter à une antenne"),
    status_filter: PostStatus | None = Query(None, alias="status"),
    pillar: Pillar | None = Query(None),
    q: str | None = Query(None, max_length=100, description="Recherche dans le titre"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les posts (brouillons inclus), avec filtres et recherche.
    Accessible: Admin d'antenne (la sienne) + Super Admin (toutes, ou une seule).
    """
    scope = resolve_branch_scope(user, branch_id)

    filters = []
    if scope is not None:
        filters.append(Post.branch_id == scope)
    if status_filter is not None:
        filters.append(Post.status == status_filter.value)
    if pillar is not None:
        filters.append(Post.pillar == pillar.value)
    if q and q.strip():
        filters.append(Post.title.ilike(like_pattern(q), escape="\\"))

    total = await db.scalar(select(func.count(Post.id)).where(*filters))

    query = (
        select(Post)
        .options(selectinload(Post.images))
        .where(*filters)
        .order_by(Post.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    posts = result.scalars().all()

    return PostListResponse(
        items=[PostSchema.from_orm_post(p) for p in posts],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.get("/posts/{post_id}", response_model=PostSchema)
async def get_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Récupérer un post publié. Accessible: Public."""
    post = await _get_post_or_404(db, post_id)
    if post.status != PostStatusModel.PUBLISHED:
        raise HTTPException(status_code=404, detail="Post introuvable")
    branch = await db.get(Branch, post.branch_id)
    if branch and branch.status == BranchStatus.PENDING:
        raise HTTPException(status_code=404, detail="Post introuvable")
    return PostSchema.from_orm_post(post)


@router.post("/branches/{branch_id}/posts", response_model=PostSchema, status_code=status.HTTP_201_CREATED)
async def create_post(
    branch_id: int,
    data: PostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer un post dans une antenne. Publication directe (pas de workflow de validation).
    Accessible: Admin de la branche + Super Admin.
    """
    await verify_branch_access(user, branch_id)
    if not await db.get(Branch, branch_id):
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    post = Post(
        branch_id=branch_id,
        author_id=user.id,
        title=data.title,
        content=data.content,
        pillar=data.pillar.value,
        status=data.status.value,
        images=[PostImage(url=url, position=i) for i, url in enumerate(data.images)],
    )
    db.add(post)
    await db.flush()
    record_audit(
        db, user=user, action="create", resource_type="post", resource_id=post.id,
        branch_id=branch_id, details={"title": post.title},
    )
    await db.commit()
    await db.refresh(post)
    await db.refresh(post, attribute_names=["images"])

    return PostSchema.from_orm_post(post)


@router.put("/posts/{post_id}", response_model=PostSchema)
async def update_post(
    post_id: int,
    data: PostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier un post. Accessible: Admin de la branche concernée + Super Admin."""
    post = await _get_post_or_404(db, post_id)
    await verify_branch_access(user, post.branch_id)

    update_data = data.model_dump(exclude_unset=True, exclude={"images"})
    for key, value in update_data.items():
        setattr(post, key, value.value if hasattr(value, "value") else value)

    if data.images is not None:
        post.images.clear()
        for i, url in enumerate(data.images):
            post.images.append(PostImage(url=url, position=i))

    record_audit(
        db, user=user, action="update", resource_type="post", resource_id=post.id,
        branch_id=post.branch_id, details={"title": post.title, "fields": sorted(data.model_fields_set)},
    )
    await db.commit()
    await db.refresh(post)
    await db.refresh(post, attribute_names=["images"])

    return PostSchema.from_orm_post(post)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un post. Accessible: Admin de la branche concernée + Super Admin."""
    post = await _get_post_or_404(db, post_id)
    await verify_branch_access(user, post.branch_id)

    record_audit(
        db, user=user, action="delete", resource_type="post", resource_id=post.id,
        branch_id=post.branch_id, details={"title": post.title},
    )
    await db.delete(post)
    await db.commit()

    return None
