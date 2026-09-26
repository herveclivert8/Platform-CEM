"""
Endpoints pour les dossiers de porteurs de projet (ProjectSubmission)
"""

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_user, get_db, get_optional_user
from app.api.scope import like_pattern, resolve_branch_scope
from app.core.email import email_service
from app.core.permissions import verify_branch_access
from app.core.rate_limit import rate_limit
from app.db.session import AsyncSessionLocal
from app.models import Branch, ProjectSubmission, User
from app.schemas.project_submission import (
    ProjectSubmission as ProjectSubmissionSchema,
    ProjectSubmissionCreate,
    ProjectSubmissionListResponse,
    ProjectSubmissionReceipt,
    ProjectSubmissionUpdate,
    SubmissionStatus,
)
from app.services.audit import record_audit
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification

router = APIRouter(tags=["submissions"])

_public_submission_limit = rate_limit("submission", limit=5, window=60 * 60)


async def limit_anonymous_submissions(request: Request, user: User | None = Depends(get_optional_user)) -> None:
    """Anti-spam du formulaire public ; un admin qui saisit des dossiers papier n'est pas limité."""
    if user is None:
        await _public_submission_limit(request)


async def _send_acknowledgment(submission_id: int) -> None:
    """Tâche de fond : accusé de réception au porteur de projet (une seule fois)."""
    async with AsyncSessionLocal() as db:
        submission = await db.get(ProjectSubmission, submission_id)
        if submission is None or submission.acknowledgment_sent_at is not None:
            return
        branch = await db.get(Branch, submission.branch_id)
        sent = await run_in_threadpool(
            email_service.send_submission_acknowledgment,
            applicant_email=submission.email,
            applicant_name=submission.applicant_name,
            branch_name=branch.name if branch else "",
        )
        if sent:
            submission.acknowledgment_sent_at = datetime.now(timezone.utc)
            await db.commit()


async def _get_submission(db: AsyncSession, user: User, branch_id: int, submission_id: int) -> ProjectSubmission:
    await verify_branch_access(user, branch_id)
    submission = await db.get(ProjectSubmission, submission_id)
    if not submission or submission.branch_id != branch_id:
        raise HTTPException(status_code=404, detail="Dossier introuvable")
    return submission


@router.post(
    "/branches/{branch_id}/submissions",
    response_model=ProjectSubmissionReceipt,
    status_code=201,
    dependencies=[Depends(limit_anonymous_submissions)],
)
async def create_submission(
    branch_id: int,
    data: ProjectSubmissionCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    """
    Soumettre un dossier de projet à une antenne. Accessible: Public
    (un admin l'utilise aussi pour saisir un dossier reçu hors du site).
    """
    if data.website:
        # Champ piège rempli : robot
        raise HTTPException(status_code=400, detail="Dossier refusé.")
    if user is not None:
        await verify_branch_access(user, branch_id)

    branch = await db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    submission = ProjectSubmission(branch_id=branch_id, **data.model_dump(exclude={"website"}))
    db.add(submission)
    if user is not None:
        await db.flush()
        record_audit(
            db, user=user, action="create", resource_type="submission", resource_id=submission.id,
            branch_id=branch_id, details={"applicant": submission.applicant_name},
        )
    await db.commit()
    await db.refresh(submission)

    if user is None:
        # Dossier déposé sur le site : notifier l'antenne et rassurer le porteur de projet
        recipient_ids = await get_branch_notification_recipients(db, branch_id)
        await send_batch_notification(
            recipient_ids,
            title="Nouvelle candidature de projet",
            message=f"{submission.applicant_name} a soumis un projet pour {branch.name}.",
            notification_type="info",
            action_url="/admin/submissions",
            icon="submission",
            db=db,
        )
        background_tasks.add_task(_send_acknowledgment, submission.id)

    return ProjectSubmissionReceipt.model_validate(submission)


@router.get("/submissions", response_model=ProjectSubmissionListResponse)
async def list_submissions(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    branch_id: int | None = Query(None, description="Super Admin : limiter à une antenne"),
    status_filter: SubmissionStatus | None = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100, description="Recherche : nom, email ou résumé"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les dossiers, avec filtres et recherche.
    Accessible: Admin d'antenne (la sienne) + Super Admin (toutes, ou une seule).
    """
    scope = resolve_branch_scope(user, branch_id)

    filters = []
    if scope is not None:
        filters.append(ProjectSubmission.branch_id == scope)
    if status_filter is not None:
        filters.append(ProjectSubmission.status == status_filter.value)
    if q and q.strip():
        pattern = like_pattern(q)
        filters.append(
            or_(
                ProjectSubmission.applicant_name.ilike(pattern, escape="\\"),
                ProjectSubmission.email.ilike(pattern, escape="\\"),
                ProjectSubmission.project_summary.ilike(pattern, escape="\\"),
            )
        )

    total = await db.scalar(select(func.count(ProjectSubmission.id)).where(*filters))

    query = (
        select(ProjectSubmission)
        .where(*filters)
        .order_by(ProjectSubmission.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    submissions = result.scalars().all()

    return ProjectSubmissionListResponse(
        items=[ProjectSubmissionSchema.model_validate(s) for s in submissions],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.patch("/branches/{branch_id}/submissions/{submission_id}", response_model=ProjectSubmissionSchema)
async def update_submission(
    branch_id: int,
    submission_id: int,
    data: ProjectSubmissionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Suivre un dossier : statut et notes internes. Accessible: Admin de la branche + Super Admin."""
    submission = await _get_submission(db, user, branch_id, submission_id)

    details: dict = {"applicant": submission.applicant_name}
    if data.status is not None and data.status.value != submission.status:
        details["status"] = {"from": submission.status, "to": data.status.value}
        submission.status = data.status.value
        submission.status_updated_at = datetime.now(timezone.utc)
    if "internal_notes" in data.model_fields_set:
        submission.internal_notes = (data.internal_notes or "").strip() or None
        details["notes_updated"] = True

    record_audit(
        db, user=user, action="update", resource_type="submission", resource_id=submission.id,
        branch_id=branch_id, details=details,
    )
    await db.commit()
    await db.refresh(submission)
    return ProjectSubmissionSchema.model_validate(submission)


@router.delete("/branches/{branch_id}/submissions/{submission_id}", status_code=204)
async def delete_submission(
    branch_id: int,
    submission_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un dossier. Accessible: Admin de la branche + Super Admin."""
    submission = await _get_submission(db, user, branch_id, submission_id)

    record_audit(
        db, user=user, action="delete", resource_type="submission", resource_id=submission.id,
        branch_id=branch_id, details={"applicant": submission.applicant_name},
    )
    await db.delete(submission)
    await db.commit()

    return None
