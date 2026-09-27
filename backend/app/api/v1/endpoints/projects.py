"""
Endpoints pour les projets (« Projets en cours » / « Nos réalisations »)

RÈGLES:
- Isolation stricte par branche pour l'Admin d'antenne.
- Tout ajout ou modification par un Admin d'antenne passe en PENDING (retiré du site public)
  et notifie les Super Admins ; seul un Super Admin peut valider ou refuser.
- Les ajouts d'un Super Admin sont publiés directement.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.core.permissions import verify_branch_access, verify_super_admin_only
from app.models import Branch, Project, ProjectImage, User
from app.models.project import ProjectReviewStatus as ReviewStatusModel
from app.models.user import UserRole
from app.schemas.project import (
    Project as ProjectSchema,
    ProjectAdminListResponse,
    ProjectCreate,
    ProjectListResponse,
    ProjectPhase,
    ProjectReject,
    ProjectReviewStatus,
    ProjectStatusCounts,
    ProjectUpdate,
    _check_dates,
)
from app.services.audit import record_audit
from app.services.translation import delete_translations, localize_schemas, schedule_translation
from app.services.notification_service import send_batch_notification

router = APIRouter(prefix="/projects", tags=["projects"])

# Champs traduits automatiquement en anglais (les admins ne saisissent que le français)
TRANSLATED_FIELDS = ("title", "summary", "description", "beneficiaries", "location", "goal_unit")


def _schedule_project_translation(background_tasks: BackgroundTasks, project: ProjectSchema) -> None:
    # Seuls les projets validés sont publics (et donc traduits) : un projet l'est à sa validation
    if project.review_status == ProjectReviewStatus.APPROVED:
        schedule_translation(
            background_tasks, "project", project.id, {f: getattr(project, f) for f in TRANSLATED_FIELDS}
        )


PHASE_LABELS = {"ONGOING": "le projet en cours", "COMPLETED": "la réalisation"}


def _query():
    return select(Project).options(
        selectinload(Project.images),
        selectinload(Project.branch),
        selectinload(Project.author),
    )


async def _get_project_or_404(db: AsyncSession, project_id: int) -> Project:
    result = await db.execute(_query().where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _reload(db: AsyncSession, project_id: int) -> ProjectSchema:
    # populate_existing: après un commit, rafraîchir aussi les relations (images, auteur) déjà en session.
    result = await db.execute(_query().where(Project.id == project_id).execution_options(populate_existing=True))
    return ProjectSchema.from_orm_project(result.scalar_one())


def _admin_url(project_id: int) -> str:
    return f"/admin/projects?id={project_id}"


def _phase_label(project: Project) -> str:
    phase = project.phase.value if hasattr(project.phase, "value") else project.phase
    return PHASE_LABELS[phase]


async def _notify_super_admins(db: AsyncSession, project: Project, author: User, *, is_update: bool) -> None:
    result = await db.execute(select(User.id).where(User.role == UserRole.SUPER_ADMIN))
    verb = "modifié" if is_update else "ajouté"
    await send_batch_notification(
        list(result.scalars().all()),
        title="Validation requise",
        message=(
            f"{author.full_name} ({project.branch.name}) a {verb} {_phase_label(project)} "
            f"« {project.title} ». En attente de votre validation."
        ),
        notification_type="warning",
        action_url=_admin_url(project.id),
        icon="project",
        db=db,
    )


async def _notify_progress(db: AsyncSession, project: Project, author: User) -> None:
    """Information (pas de validation requise) : avancement mis à jour sur un projet publié."""
    result = await db.execute(select(User.id).where(User.role == UserRole.SUPER_ADMIN))
    progress = f"{project.progress_value or 0:,}".replace(",", "\u202f")
    goal = f"{project.goal_value:,}".replace(",", "\u202f") if project.goal_value else "?"
    await send_batch_notification(
        list(result.scalars().all()),
        title="Avancement mis à jour",
        message=(
            f"{author.full_name} ({project.branch.name}) : « {project.title} » — "
            f"{progress} / {goal} {project.goal_unit or ''}".rstrip()
        ),
        notification_type="info",
        action_url=_admin_url(project.id),
        icon="project",
        db=db,
    )


def _paginate(total: int, page: int, page_size: int) -> dict:
    return {"total": total, "page": page, "page_size": page_size, "total_pages": (total + page_size - 1) // page_size}


# ============================================
# Public
# ============================================


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    phase: ProjectPhase | None = Query(None),
    branch_id: int | None = Query(None),
    pillar: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    lang: str | None = Query(None, description="« en » : contenus traduits automatiquement"),
):
    """Lister les projets validés (publiés). Accessible: Public."""
    filters = [Project.review_status == ReviewStatusModel.APPROVED, Project.is_visible.is_(True)]
    if phase:
        filters.append(Project.phase == phase.value)
    if branch_id:
        filters.append(Project.branch_id == branch_id)
    if pillar:
        filters.append(Project.pillar == pillar)

    total = await db.scalar(select(func.count(Project.id)).where(*filters)) or 0
    order = Project.end_date.desc() if phase == ProjectPhase.COMPLETED else Project.created_at.desc()
    result = await db.execute(
        _query().where(*filters).order_by(order, Project.id.desc()).offset((page - 1) * page_size).limit(page_size)
    )
    items = [ProjectSchema.from_orm_project(p) for p in result.scalars().all()]
    return ProjectListResponse(
        items=await localize_schemas(db, "project", items, TRANSLATED_FIELDS, lang),
        **_paginate(total, page, page_size),
    )


# ============================================
# Back-office
# ============================================


@router.get("/admin", response_model=ProjectAdminListResponse)
async def list_projects_admin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    review_status: ProjectReviewStatus | None = Query(None),
    phase: ProjectPhase | None = Query(None),
    branch_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les projets tous statuts confondus, avec le décompte par statut.
    Accessible: Super Admin (toutes antennes, filtre optionnel) + Admin d'antenne (sa branche uniquement).
    """
    scope = []
    if user.role == UserRole.SUPER_ADMIN:
        if branch_id:
            scope.append(Project.branch_id == branch_id)
    else:
        if user.branch_id is None:
            raise HTTPException(status_code=403, detail="Access denied: no branch assigned")
        scope.append(Project.branch_id == user.branch_id)
    if phase:
        scope.append(Project.phase == phase.value)

    count_rows = await db.execute(
        select(Project.review_status, func.count(Project.id)).where(*scope).group_by(Project.review_status)
    )
    counts = ProjectStatusCounts(**{(s.value if hasattr(s, "value") else s): n for s, n in count_rows.all()})

    filters = list(scope)
    if review_status:
        filters.append(Project.review_status == review_status.value)

    total = await db.scalar(select(func.count(Project.id)).where(*filters)) or 0
    result = await db.execute(
        _query()
        .where(*filters)
        .order_by(Project.updated_at.desc(), Project.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return ProjectAdminListResponse(
        items=[ProjectSchema.from_orm_project(p) for p in result.scalars().all()],
        counts=counts,
        **_paginate(total, page, page_size),
    )


@router.get("/admin/{project_id}", response_model=ProjectSchema)
async def get_project_admin(
    project_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Récupérer un projet quel que soit son statut. Accessible: Admin de la branche + Super Admin."""
    project = await _get_project_or_404(db, project_id)
    await verify_branch_access(user, project.branch_id)
    return ProjectSchema.from_orm_project(project)


@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    lang: str | None = Query(None, description="« en » : contenu traduit automatiquement"),
):
    """Récupérer un projet validé. Accessible: Public."""
    project = await _get_project_or_404(db, project_id)
    if project.review_status != ReviewStatusModel.APPROVED or not project.is_visible:
        raise HTTPException(status_code=404, detail="Project not found")
    [item] = await localize_schemas(db, "project", [ProjectSchema.from_orm_project(project)], TRANSLATED_FIELDS, lang)
    return item


@router.post("", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ajouter un projet en cours ou une réalisation.
    Admin d'antenne (sa branche) → PENDING + notification aux Super Admins.
    Super Admin → publié directement.
    """
    await verify_branch_access(user, data.branch_id)
    if not await db.get(Branch, data.branch_id):
        raise HTTPException(status_code=404, detail="Branch not found")

    is_super = user.role == UserRole.SUPER_ADMIN
    project = Project(
        **data.dict(exclude={"images", "pillar", "phase"}),
        pillar=data.pillar.value,
        phase=data.phase.value,
        author_id=user.id,
        review_status=ReviewStatusModel.APPROVED if is_super else ReviewStatusModel.PENDING,
        reviewed_by_id=user.id if is_super else None,
        reviewed_at=datetime.now(timezone.utc) if is_super else None,
        images=[ProjectImage(url=url, position=i) for i, url in enumerate(data.images)],
    )
    db.add(project)
    await db.commit()

    project = await _get_project_or_404(db, project.id)
    if not is_super:
        await _notify_super_admins(db, project, user, is_update=False)

    result = await _reload(db, project.id)
    _schedule_project_translation(background_tasks, result)
    return result


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifier un projet (y compris le passer de « en cours » à « réalisé »).
    Admin d'antenne → repasse en PENDING (retiré du site) + notification aux Super Admins, sauf si
    seule la valeur atteinte d'un projet publié change (« 5 200 → 5 600 livres ») : il reste en
    ligne et le siège en est simplement informé.
    Super Admin → le statut de validation est conservé.
    """
    project = await _get_project_or_404(db, project_id)
    await verify_branch_access(user, project.branch_id)

    # Le formulaire renvoie tous les champs : on compare les valeurs réellement modifiées
    update_data = data.dict(exclude_unset=True, exclude={"images"})
    changed: set[str] = set()
    for key, value in update_data.items():
        new = value.value if hasattr(value, "value") else value
        old = getattr(project, key)
        if (old.value if hasattr(old, "value") else old) != new:
            changed.add(key)
        setattr(project, key, new)

    try:
        _check_dates(ProjectPhase(getattr(project.phase, "value", project.phase)), project.start_date, project.end_date)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if data.images is not None and [img.url for img in project.images] != data.images:
        changed.add("images")
    if data.images is not None:
        project.images.clear()
        for i, url in enumerate(data.images):
            project.images.append(ProjectImage(url=url, position=i))

    is_super = user.role == UserRole.SUPER_ADMIN
    # Sans nouvelle validation : afficher / masquer (le contenu ne change pas), et mettre à jour la
    # seule valeur atteinte d'un projet déjà validé.
    visibility_only = changed == {"is_visible"}
    progress_only = (
        bool(changed) and changed <= {"progress_value", "is_visible"} and "progress_value" in changed
        and project.review_status == ReviewStatusModel.APPROVED
    )
    needs_review = not is_super and bool(changed) and not visibility_only and not progress_only
    if needs_review:
        project.review_status = ReviewStatusModel.PENDING
        project.rejection_reason = None
        project.reviewed_by_id = None
        project.reviewed_at = None

    await db.commit()

    if not is_super and (needs_review or progress_only):
        project = await _get_project_or_404(db, project.id)
        if needs_review:
            await _notify_super_admins(db, project, user, is_update=True)
        else:
            await _notify_progress(db, project, user)

    result = await _reload(db, project_id)
    _schedule_project_translation(background_tasks, result)
    return result


async def _review(
    background_tasks: BackgroundTasks,
    project_id: int,
    user: User,
    db: AsyncSession,
    *,
    approve: bool,
    reason: str | None = None,
) -> ProjectSchema:
    await verify_super_admin_only(user)
    project = await _get_project_or_404(db, project_id)

    project.review_status = ReviewStatusModel.APPROVED if approve else ReviewStatusModel.REJECTED
    project.rejection_reason = None if approve else reason
    project.reviewed_by_id = user.id
    project.reviewed_at = datetime.now(timezone.utc)
    record_audit(
        db,
        action="confirm" if approve else "reject",
        resource_type="project",
        user=user,
        resource_id=project.id,
        branch_id=project.branch_id,
        details={"title": project.title, **({} if approve else {"reason": reason})},
    )
    await db.commit()

    if project.author_id and project.author_id != user.id:
        if approve:
            title, message, kind = (
                "Ajout validé",
                f"Votre ajout « {project.title} » a été validé et est maintenant publié sur le site.",
                "success",
            )
        else:
            title, message, kind = (
                "Ajout refusé",
                f"Votre ajout « {project.title} » n'a pas été validé. Motif : {reason}",
                "error",
            )
        await send_batch_notification(
            [project.author_id],
            title=title,
            message=message,
            notification_type=kind,
            action_url=_admin_url(project.id),
            icon="project",
            db=db,
        )

    result = await _reload(db, project_id)
    _schedule_project_translation(background_tasks, result)  # publié dès la validation : traduit aussitôt
    return result


@router.post("/{project_id}/approve", response_model=ProjectSchema)
async def approve_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Valider (et publier immédiatement) un projet. Accessible: Super Admin uniquement."""
    return await _review(background_tasks, project_id, user, db, approve=True)


@router.post("/{project_id}/reject", response_model=ProjectSchema)
async def reject_project(
    project_id: int,
    data: ProjectReject,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Refuser un projet, avec un motif transmis à l'auteur. Accessible: Super Admin uniquement."""
    return await _review(background_tasks, project_id, user, db, approve=False, reason=data.reason)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un projet. Accessible: Admin de la branche concernée + Super Admin."""
    project = await _get_project_or_404(db, project_id)
    await verify_branch_access(user, project.branch_id)
    await delete_translations(db, "project", [project.id])
    await db.delete(project)
    await db.commit()
    return None
