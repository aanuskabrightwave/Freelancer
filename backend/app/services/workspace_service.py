from sqlalchemy.orm import Session
from fastapi import HTTPException, status, UploadFile
from typing import Optional, List, Dict, Any
from urllib.parse import urlparse
import os

from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.workspace import BookingWorkspace
from app.models.workspace_file import WorkspaceFile, WorkspaceLink, FileCategory
from app.models.workspace_event import WorkspaceEvent, WorkspaceEventType
from app.repositories.booking_repository import BookingRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.storage_service import StorageService


class WorkspaceService:
    @staticmethod
    def validate_membership(db: Session, user: User, booking: Booking) -> None:
        """
        Enforce that only client or freelancer participant of booking can access.
        """
        if user.role == UserRole.ADMIN:
            return
        
        is_client = (booking.client_id == user.id)
        is_freelancer = False
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if freelancer_profile and freelancer_profile.user_id == user.id:
            is_freelancer = True

        if not is_client and not is_freelancer:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. You are not a participant in this workspace."
            )

    @staticmethod
    def get_or_create_workspace(db: Session, user: User, booking_id: int) -> BookingWorkspace:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        WorkspaceService.validate_membership(db, user, booking)

        # Workspaces exist only for confirmed/started bookings
        allowed_states = [
            BookingStatus.CONFIRMED,
            BookingStatus.IN_PROGRESS,
            BookingStatus.DELIVERY_PENDING,
            BookingStatus.COMPLETED,
            BookingStatus.CANCELLED,
            BookingStatus.RESCHEDULE_REQUESTED
        ]
        if booking.status not in allowed_states:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Workspace is not active for bookings in PENDING or REJECTED states."
            )

        workspace = WorkspaceRepository.get_by_booking_id(db, booking.id)
        if not workspace:
            workspace = WorkspaceRepository.create(db, booking.id)
            
            # Automatically initialize workspace conversation
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
            MessageRepository.get_or_create_workspace_conversation(
                db,
                workspace_id=workspace.id,
                booking_id=booking.id,
                client_id=booking.client_id,
                freelancer_id=freelancer_profile.user_id
            )

            # Log timeline event
            WorkspaceService.log_workspace_event(
                db,
                workspace_id=workspace.id,
                event_type=WorkspaceEventType.BOOKING_CONFIRMED,
                actor_user_id=None,
                title="Booking Workspace Initialized",
                description="Secure communications channel opened."
            )
            
        return workspace

    @staticmethod
    def get_files(db: Session, user: User, booking_id: int, category: Optional[str] = None) -> List[WorkspaceFile]:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)
        return WorkspaceRepository.get_files(db, workspace.id, category)

    @staticmethod
    def upload_file(db: Session, user: User, booking_id: int, file: UploadFile, category_str: str, description: Optional[str] = None) -> WorkspaceFile:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)
        
        # Read-only states check
        booking = BookingRepository.get_by_id(db, booking_id)
        if booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail="Cannot upload files to a closed or cancelled booking workspace.")

        # Save to disk
        sub = f"workspaces/{booking_id}"
        file_url = StorageService.save_file(file, sub)

        category = FileCategory.OTHER
        try:
            category = FileCategory(category_str.upper())
        except ValueError:
            pass

        file_data = {
            "workspace_id": workspace.id,
            "uploaded_by_user_id": user.id,
            "file_category": category,
            "original_name": file.filename or "unknown_file",
            "stored_name": os.path.basename(file_url),
            "file_url": file_url,
            "mime_type": file.content_type,
            "description": description
        }

        db_file = WorkspaceRepository.create_file(db, file_data)

        # Log timeline event
        WorkspaceService.log_workspace_event(
            db,
            workspace_id=workspace.id,
            event_type=WorkspaceEventType.FILE_UPLOADED,
            actor_user_id=user.id,
            title="File Shared",
            description=f"{user.full_name} uploaded: {file.filename} (Category: {category.value})"
        )

        return db_file

    @staticmethod
    def add_link(db: Session, user: User, booking_id: int, label: str, url: str) -> WorkspaceLink:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)

        # Validate URL format
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise HTTPException(status_code=400, detail="Invalid external link URL scheme.")

        link_data = {
            "workspace_id": workspace.id,
            "created_by_user_id": user.id,
            "label": label,
            "url": url,
            "link_type": "EXTERNAL"
        }

        db_link = WorkspaceRepository.create_link(db, link_data)

        # Log event
        WorkspaceService.log_workspace_event(
            db,
            workspace_id=workspace.id,
            event_type=WorkspaceEventType.FILE_UPLOADED,
            actor_user_id=user.id,
            title="External Link Added",
            description=f"{user.full_name} shared URL: {label}"
        )

        return db_link

    @staticmethod
    def get_links(db: Session, user: User, booking_id: int) -> List[WorkspaceLink]:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)
        return WorkspaceRepository.get_links(db, workspace.id)

    @staticmethod
    def delete_file(db: Session, user: User, booking_id: int, file_id: int) -> bool:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        WorkspaceService.validate_membership(db, user, booking)

        file = WorkspaceRepository.get_file_by_id(db, file_id)
        if not file or file.workspace.booking_id != booking_id:
            raise HTTPException(status_code=404, detail="File not found in this booking workspace.")

        # Permissions: only uploader or admin can delete
        if file.uploaded_by_user_id != user.id and user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Unauthorized to delete this file.")

        # Deletion safety check: do not allow deleting approved final deliveries
        from app.models.delivery import DeliveryFile, Delivery, DeliveryStatus
        is_approved_delivery = db.query(DeliveryFile).join(Delivery).filter(
            DeliveryFile.workspace_file_id == file_id,
            Delivery.status == DeliveryStatus.APPROVED
        ).first()

        if is_approved_delivery:
            raise HTTPException(
                status_code=400,
                detail="Deletion blocked: This file is part of an approved final delivery package."
            )

        # Delete from local disk
        relative_path = file.file_url.lstrip("/")
        # Storage UPLOAD_DIR is /app/uploads, but relative path might include uploads/
        # Check storage_service setup
        # relative_path is e.g. "uploads/workspaces/1/filename.jpg"
        from app.services.storage_service import UPLOAD_DIR
        # Remove uploads prefix to match local directory Structure
        local_rel = relative_path.replace("uploads/", "")
        full_filepath = os.path.join(UPLOAD_DIR, local_rel)

        if os.path.exists(full_filepath):
            try:
                os.remove(full_filepath)
            except Exception:
                pass

        WorkspaceRepository.delete_file(db, file)
        return True

    @staticmethod
    def get_timeline(db: Session, user: User, booking_id: int) -> List[WorkspaceEvent]:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)
        return WorkspaceRepository.get_events(db, workspace.id)

    @staticmethod
    def log_workspace_event(db: Session, workspace_id: int, event_type: WorkspaceEventType, actor_user_id: Optional[int], title: str, description: Optional[str] = None, metadata: Optional[dict] = None) -> WorkspaceEvent:
        event_data = {
            "workspace_id": workspace_id,
            "event_type": event_type,
            "actor_user_id": actor_user_id,
            "title": title,
            "description": description,
            "metadata_json": metadata
        }
        return WorkspaceRepository.create_event(db, event_data)
