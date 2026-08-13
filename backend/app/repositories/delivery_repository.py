from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.delivery import Delivery, DeliveryFile, DeliveryType
from app.models.revision import RevisionRequest, RevisionComment


class DeliveryRepository:
    @staticmethod
    def get_deliveries(db: Session, workspace_id: int) -> List[Delivery]:
        return db.query(Delivery).filter(Delivery.workspace_id == workspace_id).order_by(Delivery.created_at.desc()).all()

    @staticmethod
    def get_delivery_by_id(db: Session, id: int) -> Optional[Delivery]:
        return db.query(Delivery).filter(Delivery.id == id).first()

    @staticmethod
    def create_delivery(db: Session, delivery_data: dict) -> Delivery:
        db_delivery = Delivery(**delivery_data)
        db.add(db_delivery)
        db.commit()
        db.refresh(db_delivery)
        return db_delivery

    @staticmethod
    def create_delivery_file(db: Session, delivery_file_data: dict) -> DeliveryFile:
        db_df = DeliveryFile(**delivery_file_data)
        db.add(db_df)
        db.commit()
        db.refresh(db_df)
        return db_df

    @staticmethod
    def get_latest_delivery_version(db: Session, booking_id: int) -> int:
        version = db.query(func.max(Delivery.version)).filter(Delivery.booking_id == booking_id).scalar()
        return (version or 0) + 1

    @staticmethod
    def create_revision_request(db: Session, revision_data: dict) -> RevisionRequest:
        db_rev = RevisionRequest(**revision_data)
        db.add(db_rev)
        db.commit()
        db.refresh(db_rev)
        return db_rev

    @staticmethod
    def get_revision_request_by_id(db: Session, id: int) -> Optional[RevisionRequest]:
        return db.query(RevisionRequest).filter(RevisionRequest.id == id).first()

    @staticmethod
    def get_revision_requests(db: Session, booking_id: int) -> List[RevisionRequest]:
        return db.query(RevisionRequest).filter(RevisionRequest.booking_id == booking_id).order_by(RevisionRequest.created_at.desc()).all()

    @staticmethod
    def create_revision_comment(db: Session, comment_data: dict) -> RevisionComment:
        db_comment = RevisionComment(**comment_data)
        db.add(db_comment)
        db.commit()
        db.refresh(db_comment)
        return db_comment

    @staticmethod
    def get_revision_comments(db: Session, revision_request_id: int) -> List[RevisionComment]:
        return db.query(RevisionComment).filter(RevisionComment.revision_request_id == revision_request_id).order_by(RevisionComment.created_at.asc()).all()
