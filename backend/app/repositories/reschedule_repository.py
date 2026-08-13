from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
from app.models.reschedule import BookingRescheduleRequest, RescheduleRequestStatus


class RescheduleRepository:
    @staticmethod
    def create_request(db: Session, request_data: dict) -> BookingRescheduleRequest:
        db_request = BookingRescheduleRequest(**request_data)
        db.add(db_request)
        db.commit()
        db.refresh(db_request)
        return db_request

    @staticmethod
    def get_by_id(db: Session, request_id: int) -> Optional[BookingRescheduleRequest]:
        return db.query(BookingRescheduleRequest).filter(BookingRescheduleRequest.id == request_id).first()

    @staticmethod
    def get_pending_request_for_booking(db: Session, booking_id: int) -> Optional[BookingRescheduleRequest]:
        return db.query(BookingRescheduleRequest).filter(
            BookingRescheduleRequest.booking_id == booking_id,
            BookingRescheduleRequest.status == RescheduleRequestStatus.PENDING
        ).first()

    @staticmethod
    def update_status(db: Session, request: BookingRescheduleRequest, status: RescheduleRequestStatus) -> BookingRescheduleRequest:
        request.status = status
        request.responded_at = datetime.now()
        db.commit()
        db.refresh(request)
        return request
