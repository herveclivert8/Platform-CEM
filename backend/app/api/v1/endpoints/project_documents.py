"""
Documents joints aux projets (dossier, budget, présentation...).

- Envoi : admins, et membres à jour de cotisation (pour leurs propositions) ; rattachés ensuite au
  projet à sa création ou modification (document_ids).
- Téléchargement : membres à jour de cotisation et admins pour un projet publié ; pour un projet en
  attente, son auteur et les admins de son antenne. Jamais accessible par un lien public.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, Response, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.api.deps import get_current_user, get_db
from app.core.permissions import verify_branch_access
from app.core.rate_limit import rate_limit
from app.models import Project, ProjectDocument, User
from app.models.project import ProjectReviewStatus
from app.schemas.project import ProjectDocumentInfo
from app.services.project_documents import check_document

router = APIRouter(prefix="/project-documents", tags=["project-documents"])

_member_document_limit = rate_limit("member_document", limit=20, window=60 * 60)


async def _document_uploader(request: Request, user: User = Depends(get_current_user)) -> User:
    if user.is_admin:
        return user
    if user.has_member_access(datetime.now(timezone.utc).date()):
        await _member_document_limit(request)
        return user
    raise HTTPException(status_code=403, detail="Réservé aux membres à jour de cotisation.")


@router.post("", response_model=ProjectDocumentInfo, status_code=status.HTTP_201_CREATED)
async def upload_project_document(
    file: UploadFile = File(...),
    title: str = Form("", max_length=150),
    user: User = Depends(_document_uploader),
    db: AsyncSession = Depends(get_db),
):
    """Envoyer un document (10 Mo maximum), à joindre ensuite à un projet."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier manquant")
    content = await file.read()
    mime = check_document(file.filename, content)
    file_name = Path(file.filename).name[:255]

    # Ménage : documents envoyés par cet utilisateur mais jamais joints à un projet depuis 24 h
    await db.execute(
        delete(ProjectDocument).where(
            ProjectDocument.uploaded_by_id == user.id,
            ProjectDocument.project_id.is_(None),
            ProjectDocument.created_at < datetime.now(timezone.utc) - timedelta(hours=24),
        )
    )
    doc = ProjectDocument(
        uploaded_by_id=user.id,
        title=(title.strip() or Path(file_name).stem)[:150],
        file_name=file_name,
        content_type=mime,
        size=len(content),
        content=content,
    )
    db.add(doc)
    await db.commit()
    return ProjectDocumentInfo(id=doc.id, title=doc.title, file_name=doc.file_name, content_type=mime, size=doc.size)


async def _can_download(db: AsyncSession, doc: ProjectDocument, user: User) -> bool:
    if doc.project_id is None:
        return doc.uploaded_by_id == user.id
    project = await db.get(Project, doc.project_id)
    if project is None:
        return False
    if user.is_admin:
        try:
            await verify_branch_access(user, project.branch_id)
            return True
        except HTTPException:
            pass
    if project.author_id == user.id:
        return True
    published = project.review_status == ProjectReviewStatus.APPROVED and project.is_visible
    return published and (user.is_admin or user.has_member_access(datetime.now(timezone.utc).date()))


@router.get("/{document_id}")
async def download_project_document(
    document_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Télécharger un document joint (membres à jour de cotisation et admins)."""
    doc = await db.scalar(select(ProjectDocument).options(undefer(ProjectDocument.content)).where(ProjectDocument.id == document_id))
    if doc is None or not await _can_download(db, doc, user):
        raise HTTPException(status_code=404, detail="Document introuvable")
    return Response(
        content=doc.content,
        media_type=doc.content_type,
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{quote(doc.file_name)}",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
