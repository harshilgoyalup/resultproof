import os
import shutil
import time
from typing import Optional
from app.core.config import settings

try:
    import boto3
    from botocore.exceptions import ClientError
    from botocore.config import Config
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False


class StorageService:
    """
    Private Object Storage Service.
    Guarantees all files are stored privately and only accessible via short-lived signed URLs.
    Supports AWS S3, Supabase Storage (S3 API), and local secure storage.
    """

    def __init__(self):
        self.provider = settings.STORAGE_PROVIDER
        self.bucket_name = settings.STORAGE_BUCKET_NAME
        self.s3_client = None

        if self.provider in ("s3", "supabase") and HAS_BOTO3:
            s3_config = Config(
                signature_version="s3v4",
                s3={"addressing_style": "virtual" if self.provider == "s3" else "path"}
            )
            kwargs = {
                "service_name": "s3",
                "aws_access_key_id": settings.AWS_ACCESS_KEY_ID or "dummy",
                "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY or "dummy",
                "region_name": settings.AWS_REGION or "us-east-1",
                "config": s3_config,
            }
            if settings.AWS_ENDPOINT_URL:
                kwargs["endpoint_url"] = settings.AWS_ENDPOINT_URL

            try:
                self.s3_client = boto3.client(**kwargs)
            except Exception as e:
                print(f"[Storage] Warning: Failed to init S3 client ({e}), falling back to local.")
                self.provider = "local"
        else:
            self.provider = "local"

        if self.provider == "local":
            os.makedirs(settings.LOCAL_STORAGE_DIR, exist_ok=True)

    def upload_file(self, file_content: bytes, destination_key: str, content_type: str = "application/octet-stream") -> str:
        """
        Upload file content to private storage.
        Returns the unique storage key.
        """
        if self.provider in ("s3", "supabase") and self.s3_client:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=destination_key,
                Body=file_content,
                ContentType=content_type,
                # Ensure object is strictly private
                ACL="private",
            )
            return destination_key
        else:
            # Local storage
            file_path = os.path.join(settings.LOCAL_STORAGE_DIR, destination_key)
            os.makedirs(os.path.dirname(file_path), exist_ok=True)
            with open(file_path, "wb") as f:
                f.write(file_content)
            return destination_key

    def generate_signed_url(self, file_key: str, expires_in_seconds: int = 900) -> Optional[str]:
        """
        Generate a private, short-lived signed temporary URL (default: 15 minutes).
        """
        if not file_key:
            return None

        if self.provider in ("s3", "supabase") and self.s3_client:
            try:
                url = self.s3_client.generate_presigned_url(
                    ClientMethod="get_object",
                    Params={"Bucket": self.bucket_name, "Key": file_key},
                    ExpiresIn=expires_in_seconds,
                )
                return url
            except Exception as e:
                print(f"[Storage] Error generating presigned URL: {e}")
                return None
        else:
            # For local development / testing, generate an authenticated API stream URL
            # Note: actual document streaming requires admin JWT on /api/v1/admin/documents/stream
            # or a signed time-limited token
            return f"/api/v1/admin/documents/stream?file_key={file_key}&expires={int(time.time()) + expires_in_seconds}"

    def delete_file(self, file_key: str) -> bool:
        """
        Permanently delete a file from private storage (used by 30-day retention purge).
        """
        if not file_key:
            return False

        if self.provider in ("s3", "supabase") and self.s3_client:
            try:
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=file_key
                )
                return True
            except Exception as e:
                print(f"[Storage] Failed to delete S3 file {file_key}: {e}")
                return False
        else:
            file_path = os.path.join(settings.LOCAL_STORAGE_DIR, file_key)
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    return True
                except Exception as e:
                    print(f"[Storage] Failed to delete local file {file_path}: {e}")
                    return False
            return True

    def get_local_file_path(self, file_key: str) -> Optional[str]:
        """Helper to get local file path if using local storage."""
        if self.provider == "local":
            path = os.path.join(settings.LOCAL_STORAGE_DIR, file_key)
            if os.path.exists(path):
                return path
        return None


storage_service = StorageService()
