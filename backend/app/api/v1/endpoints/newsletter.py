"""
Lettre d'information : inscription avec double confirmation, désinscription, et gestion des
abonnés par le Super Admin (liste, export CSV pour l'outil d'envoi, suppression RGPD).
"""

import csv
import hashlib
import io
import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from fastapi.responses import Response
from jinja2 import Template
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.scope import like_pattern
from app.core.config import settings
from app.core.email import email_service
from app.core.permissions import verify_super_admin_only
from app.models.newsletter import (
    STATUS_CONFIRMED,
    STATUS_PENDING,
    STATUS_UNSUBSCRIBED,
    NewsletterSubscriber,
)
from app.models.user import User
from app.services.audit import record_audit
from app.services.translation import normalize_lang

router = APIRouter(prefix="/newsletter", tags=["newsletter"])

CONFIRM_LINK_VALIDITY = timedelta(days=7)
# Même réponse que l'adresse soit nouvelle, déjà inscrite ou piège anti-robot : rien ne révèle
# qui est abonné.
SUBSCRIBE_ACCEPTED = "Si l'adresse est valide, un e-mail de confirmation vient d'être envoyé."


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


# ============================================
# Public
# ============================================


class SubscribeRequest(BaseModel):
    email: EmailStr
    lang: str = Field("fr", max_length=8)
    website: Optional[str] = Field(None, max_length=255)  # piège anti-robot (doit rester vide)


class TokenRequest(BaseModel):
    token: str = Field(..., min_length=10, max_length=200)


class MessageResponse(BaseModel):
    message: str


EMAIL_TEXTS = {
    "fr": {
        "subject": "Confirmez votre inscription à la lettre du Club Excellence Madagascar",
        "title": "Confirmez votre inscription",
        "intro": "Merci de votre intérêt pour le Club Excellence Madagascar ! Cliquez sur le bouton ci-dessous pour confirmer votre inscription à notre lettre d'information.",
        "button": "Confirmer mon inscription",
        "expiry": "Ce lien est valable 7 jours. Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet e-mail.",
        "unsubscribe": "Se désinscrire",
    },
    "en": {
        "subject": "Confirm your subscription to the Club Excellence Madagascar newsletter",
        "title": "Confirm your subscription",
        "intro": "Thank you for your interest in Club Excellence Madagascar! Click the button below to confirm your subscription to our newsletter.",
        "button": "Confirm my subscription",
        "expiry": "This link is valid for 7 days. If you did not request this, simply ignore this email.",
        "unsubscribe": "Unsubscribe",
    },
}

EMAIL_TEMPLATE = Template(
    """<html><body style="font-family: Arial, sans-serif; color: #0f172a">
<h2>{{ t.title }}</h2>
<p>{{ t.intro }}</p>
<p><a href="{{ confirm_link }}" style="display:inline-block;padding:10px 18px;background:#059669;color:#fff;border-radius:8px;text-decoration:none">{{ t.button }}</a></p>
<p style="color:#64748b;font-size:13px">{{ t.expiry }}</p>
<p style="color:#94a3b8;font-size:12px"><a href="{{ unsubscribe_link }}" style="color:#94a3b8">{{ t.unsubscribe }}</a></p>
</body></html>""",
    autoescape=True,
)


def _send_confirmation(email: str, lang: str, confirm_token: str, unsubscribe_token: str) -> None:
    base = settings.FRONTEND_URL.rstrip("/")
    texts = EMAIL_TEXTS[lang]
    email_service.send_email(
        to_email=email,
        subject=texts["subject"],
        html_content=EMAIL_TEMPLATE.render(
            t=texts,
            confirm_link=f"{base}/newsletter/confirmation?token={confirm_token}",
            unsubscribe_link=f"{base}/newsletter/desinscription?token={unsubscribe_token}",
        ),
    )


