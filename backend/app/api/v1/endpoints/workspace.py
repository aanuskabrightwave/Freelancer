from fastapi import APIRouter, Depends, status, UploadFile, File, Form, Query, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.workspace_service import WorkspaceService
from app.schemas.workspace import (
    WorkspaceResponse,
    WorkspaceFileResponse,
    WorkspaceLinkResponse,
    WorkspaceEventResponse
)

router = APIRouter()


class LinkCreatePayload(BaseModel):
    label: str
    url: str


@router.get("/bookings/{booking_id}/workspace", response_model=WorkspaceResponse, summary="Get or initialize booking workspace")
def get_workspace(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return WorkspaceService.get_or_create_workspace(db, current_user, booking_id)


@router.get("/bookings/{booking_id}/files", response_model=List[WorkspaceFileResponse], summary="Get workspace file library")
def get_workspace_files(
    booking_id: int,
    category: Optional[str] = Query(None, description="REFERENCE, PROJECT_FILE, PREVIEW, FINAL_DELIVERY, DOCUMENT, OTHER"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return WorkspaceService.get_files(db, current_user, booking_id, category)


@router.post("/bookings/{booking_id}/files", response_model=WorkspaceFileResponse, status_code=status.HTTP_201_CREATED, summary="Upload file to workspace")
def upload_workspace_file(
    booking_id: int,
    file: UploadFile = File(...),
    category: str = Form("OTHER"),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return WorkspaceService.upload_file(db, current_user, booking_id, file, category, description)


@router.post("/bookings/{booking_id}/links", response_model=WorkspaceLinkResponse, status_code=status.HTTP_201_CREATED, summary="Share external cloud link")
def share_external_link(
    booking_id: int,
    payload: LinkCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return WorkspaceService.add_link(db, current_user, booking_id, payload.label, payload.url)


@router.get("/bookings/{booking_id}/links", response_model=List[WorkspaceLinkResponse], summary="List shared external links")
def get_workspace_links(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return WorkspaceService.get_links(db, current_user, booking_id)


@router.delete("/bookings/{booking_id}/files/{file_id}", response_model=dict, summary="Remove shared file")
def delete_workspace_file(
    booking_id: int,
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    WorkspaceService.delete_file(db, current_user, booking_id, file_id)
    return {"status": "success", "message": "File deleted successfully"}


@router.get("/bookings/{booking_id}/timeline", response_model=List[WorkspaceEventResponse], summary="Get project workspace timeline events")
def get_workspace_timeline(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return WorkspaceService.get_timeline(db, current_user, booking_id)


@router.get("/bookings/workspace/files/{file_id}/download", summary="Download workspace file securely")
def download_workspace_file_by_id(
    file_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    import os
    from fastapi.responses import FileResponse
    from app.models.workspace_file import WorkspaceFile
    from app.models.booking import Booking
    from app.models.user import UserRole
    from app.core.config import settings

    workspace_file = db.query(WorkspaceFile).filter(WorkspaceFile.id == file_id).first()
    if not workspace_file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found.")

    booking = workspace_file.workspace.booking
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Associated booking not found.")

    is_client = booking.client_id == current_user.id
    is_freelancer = booking.freelancer.user_id == current_user.id if booking.freelancer else False
    is_admin = current_user.role == UserRole.ADMIN

    if not is_client and not is_freelancer and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    local_path = os.path.normpath(os.path.join(settings.UPLOAD_STORAGE_PATH, workspace_file.file_url.lstrip("/uploads/")))
    if not os.path.exists(local_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found on disk.")

    return FileResponse(local_path, media_type=workspace_file.mime_type, filename=workspace_file.original_name)
