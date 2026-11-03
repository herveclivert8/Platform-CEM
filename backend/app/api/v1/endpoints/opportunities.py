"""
Opportunités du Club : candidatures des membres à la poursuite d'études en Italie.
Postuler est réservé aux membres validés rattachés à une antenne (numéro d'adhérent attribué) ;
les candidatures ne sont visibles que du Super Admin.
"""

from datetime import datetime
from pathlib import Path
from typing import Literal, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.scope import like_pattern
from app.core.permissions import verify_super_admin_only
from app.core.rate_limit import rate_limit
from app.models.opportunity_application import (
    OPEN_STATUSES,
    PROGRAM_ITALY,
    OpportunityApplication,
)
from app.models.user import MembershipStatus, User, UserRole
from app.services.audit import record_audit
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification
from app.services.project_documents import check_document

router = APIRouter(prefix="/opportunities", tags=["opportunities"])

MOTIVATION_MAX_LINES = 5
MOTIVATION_MAX_LENGTH = 800

Status = Literal["NEW", "IN_REVIEW", "ACCEPTED", "REJECTED"]


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    program: str
    last_name: str
    first_name: str
    member_number: str
    branch_name: Optional[str] = None
    phone: str
    email: str
    study_level: str
    faculty: str
    major: str
    motivation: str
    dossier_file_name: str
    dossier_size: int
    status: str
    created_at: datetime


class MyApplication(BaseModel):
    """Dernière candidature du membre (sans le détail) : pour ne pas postuler deux fois."""
    id: int
    status: str
    created_at: datetime


def _check_eligible(user: User) -> None:
    """Membre actif validé, rattaché à une antenne et numéroté (pas un bienfaiteur ni un parrain)."""
    if (
        user.role != UserRole.MEMBER
        or user.is_supporter
        or user.membership_status != MembershipStatus.ACTIVE
        or not user.branch_id
        or not user.member_number
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux membres du Club dont l'adhésion est validée et rattachés à une antenne.",
        )


def _clean(value: str, field: str, max_length: int = 255) -> str:
    value = value.strip()
    if not value:
        raise HTTPException(status_code=422, detail=f"Champ obligatoire : {field}")
    if len(value) > max_length:
        raise HTTPException(status_code=422, detail=f"{field} : {max_length} caractères maximum")
    return value


# ============================================
# Membres
# ============================================


