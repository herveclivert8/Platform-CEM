"""Pagination schemas and utilities."""
import base64
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class CursorPaginationParams(BaseModel):
    """Cursor pagination request parameters."""

    cursor: Optional[str] = Field(
        None,
        description="Base64-encoded cursor for pagination",
    )
    limit: int = Field(
        10,
        ge=1,
        le=100,
        description="Number of items to return",
    )


class CursorPaginationResponse(BaseModel, Generic[T]):
    """Cursor pagination response."""

    data: list[T] = Field(..., description="List of items")
    cursor: Optional[str] = Field(None, description="Cursor for next page")
    has_more: bool = Field(False, description="Whether more items exist")


class OffsetPaginationParams(BaseModel):
    """Offset-based pagination request parameters."""

    skip: int = Field(0, ge=0, description="Number of items to skip")
    limit: int = Field(10, ge=1, le=100, description="Number of items to return")


class OffsetPaginationResponse(BaseModel, Generic[T]):
    """Offset-based pagination response."""

    data: list[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    skip: int = Field(..., description="Number skipped")
    limit: int = Field(..., description="Limit used")
    total_pages: int = Field(..., description="Total number of pages")


def encode_cursor(value: int) -> str:
    """
    Encode cursor value to base64.

    Args:
        value: Integer value to encode (usually an ID)

    Returns:
        Base64-encoded cursor string
    """
    try:
        return base64.b64encode(str(value).encode()).decode()
    except Exception:
        return ""


def decode_cursor(cursor: str) -> Optional[int]:
    """
    Decode base64 cursor to integer.

    Args:
        cursor: Base64-encoded cursor string

    Returns:
        Decoded integer value or None if invalid
    """
    try:
        return int(base64.b64decode(cursor.encode()).decode())
    except Exception:
        return None


def get_pagination_links(current_cursor: Optional[str], has_more: bool) -> dict:
    """
    Generate pagination links for response headers.

    Returns:
        Dict with 'next' link if available
    """
    links = {}
    if has_more and current_cursor:
        links["next"] = f"?cursor={current_cursor}"
    return links
