"""
Endpoints d'audit logging - Visualiser les logs d'opérations
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import desc, func
from datetime import datetime, timedelta, timezone

from app.api.deps import get_db, get_current_user
from app.core.permissions import verify_super_admin_only
from app.models.user import User
from app.models.audit import AuditLog
from pydantic import ConfigDict, BaseModel
from typing import List, Optional


class AuditLogResponse(BaseModel):
    """Schéma de réponse pour audit log"""
    id: int
    action: str
    resource_type: str
    resource_id: Optional[int]
    user_email: Optional[str]
    branch_id: Optional[int]
    details: Optional[dict]
    ip_address: Optional[str]
    success: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuditLogListResponse(BaseModel):
    """Réponse pagée pour audit logs"""
    items: List[AuditLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuditStatsResponse(BaseModel):
    total_events: int
    failed_logins: int
    publications_created: int
    admins_created: int
    last_event: Optional[datetime]


router = APIRouter(prefix="/super-admin/audit", tags=["audit"])


@router.get("", response_model=AuditLogListResponse, status_code=200)
async def list_audit_logs(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    branch_id: Optional[int] = Query(None),
    days: int = Query(7, ge=1, le=90),
) -> AuditLogListResponse:
    """
    Lister les logs d'audit (super admin only)

    Query params:
      - page: Page number
      - page_size: Items per page
      - action: Filter by action (create, update, delete, login)
      - resource_type: Filter by resource type (publication, branch, user)
      - branch_id: Filter by branch
      - days: Look back N days (1-90)

    Response:
      - Paginated list of audit logs
    """
    await verify_super_admin_only(user)

    # Date filter
    start_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    # Build query
    query = select(AuditLog).where(AuditLog.created_at >= start_date)
    count_query = select(func.count()).select_from(AuditLog).where(AuditLog.created_at >= start_date)

    if action:
        query = query.where(AuditLog.action == action)
        count_query = count_query.where(AuditLog.action == action)
    if resource_type:
        query = query.where(AuditLog.resource_type == resource_type)
        count_query = count_query.where(AuditLog.resource_type == resource_type)
    if branch_id:
        query = query.where(AuditLog.branch_id == branch_id)
        count_query = count_query.where(AuditLog.branch_id == branch_id)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Sort and paginate
    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)

    result = await db.execute(query)
    items = result.scalars().all()

    return AuditLogListResponse(
        items=[AuditLogResponse.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=AuditStatsResponse, status_code=200)
async def get_audit_stats(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    days: int = Query(7, ge=1, le=90),
) -> AuditStatsResponse:
    """
    Obtenir les statistiques des logs d'audit

    Returns:
      - total_events: Nombre total d'événements
      - failed_logins: Tentatives de connexion échouées
      - publications_created: Publications créées
      - admins_created: Administrateurs créés
      - last_event: Dernier événement enregistré
    """
    await verify_super_admin_only(user)

    start_date = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=days)

    # Total events
    total = await db.execute(
        select(func.count(AuditLog.id)).where(AuditLog.created_at >= start_date)
    )
    total_events = total.scalar() or 0

    # Failed logins
    failed_logins = await db.execute(
        select(func.count(AuditLog.id)).where(
            (AuditLog.created_at >= start_date) &
            (AuditLog.action == "login") &
            (AuditLog.success == 0)
        )
    )

    # Publications created
    publications = await db.execute(
        select(func.count(AuditLog.id)).where(
            (AuditLog.created_at >= start_date) &
            (AuditLog.resource_type == "publication") &
            (AuditLog.action == "create")
        )
    )

    # Admins created
    admins = await db.execute(
        select(func.count(AuditLog.id)).where(
            (AuditLog.created_at >= start_date) &
            (AuditLog.resource_type == "user") &
            (AuditLog.action == "create")
        )
    )

    # Last event
    last_event_result = await db.execute(
        select(AuditLog).order_by(desc(AuditLog.created_at)).limit(1)
    )
    last_event = last_event_result.scalar_one_or_none()

    return AuditStatsResponse(
        total_events=total_events,
        failed_logins=failed_logins.scalar() or 0,
        publications_created=publications.scalar() or 0,
        admins_created=admins.scalar() or 0,
        last_event=last_event.created_at if last_event else None,
    )