@router.get("/italy/applications/me", response_model=Optional[MyApplication])
async def my_italy_application(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Dernière candidature du membre connecté (ou null). Accessible: membre connecté."""
    application = await db.scalar(
        select(OpportunityApplication)
        .where(OpportunityApplication.user_id == user.id, OpportunityApplication.program == PROGRAM_ITALY)
        .order_by(OpportunityApplication.created_at.desc())
        .limit(1)
    )
    return MyApplication(id=application.id, status=application.status, created_at=application.created_at) if application else None


@router.post(
    "/italy/applications",
    response_model=MyApplication,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("opportunity_application", limit=5, window=60 * 60))],
)
async def apply_italy(
    last_name: str = Form(...),
    first_name: str = Form(...),
    phone: str = Form(...),
    email: str = Form(...),
    study_level: str = Form(...),
    faculty: str = Form(...),
    major: str = Form(...),
    motivation: str = Form(...),
    dossier: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Postuler à l'accompagnement pour une poursuite d'études en Italie, avec la lettre de motivation
    (5 lignes maximum) et le dossier de financement. Accessible: membre validé rattaché à une antenne.
    """
    _check_eligible(user)
    if await db.scalar(
        select(OpportunityApplication.id).where(
            OpportunityApplication.user_id == user.id,
            OpportunityApplication.program == PROGRAM_ITALY,
            OpportunityApplication.status.in_(OPEN_STATUSES),
        )
    ):
        raise HTTPException(status_code=409, detail="Vous avez déjà une candidature en cours d'examen.")

    motivation = _clean(motivation, "Lettre de motivation", MOTIVATION_MAX_LENGTH)
    if len([line for line in motivation.splitlines() if line.strip()]) > MOTIVATION_MAX_LINES:
        raise HTTPException(status_code=422, detail="Lettre de motivation : 5 lignes maximum")
    email = _clean(email, "Courriel")
    if "@" not in email:
        raise HTTPException(status_code=422, detail="Courriel invalide")

    if not dossier.filename:
        raise HTTPException(status_code=400, detail="Dossier de financement manquant")
    content = await dossier.read()
    mime = check_document(dossier.filename, content)

    branch = user.branch
    application = OpportunityApplication(
        program=PROGRAM_ITALY,
        user_id=user.id,
        last_name=_clean(last_name, "Nom"),
        first_name=_clean(first_name, "Prénom"),
        # Le numéro vient du compte : il ne peut pas être celui d'un autre membre
        member_number=user.member_number,
        branch_name=branch.name if branch else None,
        phone=_clean(phone, "Téléphone", 50),
        email=email.lower(),
        study_level=_clean(study_level, "Niveau d'études", 100),
        faculty=_clean(faculty, "Faculté"),
        major=_clean(major, "Mention"),
        motivation=motivation,
        dossier_file_name=Path(dossier.filename).name[:255],
        dossier_content_type=mime,
        dossier_size=len(content),
        dossier_content=content,
    )
    db.add(application)
    await db.commit()

    await send_batch_notification(
        await get_branch_notification_recipients(db, None),
        title="Nouvelle candidature : études en Italie",
        message=f"{application.first_name} {application.last_name} ({application.member_number}) a postulé.",
        notification_type="info",
        action_url="/admin/opportunities",
        icon="submission",
        db=db,
    )
    return MyApplication(id=application.id, status=application.status, created_at=application.created_at)


# ============================================
# Back-office (Super Admin)
# ============================================


class ApplicationCounts(BaseModel):
    NEW: int = 0
    IN_REVIEW: int = 0
    ACCEPTED: int = 0
    REJECTED: int = 0


class ApplicationListResponse(BaseModel):
    items: list[ApplicationRead]
    total: int
    page: int
    page_size: int
    total_pages: int
    counts: ApplicationCounts


class ApplicationUpdate(BaseModel):
    status: Status


async def _get_application(db: AsyncSession, application_id: int) -> OpportunityApplication:
    application = await db.get(OpportunityApplication, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    return application


@router.get("/applications", response_model=ApplicationListResponse)
async def list_applications(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[Status] = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100, description="Nom, e-mail, numéro d'adhérent, faculté"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lister les candidatures, avec le décompte par statut. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    count_rows = await db.execute(
        select(OpportunityApplication.status, func.count(OpportunityApplication.id)).group_by(OpportunityApplication.status)
    )
    counts = ApplicationCounts(**{s: n for s, n in count_rows.all()})

    filters = []
    if status_filter:
        filters.append(OpportunityApplication.status == status_filter)
    if q and q.strip():
        pattern = like_pattern(q)
        filters.append(
            or_(*(
                column.ilike(pattern, escape="\\")
                for column in (
                    OpportunityApplication.last_name,
                    OpportunityApplication.first_name,
                    OpportunityApplication.email,
                    OpportunityApplication.member_number,
                    OpportunityApplication.faculty,
                )
            ))
        )
    total = await db.scalar(select(func.count(OpportunityApplication.id)).where(*filters)) or 0
    result = await db.execute(
        select(OpportunityApplication)
        .where(*filters)
        .order_by(OpportunityApplication.created_at.desc(), OpportunityApplication.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return ApplicationListResponse(
        items=[ApplicationRead.model_validate(a) for a in result.scalars().all()],
        total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size, counts=counts,
    )


@router.patch("/applications/{application_id}", response_model=ApplicationRead)
async def update_application(
    application_id: int,
    data: ApplicationUpdate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Changer le statut d'une candidature. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    application = await _get_application(db, application_id)
    application.status = data.status
    record_audit(
        db, user=user, action="update", resource_type="opportunity_application", resource_id=application.id,
        details={"status": data.status},
    )
    await db.commit()
    await db.refresh(application)
    return ApplicationRead.model_validate(application)


@router.get("/applications/{application_id}/dossier")
async def download_dossier(
    application_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    """Télécharger le dossier de financement. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    application = await db.scalar(
        select(OpportunityApplication)
        .options(undefer(OpportunityApplication.dossier_content))
        .where(OpportunityApplication.id == application_id)
    )
    if application is None:
        raise HTTPException(status_code=404, detail="Candidature introuvable")
    return Response(
        content=application.dossier_content,
        media_type=application.dossier_content_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(application.dossier_file_name)}",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@router.delete("/applications/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    """Supprimer définitivement une candidature et son dossier. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    application = await _get_application(db, application_id)
    record_audit(db, user=user, action="delete", resource_type="opportunity_application", resource_id=application.id)
    await db.delete(application)
    await db.commit()
    return None
