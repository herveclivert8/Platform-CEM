"""
Endpoints pour les projets (« Projets en cours » / « Nos réalisations »)

RÈGLES:
- Isolation stricte par branche pour l'Admin d'antenne.
- Les ajouts et modifications d'un admin (d'antenne ou Super Admin) sont publiés directement.
- Les projets proposés par les membres restent en attente (PENDING) jusqu'à leur validation par
  l'admin de leur antenne (ou le Super Admin).
- Le Super Admin est informé (notifications) des activités des antennes, et peut supprimer tout projet.
"""

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin, get_db, get_optional_member_viewer
from app.core.permissions import verify_branch_access
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
from app.services.project_documents import attach_documents
from app.services.translation import delete_translations, localize_schemas, schedule_translation
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification
from app.services.social import delete_social_history, safe_share_resource

router = APIRouter(prefix="/projects", tags=["projects"])

# Champs traduits automatiquement en anglais (les admins ne saisissent que le français)
TRANSLATED_FIELDS = ("title", "summary", "description", "beneficiaries", "location", "goal_unit")


def _schedule_project_translation(background_tasks: BackgroundTasks, project: ProjectSchema) -> None:
    # Seuls les projets validés sont publics (et donc traduits) : un projet l'est à sa validation
    if project.review_status == ProjectReviewStatus.APPROVED:
        schedule_translation(
            background_tasks, "project", project.id, {f: getattr(project, f) for f in TRANSLATED_FIELDS}
        )
        # Publié et visible : partagé une seule fois sur chaque réseau social
        if project.is_visible:
            background_tasks.add_task(safe_share_resource, "project", project.id)


PHASE_LABELS = {"ONGOING": "le projet en cours", "COMPLETED": "la réalisation"}


