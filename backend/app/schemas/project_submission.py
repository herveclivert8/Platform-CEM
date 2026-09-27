from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import ConfigDict, BaseModel, EmailStr, Field


class SubmissionStatus(str, Enum):
    RECEIVED = "RECEIVED"
    IN_REVIEW = "IN_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class ProjectSubmissionCreate(BaseModel):
    applicant_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    project_summary: str = Field(..., min_length=1, max_length=10_000)
    # Champ piège anti-robots : invisible pour un humain, donc toujours vide pour un vrai porteur de projet
    website: Optional[str] = Field(None, max_length=255)


class ProjectSubmissionUpdate(BaseModel):
    """Suivi du dossier par un admin."""
    status: Optional[SubmissionStatus] = None
    internal_notes: Optional[str] = Field(None, max_length=10_000)


class ProjectSubmissionReceipt(BaseModel):
    """Réponse au dépôt public : rien de plus que la confirmation."""
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectSubmission(BaseModel):
    id: int
    branch_id: int
    applicant_name: str
    email: str
    project_summary: str
    status: SubmissionStatus
    internal_notes: Optional[str] = None
    status_updated_at: Optional[datetime] = None
    acknowledgment_sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectSubmissionListResponse(BaseModel):
    items: list[ProjectSubmission]
    total: int
    page: int
    page_size: int
    total_pages: int
