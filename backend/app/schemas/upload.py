from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    filename: str
    original_filename: str
    size: int
    url: str
    content_type: str