def _query():
    return select(Project).options(
        selectinload(Project.images),
        selectinload(Project.documents),
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


async def _inform_super_admins(db: AsyncSession, project: Project, actor: User, title: str, verb: str) -> None:
    """Information (pas de validation requise) : activité d'un admin d'antenne sur un projet."""
    result = await db.execute(select(User.id).where(User.role == UserRole.SUPER_ADMIN, User.id != actor.id))
    await send_batch_notification(
        list(result.scalars().all()),
        title=title,
        message=f"{actor.full_name} ({project.branch.name}) a {verb} {_phase_label(project)} « {project.title} ».",
        notification_type="info",
        action_url=_admin_url(project.id),
        icon="project",
        db=db,
    )


async def notify_member_proposal(db: AsyncSession, project: Project, member: User) -> None:
    """Projet proposé par un membre : à valider par l'admin de l'antenne ; le Super Admin est informé."""
    await send_batch_notification(
        await get_branch_notification_recipients(db, project.branch_id),
        title="Projet proposé par un membre",
        message=(
            f"{member.full_name} ({project.branch.name}) propose {_phase_label(project)} « {project.title} ». "
            "En attente de validation par l'admin de l'antenne."
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


def _for_viewer(item: ProjectSchema, viewer: User | None) -> ProjectSchema:
    """Coordonnées de l'auteur et documents joints : montrés seulement aux membres à jour de cotisation et aux admins."""
    if viewer:
        return item
    return item.model_copy(update={"author_email": None, "author_phone": None, "author_avatar_url": None, "documents": []})


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_optional_member_viewer),
    phase: ProjectPhase | None = Query(None),
    branch_id: int | None = Query(None),
    pillar: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    lang: str | None = Query(None, description="« en » : contenus traduits automatiquement"),
):
    """
    Lister les projets validés (publiés). Accessible: Public pour les réalisations ; les projets en
    cours sont réservés aux membres à jour de cotisation et aux admins (absents pour les visiteurs).
    """
    filters = [Project.review_status == ReviewStatusModel.APPROVED, Project.is_visible.is_(True)]
    if viewer is None:
        filters.append(Project.phase == ProjectPhase.COMPLETED.value)
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
    items = [_for_viewer(ProjectSchema.from_orm_project(p), viewer) for p in result.scalars().all()]
    return ProjectListResponse(
        items=await localize_schemas(db, "project", items, TRANSLATED_FIELDS, lang),
        **_paginate(total, page, page_size),
    )


# ============================================
# Back-office
# ============================================


@router.get("/admin", response_model=ProjectAdminListResponse)
async def list_projects_admin(
    user: User = Depends(get_current_admin),
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
    user: User = Depends(get_current_admin),
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
    viewer: User | None = Depends(get_optional_member_viewer),
    lang: str | None = Query(None, description="« en » : contenu traduit automatiquement"),
):
    """Récupérer un projet validé. Accessible: Public (réalisations) ; membres et admins (projets en cours)."""
    project = await _get_project_or_404(db, project_id)
    if project.review_status != ReviewStatusModel.APPROVED or not project.is_visible:
        raise HTTPException(status_code=404, detail="Project not found")
    if viewer is None and project.phase == ProjectPhase.ONGOING.value:
        # Code lu par le frontend pour afficher « réservé aux membres » (inscription / connexion)
        raise HTTPException(status_code=403, detail="MEMBERS_ONLY")
    [item] = await localize_schemas(db, "project", [ProjectSchema.from_orm_project(project)], TRANSLATED_FIELDS, lang)
    return _for_viewer(item, viewer)


@router.post("", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Ajouter un projet en cours ou une réalisation, publié directement (admin de l'antenne ou
    Super Admin). Le Super Admin est informé des ajouts des antennes.
    """
    await verify_branch_access(user, data.branch_id)
    if not await db.get(Branch, data.branch_id):
        raise HTTPException(status_code=404, detail="Branch not found")

    project = Project(
        **data.model_dump(exclude={"images", "pillar", "phase", "document_ids"}),
        pillar=data.pillar.value,
        phase=data.phase.value,
        author_id=user.id,
        review_status=ReviewStatusModel.APPROVED,
        reviewed_by_id=user.id,
        reviewed_at=datetime.now(timezone.utc),
        images=[ProjectImage(url=url, position=i) for i, url in enumerate(data.images)],
    )
    db.add(project)
    await db.flush()
    await db.refresh(project, ["documents"])
    await attach_documents(db, project, data.document_ids, user)
    await db.commit()

    project = await _get_project_or_404(db, project.id)
    if user.role != UserRole.SUPER_ADMIN:
        await _inform_super_admins(db, project, user, "Nouvelle publication", "publié")

    result = await _reload(db, project.id)
    _schedule_project_translation(background_tasks, result)
    return result


@router.put("/{project_id}", response_model=ProjectSchema)
async def update_project(
    project_id: int,
    data: ProjectUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifier un projet (y compris le passer de « en cours » à « réalisé »). Le statut de validation
    est conservé (un projet publié reste en ligne) ; le Super Admin est informé des modifications
    faites par les antennes.
    """
    project = await _get_project_or_404(db, project_id)
    await verify_branch_access(user, project.branch_id)

    # Le formulaire renvoie tous les champs : on compare les valeurs réellement modifiées
    update_data = data.dict(exclude_unset=True, exclude={"images", "document_ids"})
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
    if data.document_ids is not None:
        if [d.id for d in project.documents] != data.document_ids:
            changed.add("documents")
        await attach_documents(db, project, data.document_ids, user)

    is_super = user.role == UserRole.SUPER_ADMIN
    # Afficher / masquer ne change pas le contenu : pas de notification
    visibility_only = changed == {"is_visible"}
    progress_only = (
        bool(changed) and changed <= {"progress_value", "is_visible"} and "progress_value" in changed
        and project.review_status == ReviewStatusModel.APPROVED
    )

    await db.commit()

    if not is_super and changed and not visibility_only:
        project = await _get_project_or_404(db, project.id)
        if progress_only:
            await _notify_progress(db, project, user)
        else:
            await _inform_super_admins(db, project, user, "Publication modifiée", "modifié")

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
    project = await _get_project_or_404(db, project_id)
    # L'admin de l'antenne du projet valide ; le Super Admin le peut aussi (toutes antennes)
    await verify_branch_access(user, project.branch_id)

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

    # Un membre n'a pas de centre de notifications : il suit le statut depuis son espace membre
    if project.author_id and project.author_id != user.id and project.author and project.author.is_admin:
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

    # Décision d'un admin d'antenne : le Super Admin en est informé
    if user.role != UserRole.SUPER_ADMIN:
        if approve:
            await _inform_super_admins(db, project, user, "Projet validé", "validé et publié")
        else:
            await _inform_super_admins(db, project, user, "Projet refusé", "refusé")

    result = await _reload(db, project_id)
    _schedule_project_translation(background_tasks, result)  # publié dès la validation : traduit aussitôt
    return result


@router.post("/{project_id}/approve", response_model=ProjectSchema)
async def approve_project(
    project_id: int,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Valider (et publier immédiatement) un projet. Accessible: Admin de l'antenne du projet + Super Admin."""
    return await _review(background_tasks, project_id, user, db, approve=True)


@router.post("/{project_id}/reject", response_model=ProjectSchema)
async def reject_project(
    project_id: int,
    data: ProjectReject,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Refuser un projet, avec un motif. Accessible: Admin de l'antenne du projet + Super Admin."""
    return await _review(background_tasks, project_id, user, db, approve=False, reason=data.reason)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un projet. Accessible: Admin de la branche concernée + Super Admin."""
    project = await _get_project_or_404(db, project_id)
    await verify_branch_access(user, project.branch_id)
    await delete_translations(db, "project", [project.id])
    await delete_social_history(db, "project", [project.id])
    await db.delete(project)
    await db.commit()
    return None