@router.post("/subscribe", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def subscribe(data: SubscribeRequest, background_tasks: BackgroundTasks, db: AsyncSession = Depends(get_db)):
    """S'inscrire : envoie un e-mail de confirmation (double opt-in). Accessible: Public."""
    if data.website:
        return MessageResponse(message=SUBSCRIBE_ACCEPTED)

    email = data.email.strip().lower()
    lang = normalize_lang(data.lang)
    subscriber = await db.scalar(select(NewsletterSubscriber).where(NewsletterSubscriber.email == email))
    if subscriber is not None and subscriber.status == STATUS_CONFIRMED:
        return MessageResponse(message=SUBSCRIBE_ACCEPTED)  # déjà abonné : rien à renvoyer

    confirm_token, unsubscribe_token = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
    if subscriber is None:
        subscriber = NewsletterSubscriber(email=email)
        db.add(subscriber)
    subscriber.lang = lang
    subscriber.status = STATUS_PENDING
    subscriber.confirm_token_hash = _hash(confirm_token)
    subscriber.confirm_expires_at = datetime.now(timezone.utc) + CONFIRM_LINK_VALIDITY
    subscriber.unsubscribe_token_hash = _hash(unsubscribe_token)
    subscriber.unsubscribed_at = None
    await db.commit()

    # Envoi après la réponse (SMTP synchrone, exécuté hors de la boucle par BackgroundTasks)
    background_tasks.add_task(_send_confirmation, email, lang, confirm_token, unsubscribe_token)
    return MessageResponse(message=SUBSCRIBE_ACCEPTED)


@router.post("/confirm", response_model=MessageResponse)
async def confirm(data: TokenRequest, db: AsyncSession = Depends(get_db)):
    """Confirmer l'inscription depuis le lien reçu par e-mail. Accessible: Public."""
    subscriber = await db.scalar(
        select(NewsletterSubscriber).where(NewsletterSubscriber.confirm_token_hash == _hash(data.token))
    )
    expires = subscriber.confirm_expires_at if subscriber else None
    if expires is not None and expires.tzinfo is None:  # SQLite renvoie des dates sans fuseau
        expires = expires.replace(tzinfo=timezone.utc)
    if subscriber is None or subscriber.status != STATUS_PENDING or not expires or expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Lien de confirmation invalide ou expiré")

    subscriber.status = STATUS_CONFIRMED
    subscriber.confirmed_at = datetime.now(timezone.utc)
    subscriber.confirm_token_hash = None
    subscriber.confirm_expires_at = None
    await db.commit()
    return MessageResponse(message="Inscription confirmée")


@router.post("/unsubscribe", response_model=MessageResponse)
async def unsubscribe(data: TokenRequest, db: AsyncSession = Depends(get_db)):
    """Se désinscrire (lien présent dans chaque e-mail). Idempotent. Accessible: Public."""
    subscriber = await db.scalar(
        select(NewsletterSubscriber).where(NewsletterSubscriber.unsubscribe_token_hash == _hash(data.token))
    )
    if subscriber is None:
        raise HTTPException(status_code=400, detail="Lien de désinscription invalide")
    if subscriber.status != STATUS_UNSUBSCRIBED:
        subscriber.status = STATUS_UNSUBSCRIBED
        subscriber.unsubscribed_at = datetime.now(timezone.utc)
        subscriber.confirm_token_hash = None
        await db.commit()
    return MessageResponse(message="Désinscription enregistrée")


# ============================================
# Back-office (Super Admin)
# ============================================


class SubscriberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    lang: str
    status: str
    created_at: datetime
    confirmed_at: Optional[datetime] = None
    unsubscribed_at: Optional[datetime] = None


class SubscriberCounts(BaseModel):
    PENDING: int = 0
    CONFIRMED: int = 0
    UNSUBSCRIBED: int = 0


class SubscriberListResponse(BaseModel):
    items: list[SubscriberRead]
    total: int
    page: int
    page_size: int
    total_pages: int
    counts: SubscriberCounts


@router.get("/subscribers", response_model=SubscriberListResponse)
async def list_subscribers(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[Literal["PENDING", "CONFIRMED", "UNSUBSCRIBED"]] = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100, description="Recherche dans l'e-mail"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lister les abonnés, avec le décompte par statut. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    count_rows = await db.execute(
        select(NewsletterSubscriber.status, func.count(NewsletterSubscriber.id)).group_by(NewsletterSubscriber.status)
    )
    counts = SubscriberCounts(**{s: n for s, n in count_rows.all()})

    filters = []
    if status_filter:
        filters.append(NewsletterSubscriber.status == status_filter)
    if q and q.strip():
        filters.append(NewsletterSubscriber.email.ilike(like_pattern(q), escape="\\"))
    total = await db.scalar(select(func.count(NewsletterSubscriber.id)).where(*filters)) or 0
    result = await db.execute(
        select(NewsletterSubscriber)
        .where(*filters)
        .order_by(NewsletterSubscriber.created_at.desc(), NewsletterSubscriber.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return SubscriberListResponse(
        items=[SubscriberRead.model_validate(s) for s in result.scalars().all()],
        total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size, counts=counts,
    )


@router.get("/subscribers/export")
async def export_subscribers(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Export CSV des abonnés confirmés, à importer dans l'outil d'envoi. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    result = await db.execute(
        select(NewsletterSubscriber)
        .where(NewsletterSubscriber.status == STATUS_CONFIRMED)
        .order_by(NewsletterSubscriber.confirmed_at)
    )
    subscribers = result.scalars().all()
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["email", "langue", "confirme_le"])
    for s in subscribers:
        writer.writerow([s.email, s.lang, s.confirmed_at.date().isoformat() if s.confirmed_at else ""])

    record_audit(db, user=user, action="export", resource_type="newsletter", details={"count": len(subscribers)})
    await db.commit()
    # BOM UTF-8 : accents corrects à l'ouverture dans Excel
    return Response(
        "﻿" + buffer.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="abonnes-newsletter.csv"'},
    )


@router.delete("/subscribers/{subscriber_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscriber(subscriber_id: int, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Supprimer définitivement un abonné (droit à l'effacement, RGPD). Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    subscriber = await db.get(NewsletterSubscriber, subscriber_id)
    if subscriber is None:
        raise HTTPException(status_code=404, detail="Abonné introuvable")
    record_audit(db, user=user, action="delete", resource_type="newsletter", resource_id=subscriber.id)
    await db.delete(subscriber)
    await db.commit()
    return None
