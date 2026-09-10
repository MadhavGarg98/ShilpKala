import os
import shutil
import logging
from pathlib import Path
from typing import BinaryIO, Union
from app.config import settings

logger = logging.getLogger(__name__)

class StorageService:
    """
    S3/GCS-compatible Object Storage abstraction.
    
    Provides standard boto3-style methods (upload, get_url, delete)
    backed by local filesystem object storage for zero-dependency offline runs,
    designed for a seamless config swap to AWS S3 or Google Cloud Storage.
    """

    def __init__(self, base_dir: str = None, base_url: str = None):
        self.base_dir = Path(base_dir or settings.UPLOAD_DIR)
        self.base_url = (base_url or settings.BASE_URL).rstrip("/")
        self.bucket = settings.CLOUD_STORAGE_BUCKET
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def upload(
        self,
        file_obj: Union[bytes, BinaryIO],
        key: str,
        content_type: str = "image/jpeg"
    ) -> str:
        """
        Uploads a file object or bytes to object storage.
        
        Args:
            file_obj: Raw bytes or file-like binary stream.
            key: Object key / relative path (e.g., 'enhanced/pottery.png').
            content_type: MIME type of the file.
            
        Returns:
            Publicly accessible URL.
        """
        # Normalize key
        clean_key = key.lstrip("/\\")
        target_path = self.base_dir / clean_key
        target_path.parent.mkdir(parents=True, exist_ok=True)

        if isinstance(file_obj, bytes):
            with open(target_path, "wb") as f:
                f.write(file_obj)
        else:
            file_obj.seek(0)
            with open(target_path, "wb") as f:
                shutil.copyfileobj(file_obj, f)

        logger.info(f"Stored object to {target_path} (key: {clean_key})")
        return self.get_url(clean_key)

    def upload_file(self, source_path: str, key: str, content_type: str = "image/jpeg") -> str:
        """
        Boto3-compatible upload_file method.
        """
        clean_key = key.lstrip("/\\")
        target_path = self.base_dir / clean_key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source_path, target_path)
        return self.get_url(clean_key)

    def get_url(self, key: str) -> str:
        """
        Returns full HTTP URL for an object key.
        """
        clean_key = key.lstrip("/\\").replace("\\", "/")
        return f"{self.base_url}/uploads/{clean_key}"

    def get_local_path(self, key: str) -> Path:
        """
        Returns absolute local filesystem path for the given key.
        """
        clean_key = key.lstrip("/\\")
        return self.base_dir / clean_key

    def delete(self, key: str) -> bool:
        """
        Deletes an object by key.
        """
        clean_key = key.lstrip("/\\")
        target_path = self.base_dir / clean_key
        if target_path.exists():
            target_path.unlink()
            return True
        return False

# Singleton storage instance
storage = StorageService()
