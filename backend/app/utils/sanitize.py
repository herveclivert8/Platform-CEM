import re
from typing import Any


def sanitize_string(value: str, max_length: int = 1000) -> str:
    """
    Sanitize string input:
    - Remove leading/trailing whitespace
    - Limit length
    - Remove dangerous characters
    """
    if not isinstance(value, str):
        return str(value)

    # Strip whitespace
    value = value.strip()

    # Limit length
    if len(value) > max_length:
        value = value[:max_length]

    # Remove control characters
    value = "".join(char for char in value if ord(char) >= 32 or char in "\n\r\t")

    return value


def sanitize_email(value: str) -> str:
    """Validate and sanitize email address."""
    value = sanitize_string(value, max_length=255).lower()

    # Basic email validation
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, value):
        raise ValueError(f"Invalid email: {value}")

    return value


def sanitize_slug(value: str) -> str:
    """Sanitize slug (lowercase, alphanumeric + hyphens)."""
    value = sanitize_string(value, max_length=100).lower()

    # Allow only lowercase letters, numbers, and hyphens
    if not re.match(r'^[a-z0-9-]+$', value):
        raise ValueError(f"Invalid slug format: {value}")

    return value


def sanitize_url(value: str) -> str:
    """Sanitize URL."""
    value = sanitize_string(value, max_length=512)

    # Basic URL validation
    url_pattern = r'^https?://[a-zA-Z0-9-._~:/?#@!$&\'()*+,;=%]*$'
    if not re.match(url_pattern, value):
        raise ValueError(f"Invalid URL: {value}")

    return value


def sanitize_phone(value: str) -> str:
    """Sanitize phone number."""
    value = sanitize_string(value, max_length=20)

    # Allow digits, spaces, hyphens, parentheses, +
    if not re.match(r'^[\d\s()+\-]*$', value):
        raise ValueError(f"Invalid phone number: {value}")

    return value


def sanitize_html(value: str) -> str:
    """Remove HTML tags and dangerous characters."""
    value = sanitize_string(value)

    # Remove HTML tags
    value = re.sub(r'<[^>]*>', '', value)

    # Remove dangerous characters
    value = value.replace(';', '').replace('javascript:', '').replace('onerror=', '')

    return value


def sanitize_input(value: Any, input_type: str = "text") -> Any:
    """
    General purpose input sanitizer.

    Args:
        value: The value to sanitize
        input_type: Type of input (text, email, url, slug, phone, html)

    Returns:
        Sanitized value
    """
    if value is None:
        return None

    if input_type == "email":
        return sanitize_email(value)
    elif input_type == "url":
        return sanitize_url(value)
    elif input_type == "slug":
        return sanitize_slug(value)
    elif input_type == "phone":
        return sanitize_phone(value)
    elif input_type == "html":
        return sanitize_html(value)
    else:
        return sanitize_string(value)
