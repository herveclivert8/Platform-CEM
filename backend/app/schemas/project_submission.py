from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ProjectSubmissionCreate(BaseModel):
    applicant_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    project_summary: str = Field(..., min_length=1)


class ProjectSubmission(BaseModel):
    id: int
    branch_id: int
    applicant_name: str
    email: str
    project_summary: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectSubmissionListResponse(BaseModel):
    items: list[ProjectSubmission]
    total: int
    page: int
    page_size: int
    total_pages: int
