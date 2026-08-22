"""File storage abstraction layer for local, S3, and GCS."""

import logging
from abc import ABC, abstractmethod
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageBackend(ABC):
    """Abstract base class for storage backends."""

    @abstractmethod
    async def upload(self, file_path: str, file_content: bytes) -> str:
        """Upload a file and return the public URL."""
        pass

    @abstractmethod
    async def delete(self, file_path: str) -> bool:
        """Delete a file. Returns True if successful."""
        pass


class LocalStorage(StorageBackend):
    """Local filesystem storage."""

    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(exist_ok=True)

    async def upload(self, file_path: str, file_content: bytes) -> str:
        """Save file to local filesystem."""
        full_path = self.upload_dir / file_path

        # Prevent path traversal
        if ".." in str(full_path):
            raise ValueError("Invalid file path")

        full_path.parent.mkdir(parents=True, exist_ok=True)

        with open(full_path, "wb") as f:
            f.write(file_content)

        logger.info(f"File uploaded to local storage: {file_path}")
        return f"/uploads/{file_path}"

    async def delete(self, file_path: str) -> bool:
        """Delete file from local storage."""
        full_path = self.upload_dir / file_path

        if ".." in str(full_path):
            return False

        if full_path.exists():
            full_path.unlink()
            logger.info(f"File deleted from local storage: {file_path}")
            return True

        return False


class S3Storage(StorageBackend):
    """AWS S3 storage backend."""

    def __init__(self, bucket: str, region: str, access_key: str, secret_key: str):
        import boto3

        self.bucket = bucket
        self.s3_client = boto3.client(
            "s3",
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
        )

    async def upload(self, file_path: str, file_content: bytes) -> str:
        """Upload file to S3."""
        try:
            self.s3_client.put_object(
                Bucket=self.bucket,
                Key=file_path,
                Body=file_content,
                ContentType="image/jpeg",
            )
            logger.info(f"File uploaded to S3: s3://{self.bucket}/{file_path}")
            return f"https://{self.bucket}.s3.amazonaws.com/{file_path}"
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            raise

    async def delete(self, file_path: str) -> bool:
        """Delete file from S3."""
        try:
            self.s3_client.delete_object(Bucket=self.bucket, Key=file_path)
            logger.info(f"File deleted from S3: {file_path}")
            return True
        except Exception as e:
            logger.error(f"S3 delete failed: {e}")
            return False


class GCSStorage(StorageBackend):
    """Google Cloud Storage backend."""

    def __init__(self, bucket: str, project_id: str, credentials_path: str):
        from google.cloud import storage

        if credentials_path:
            import os

            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        self.bucket_name = bucket
        self.client = storage.Client(project=project_id)
        self.bucket = self.client.bucket(bucket)

    async def upload(self, file_path: str, file_content: bytes) -> str:
        """Upload file to GCS."""
        try:
            blob = self.bucket.blob(file_path)
            blob.upload_from_string(file_content, content_type="image/jpeg")
            logger.info(f"File uploaded to GCS: gs://{self.bucket_name}/{file_path}")
            return f"https://storage.googleapis.com/{self.bucket_name}/{file_path}"
        except Exception as e:
            logger.error(f"GCS upload failed: {e}")
            raise

    async def delete(self, file_path: str) -> bool:
        """Delete file from GCS."""
        try:
            blob = self.bucket.blob(file_path)
            blob.delete()
            logger.info(f"File deleted from GCS: {file_path}")
            return True
        except Exception as e:
            logger.error(f"GCS delete failed: {e}")
            return False


def get_storage_backend() -> StorageBackend:
    """Factory function to get the configured storage backend."""
    if settings.STORAGE_TYPE == "s3":
        if not (settings.S3_BUCKET and settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY):
            raise ValueError("S3 storage configured but credentials missing")
        return S3Storage(
            bucket=settings.S3_BUCKET,
            region=settings.S3_REGION,
            access_key=settings.S3_ACCESS_KEY_ID,
            secret_key=settings.S3_SECRET_ACCESS_KEY,
        )

    elif settings.STORAGE_TYPE == "gcs":
        if not (settings.GCS_BUCKET and settings.GCS_PROJECT_ID):
            raise ValueError("GCS storage configured but credentials missing")
        return GCSStorage(
            bucket=settings.GCS_BUCKET,
            project_id=settings.GCS_PROJECT_ID,
            credentials_path=settings.GCS_CREDENTIALS_PATH,
        )

    else:
        return LocalStorage(upload_dir=settings.UPLOAD_DIR)
