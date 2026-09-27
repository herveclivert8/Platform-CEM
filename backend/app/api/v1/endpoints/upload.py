import uuid
import logging
from io import BytesIO
from pathlib import Path

from PIL import Image
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_role
from app.core.config import settings
from app.core.storage import get_storage_backend
from app.models.uploaded_file import UploadedFile
from app.services.audit import record_audit
from app.models.user import User, UserRole
from app.schemas.upload import FileUploadResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/upload", tags=["upload"])
storage = get_storage_backend()

# MIME type mapping for images
MIME_TYPE_MAP = {
    "rgb": "image/x-rgb",
    "gif": "image/gif",
    "pbm": "image/x-portable-bitmap",
    "pgm": "image/x-portable-graymap",
    "ppm": "image/x-portable-pixmap",
    "tiff": "image/tiff",
    "rast": "image/x-cmu-rast",
    "xbm": "image/x-xbitmap",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


def _validate_image_content(file_content: bytes, file_ext: str) -> bool:
    """Validate image content using PIL."""
    try:
        img = Image.open(BytesIO(file_content))
        img.verify()
        return img.format.lower() in ["jpeg", "png", "gif", "webp"]
    except Exception:
        return False


@router.post("/image", response_model=FileUploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN])),
    db: AsyncSession = Depends(get_db),
) -> FileUploadResponse:
    """Upload an image file (hero image, profile picture, etc.)."""

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nom de fichier manquant")

    # Get file extension
    file_ext = Path(file.filename).suffix.lower().lstrip(".")

    # Check extension
    if file_ext not in settings.ALLOWED_IMAGE_EXTENSIONS:
        allowed = ", ".join(settings.ALLOWED_IMAGE_EXTENSIONS)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Format de fichier non autorisé. Extensions acceptées: {allowed}",
        )

    # Check file size
    file_content = await file.read()
    if len(file_content) > settings.MAX_UPLOAD_SIZE:
        max_size_mb = settings.MAX_UPLOAD_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux. Taille maximale: {max_size_mb}MB",
        )

    # Validate MIME type by checking actual file content
    if not _validate_image_content(file_content, file_ext):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Fichier corrompu ou pas une image valide. Veuillez télécharger une image PNG, JPEG, GIF ou WebP.",
        )

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{file_ext}"

    # Save file using configured storage backend
    try:
        url = await storage.upload(unique_filename, file_content)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du téléchargement du fichier",
        )

    db.add(UploadedFile(filename=unique_filename, uploaded_by_id=current_user.id, branch_id=current_user.branch_id))
    await db.commit()

    # Return file information
    try:
        img = Image.open(BytesIO(file_content))
        detected_type = img.format.lower() if img.format else "unknown"
        content_type = MIME_TYPE_MAP.get(detected_type, "image/unknown")
    except Exception:
        content_type = file.content_type or "image/unknown"

    return FileUploadResponse(
        filename=unique_filename,
        original_filename=file.filename,
        size=len(file_content),
        url=url,
        content_type=content_type,
    )


@router.post("/document", response_model=FileUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN])),
    db: AsyncSession = Depends(get_db),
) -> FileUploadResponse:
    """Envoyer un document PDF (bilan d'action annuel...). Accessible : admins."""
    if not file.filename or Path(file.filename).suffix.lower() != ".pdf":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Seuls les fichiers PDF sont acceptés")

    file_content = await file.read()
    if len(file_content) > settings.MAX_DOCUMENT_SIZE:
        max_size_mb = settings.MAX_DOCUMENT_SIZE // (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Fichier trop volumineux. Taille maximale : {max_size_mb} Mo",
        )
    # Contrôle du contenu réel (pas seulement de l'extension) : tout PDF commence par « %PDF- »
    if not file_content.startswith(b"%PDF-"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Fichier corrompu ou pas un PDF valide")

    unique_filename = f"{uuid.uuid4()}.pdf"
    try:
        url = await storage.upload(unique_filename, file_content)
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du téléchargement du fichier",
        )

    db.add(UploadedFile(filename=unique_filename, uploaded_by_id=current_user.id, branch_id=current_user.branch_id))
    await db.commit()
    return FileUploadResponse(
        filename=unique_filename,
        original_filename=file.filename,
        size=len(file_content),
        url=url,
        content_type="application/pdf",
    )


@router.delete("/{filename}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    filename: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN])),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer un fichier envoyé.
    Accessible: Super Admin, ou admin de l'antenne qui l'a envoyé (fichiers antérieurs au suivi :
    Super Admin uniquement).
    """

    # Prevent path traversal
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")

    record = await db.get(UploadedFile, filename)
    if current_user.role != UserRole.SUPER_ADMIN and (
        record is None or record.branch_id is None or record.branch_id != current_user.branch_id
    ):
        raise HTTPException(status_code=403, detail="Ce fichier n'appartient pas à votre antenne")

    # Delete file using storage backend
    success = await storage.delete(filename)

    if not success:
        raise HTTPException(status_code=404, detail="Fichier non trouvé ou erreur de suppression")

    if record is not None:
        await db.delete(record)
    record_audit(
        db, user=current_user, action="delete", resource_type="file",
        branch_id=record.branch_id if record else None, details={"filename": filename},
    )
    await db.commit()
