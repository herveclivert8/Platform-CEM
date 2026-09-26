"""
Schémas Pydantic pour les projets (« Projets en cours » / « Nos réalisations »)
"""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, model_validator

from app.schemas.post import Pillar


class ProjectPhase(str, Enum):
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"


class ProjectReviewStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    pillar: Pillar
    phase: ProjectPhase
    beneficiaries: str = Field(..., min_length=1, max_length=255)
    beneficiaries_count: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None


def _check_dates(phase, start_date, end_date) -> None:
    if phase == ProjectPhase.COMPLETED and end_date is None:
        raise ValueError("Une réalisation doit avoir une date de fin")
    if start_date and end_date and end_date < start_date:
        raise ValueError("La date de fin doit être postérieure à la date de début")


class ProjectCreate(ProjectBase):
    branch_id: int
    images: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_dates(self):
        _check_dates(self.phase, self.start_date, self.end_date)
        return self


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    summary: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)
    pillar: Optional[Pillar] = None
    phase: Optional[ProjectPhase] = None
    beneficiaries: Optional[str] = Field(None, min_length=1, max_length=255)
    beneficiaries_count: Optional[int] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=255)
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    images: Optional[list[str]] = None


class ProjectReject(BaseModel):
    reason: str = Field(..., min_length=3, max_length=2000)


class Project(ProjectBase):
    id: int
    branch_id: int
    branch_name: str
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    review_status: ProjectReviewStatus
    rejection_reason: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    images: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm_project(cls, project) -> "Project":
        def val(v):
            return v.value if hasattr(v, "value") else v

        author = project.author
        return cls(
            id=project.id,
            branch_id=project.branch_id,
            branch_name=project.branch.name,
            author_id=project.author_id,
            author_name=f"{author.first_name} {author.last_name}".strip() if author else None,
            title=project.title,
            summary=project.summary,
            description=project.description,
            pillar=val(project.pillar),
            phase=val(project.phase),
            beneficiaries=project.beneficiaries,
            beneficiaries_count=project.beneficiaries_count,
            location=project.location,
            start_date=project.start_date,
            end_date=project.end_date,
            review_status=val(project.review_status),
            rejection_reason=project.rejection_reason,
            reviewed_at=project.reviewed_at,
            images=[img.url for img in project.images],
            created_at=project.created_at,
            updated_at=project.updated_at,
        )


class ProjectListResponse(BaseModel):
    items: list[Project]
    total: int
    page: int
    page_size: int
    total_pages: int


class ProjectStatusCounts(BaseModel):
    PENDING: int = 0
    APPROVED: int = 0
    REJECTED: int = 0


class ProjectAdminListResponse(ProjectListResponse):
    counts: ProjectStatusCounts
