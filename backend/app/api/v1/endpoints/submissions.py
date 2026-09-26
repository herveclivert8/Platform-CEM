"""
Endpoints pour les dossiers de porteurs de projet (ProjectSubmission)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user, get_optional_user
from app.core.permissions import can_access_branch, verify_branch_access
from app.models import Branch, ProjectSubmission, User
from app.models.branch import BranchStatus
from app.schemas.project_submission import (
    ProjectSubmission as ProjectSubmissionSchema,
    ProjectSubmissionCreate,
    ProjectSubmissionListResponse,
)
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification

router = APIRouter(prefix="/branches", tags=["submissions"])


@router.post(
    "/{branch_id}/submissions",
    response_model=ProjectSubmissionSchema,
    status_code=201,
)
async def create_submission(
    branch_id: int,
    data: ProjectSubmissionCreate,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """Soumettre un dossier de projet à une antenne. Accessible: Public."""
    branch = await db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Antenne introuvable")
    # Le public ne peut déposer que sur une antenne active ; un admin peut toujours
    # enregistrer un dossier reçu hors du site.
    if branch.status != BranchStatus.ACTIVE and not can_access_branch(user, branch_id):
        raise HTTPException(status_code=409, detail="Cette antenne n'accepte pas de dossiers pour le moment.")

    submission = ProjectSubmission(branch_id=branch_id, **data.model_dump())
    db.add(submission)
    await db.commit()
    await db.refresh(submission)

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

    return ProjectSubmissionSchema.model_validate(submission)


@router.get("/{branch_id}/submissions", response_model=ProjectSubmissionListResponse)
async def list_submissions(
    branch_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les dossiers soumis à une antenne.
    Accessible: Admin de la branche + Super Admin.
    """
    await verify_branch_access(user, branch_id)

    total = await db.scalar(
        select(func.count(ProjectSubmission.id)).where(ProjectSubmission.branch_id == branch_id)
    )

    query = (
        select(ProjectSubmission)
        .where(ProjectSubmission.branch_id == branch_id)
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


@router.delete("/{branch_id}/submissions/{submission_id}", status_code=204)
async def delete_submission(
    branch_id: int,
    submission_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un dossier. Accessible: Admin de la branche + Super Admin."""
    await verify_branch_access(user, branch_id)

    submission = await db.get(ProjectSubmission, submission_id)
    if not submission or submission.branch_id != branch_id:
        raise HTTPException(status_code=404, detail="Dossier introuvable")

    await db.delete(submission)
    await db.commit()

    return None
