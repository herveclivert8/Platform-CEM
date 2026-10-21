"""Documents joints aux projets : contrôle du contenu et rattachement à un projet."""

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Project, ProjectDocument, User
from app.schemas.project import MAX_PROJECT_DOCUMENTS

MAX_DOCUMENT_BYTES = 10 * 1024 * 1024  # 10 Mo par document

# Extension → (type MIME, signatures de début de fichier acceptées)
_OLE = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"  # anciens formats Office (.doc, .xls, .ppt)
_ZIP = b"PK\x03\x04"  # formats Office récents (.docx, .xlsx, .pptx)
DOCUMENT_TYPES: dict[str, tuple[str, tuple[bytes, ...]]] = {
    "pdf": ("application/pdf", (b"%PDF-",)),
    "doc": ("application/msword", (_OLE,)),
    "docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document", (_ZIP,)),
    "xls": ("application/vnd.ms-excel", (_OLE,)),
    "xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", (_ZIP,)),
    "ppt": ("application/vnd.ms-powerpoint", (_OLE,)),
    "pptx": ("application/vnd.openxmlformats-officedocument.presentationml.presentation", (_ZIP,)),
}


def check_document(file_name: str, content: bytes) -> str:
    """Vérifier extension, taille et contenu réel ; renvoie le type MIME. Lève une 400/413 sinon."""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
    if ext not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail="Format non accepté : PDF, Word, Excel ou PowerPoint uniquement.")
    if len(content) > MAX_DOCUMENT_BYTES:
        raise HTTPException(status_code=413, detail="Document trop volumineux : 10 Mo maximum.")
    mime, signatures = DOCUMENT_TYPES[ext]
    if not content.startswith(signatures):
        raise HTTPException(status_code=400, detail="Fichier corrompu ou ne correspondant pas à son extension.")
    return mime


async def attach_documents(db: AsyncSession, project: Project, document_ids: list[int], user: User) -> None:
    """
    Rattacher au projet les documents demandés, dans cet ordre, et supprimer ceux qui n'y figurent plus.
    Acceptés : documents déjà joints à ce projet, ou envoyés par cet utilisateur et encore libres.
    """
    ids = list(dict.fromkeys(document_ids))
    if len(ids) > MAX_PROJECT_DOCUMENTS:
        raise HTTPException(status_code=400, detail=f"{MAX_PROJECT_DOCUMENTS} documents maximum par projet.")
    docs = {}
    if ids:
        rows = await db.execute(select(ProjectDocument).where(ProjectDocument.id.in_(ids)))
        docs = {d.id: d for d in rows.scalars().all()}
    for doc_id in ids:
        doc = docs.get(doc_id)
        allowed = doc is not None and (
            (project.id is not None and doc.project_id == project.id)
            or (doc.project_id is None and doc.uploaded_by_id == user.id)
        )
        if not allowed:
            raise HTTPException(status_code=400, detail="Document invalide : envoyez-le à nouveau.")
    # Le projet garde exactement la liste demandée (les documents retirés sont supprimés)
    project.documents[:] = [docs[i] for i in ids]
    for position, doc_id in enumerate(ids):
        docs[doc_id].position = position
