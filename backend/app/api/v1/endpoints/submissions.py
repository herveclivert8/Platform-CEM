"""
Endpoints pour les dossiers de porteurs de projet (ProjectSubmission)
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user
from app.core.permissions import verify_branch_access
from app.models import Branch, ProjectSubmission, User
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
    db: AsyncSession = Depends(get_db),
):
    """Soumettre un dossier de projet à une antenne. Accessible: Public."""
    branch = await db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    submission = ProjectSubmission(branch_id=branch_id, **data.dict())
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

    return ProjectSubmissionSchema.from_orm(submission)


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
        items=[ProjectSubmissionSchema.from_orm(s) for s in submissions],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )
