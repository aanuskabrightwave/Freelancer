from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.workspace import BookingWorkspace
from app.models.workspace_file import WorkspaceFile, WorkspaceLink
from app.models.workspace_event import WorkspaceEvent


class WorkspaceRepository:
    @staticmethod
    def get_by_id(db: Session, workspace_id: int) -> Optional[BookingWorkspace]:
        return db.query(BookingWorkspace).filter(BookingWorkspace.id == workspace_id).first()

    @staticmethod
    def get_by_booking_id(db: Session, booking_id: int) -> Optional[BookingWorkspace]:
        return db.query(BookingWorkspace).filter(BookingWorkspace.booking_id == booking_id).first()

    @staticmethod
    def create(db: Session, booking_id: int) -> BookingWorkspace:
        db_ws = BookingWorkspace(booking_id=booking_id)
        db.add(db_ws)
        db.commit()
        db.refresh(db_ws)
        return db_ws

    @staticmethod
    def get_files(db: Session, workspace_id: int, category: Optional[str] = None) -> List[WorkspaceFile]:
        query = db.query(WorkspaceFile).filter(WorkspaceFile.workspace_id == workspace_id)
        if category:
            query = query.filter(WorkspaceFile.file_category == category.upper())
        return query.order_by(WorkspaceFile.created_at.desc()).all()

    @staticmethod
    def get_file_by_id(db: Session, file_id: int) -> Optional[WorkspaceFile]:
        return db.query(WorkspaceFile).filter(WorkspaceFile.id == file_id).first()

    @staticmethod
    def create_file(db: Session, file_data: dict) -> WorkspaceFile:
        db_file = WorkspaceFile(**file_data)
        db.add(db_file)
        db.commit()
        db.refresh(db_file)
        return db_file

    @staticmethod
    def delete_file(db: Session, file: WorkspaceFile) -> None:
        db.delete(file)
        db.commit()

    @staticmethod
    def get_links(db: Session, workspace_id: int) -> List[WorkspaceLink]:
        return db.query(WorkspaceLink).filter(WorkspaceLink.workspace_id == workspace_id).order_by(WorkspaceLink.created_at.desc()).all()

    @staticmethod
    def create_link(db: Session, link_data: dict) -> WorkspaceLink:
        db_link = WorkspaceLink(**link_data)
        db.add(db_link)
        db.commit()
        db.refresh(db_link)
        return db_link

    @staticmethod
    def get_events(db: Session, workspace_id: int) -> List[WorkspaceEvent]:
        return db.query(WorkspaceEvent).filter(WorkspaceEvent.workspace_id == workspace_id).order_by(WorkspaceEvent.created_at.asc()).all()

    @staticmethod
    def create_event(db: Session, event_data: dict) -> WorkspaceEvent:
        db_event = WorkspaceEvent(**event_data)
        db.add(db_event)
        db.commit()
        db.refresh(db_event)
        return db_event
