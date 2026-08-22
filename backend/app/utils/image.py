"""Image processing and optimization utilities."""
import io
import logging
from pathlib import Path
from typing import Tuple

from PIL import Image

logger = logging.getLogger(__name__)

# Image configuration
MAX_DIMENSION = 2000
WEBP_QUALITY = 85
THUMBNAIL_SIZES = {
    "small": (400, 400),
    "medium": (800, 800),
    "large": (1600, 1600),
}


def optimize_image(file_content: bytes, filename: str) -> Tuple[bytes, str]:
    """
    Optimize image: resize and convert to WebP.

    Args:
        file_content: Raw image bytes
        filename: Original filename

    Returns:
        (optimized_bytes, webp_filename)
    """
    try:
        # Open image
        img = Image.open(io.BytesIO(file_content))

        # Convert RGBA to RGB if necessary
        if img.mode in ("RGBA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = rgb_img

        # Resize if too large
        if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)
            logger.info(f"Resized image to {img.width}x{img.height}")

        # Convert to WebP
        webp_buffer = io.BytesIO()
        img.save(webp_buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
        webp_buffer.seek(0)

        # Generate new filename
        webp_filename = Path(filename).stem + ".webp"

        logger.info(f"Optimized image: {filename} → {webp_filename} ({len(webp_buffer.getvalue())} bytes)")

        return webp_buffer.getvalue(), webp_filename

    except Exception as e:
        logger.error(f"Image optimization failed: {e}")
        raise


def generate_thumbnails(file_content: bytes, base_filename: str) -> dict[str, bytes]:
    """
    Generate image thumbnails in multiple sizes.

    Args:
        file_content: Raw image bytes
        base_filename: Base filename without extension

    Returns:
        Dict with thumbnail sizes as keys and image bytes as values
    """
    try:
        img = Image.open(io.BytesIO(file_content))

        if img.mode in ("RGBA", "P"):
            rgb_img = Image.new("RGB", img.size, (255, 255, 255))
            rgb_img.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
            img = rgb_img

        thumbnails = {}

        for size_name, size_dims in THUMBNAIL_SIZES.items():
            # Create thumbnail
            thumb = img.copy()
            thumb.thumbnail(size_dims, Image.Resampling.LANCZOS)

            # Save as WebP
            thumb_buffer = io.BytesIO()
            thumb.save(thumb_buffer, format="WEBP", quality=WEBP_QUALITY)
            thumb_buffer.seek(0)

            filename = f"{base_filename}-{size_name}.webp"
            thumbnails[size_name] = (filename, thumb_buffer.getvalue())

            logger.info(f"Generated {size_name} thumbnail: {thumb.width}x{thumb.height}")

        return thumbnails

    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        raise


def get_image_dimensions(file_content: bytes) -> Tuple[int, int]:
    """Get original image dimensions."""
    try:
        img = Image.open(io.BytesIO(file_content))
        return img.width, img.height
    except Exception as e:
        logger.error(f"Failed to get image dimensions: {e}")
        return 0, 0


def is_valid_image_format(filename: str, allowed_extensions: list[str]) -> bool:
    """Validate image format."""
    ext = Path(filename).suffix.lower().lstrip(".")
    return ext in allowed_extensions
