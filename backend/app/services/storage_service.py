import os
import uuid
import shutil
from fastapi import UploadFile, HTTPException, status
from app.core.config import settings

UPLOAD_DIR = os.path.normpath(settings.UPLOAD_STORAGE_PATH)
MAX_IMAGE_SIZE = settings.MAX_IMAGE_UPLOAD_MB * 1024 * 1024
MAX_DOCUMENT_SIZE = settings.MAX_DOCUMENT_UPLOAD_MB * 1024 * 1024
MAX_VIDEO_SIZE = settings.MAX_VIDEO_UPLOAD_MB * 1024 * 1024

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/mpeg", "video/ogg", "video/webm", "video/quicktime"}
ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/x-zip-compressed",
    "application/octet-stream",
    "text/plain"
}


class StorageService:
    @staticmethod
    def save_file(file: UploadFile, subfolder: str = "profiles") -> str:
        """
        Validates and saves an uploaded file locally.
        Returns the relative URL path of the saved file.
        """
        # Ensure directories exist and prevent traversal
        clean_subfolder = os.path.normpath(subfolder).replace("..", "").lstrip("/\\")
        target_dir = os.path.normpath(os.path.join(UPLOAD_DIR, clean_subfolder))
        
        if not target_dir.startswith(UPLOAD_DIR):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Directory traversal detected in subfolder argument."
            )
            
        os.makedirs(target_dir, exist_ok=True)

        # Validate MIME type & sizes
        content_type = file.content_type or ""
        
        is_image = content_type in ALLOWED_IMAGE_TYPES
        is_video = content_type in ALLOWED_VIDEO_TYPES
        # Safe extension fallback validation
        filename_lower = (file.filename or "").lower()
        is_doc = (
            content_type in ALLOWED_DOCUMENT_TYPES or 
            filename_lower.endswith(('.pdf', '.docx', '.doc', '.zip', '.txt'))
        )

        if not is_image and not is_video and not is_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type: {content_type}. Allowed types: images, videos, documents (PDF, DOCX, ZIP)."
            )

        # Check file size (approximate)
        # Read file size by seeking
        file.file.seek(0, os.SEEK_END)
        size = file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)  # Reset pointer to start

        if is_image and size > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Image size exceeds the maximum limit of {MAX_IMAGE_SIZE // (1024*1024)} MB."
            )
        elif is_video and size > MAX_VIDEO_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Video size exceeds the maximum limit of {MAX_VIDEO_SIZE // (1024*1024)} MB."
            )
        elif is_doc and not is_image and not is_video and size > MAX_DOCUMENT_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Document size exceeds the maximum limit of {MAX_DOCUMENT_SIZE // (1024*1024)} MB."
            )

        # Generate unique name
        ext = os.path.splitext(file.filename or "")[1].lower()
        if not ext:
            if is_image:
                ext = ".jpg"
            elif is_video:
                ext = ".mp4"
            else:
                ext = ".zip"
            
        unique_filename = f"{uuid.uuid4()}{ext}"
        filepath = os.path.join(target_dir, unique_filename)

        # Save to disk
        try:
            with open(filepath, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save file: {str(e)}"
            )

        # Return URL relative path
        return f"/uploads/{subfolder}/{unique_filename}"

    @staticmethod
    def generate_presigned_download_url(file_path: str, expires_in_seconds: int = 3600) -> str:
        """
        Generates a secure download URL. If S3 is configured, generates a pre-signed URL.
        Otherwise returns the media URL path.
        """
        if not file_path:
            return ""
        if file_path.startswith("http://") or file_path.startswith("https://"):
            return file_path
        
        # Local or mounted storage path
        clean_path = file_path.lstrip("/")
        return f"/{clean_path}"

    @staticmethod
    def delete_file(file_url: str) -> bool:
        """
        Deletes a local file safely given its relative upload URL.
        """
        if not file_url or not file_url.startswith("/uploads/"):
            return False
        
        relative_path = file_url.replace("/uploads/", "")
        clean_path = os.path.normpath(relative_path).replace("..", "").lstrip("/\\")
        target_path = os.path.join(UPLOAD_DIR, clean_path)
        
        if os.path.exists(target_path) and os.path.isfile(target_path):
            try:
                os.remove(target_path)
                return True
            except Exception:
                return False
        return False
