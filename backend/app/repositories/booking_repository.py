from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import date, time, datetime

from app.models.booking import Booking, BookingStatus


class BookingRepository:
    @staticmethod
    def create(db: Session, booking_data: dict) -> Booking:
        db_booking = Booking(**booking_data)
        db.add(db_booking)
        db.commit()
        db.refresh(db_booking)
        return db_booking

    @staticmethod
    def get_by_id(db: Session, booking_id: int) -> Optional[Booking]:
        return db.query(Booking).filter(Booking.id == booking_id).first()

    @staticmethod
    def get_by_booking_number(db: Session, booking_number: str) -> Optional[Booking]:
        return db.query(Booking).filter(Booking.booking_number == booking_number).first()

    @staticmethod
    def get_client_bookings(db: Session, client_id: int) -> List[Booking]:
        return db.query(Booking).filter(Booking.client_id == client_id).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def get_freelancer_bookings(db: Session, freelancer_profile_id: int) -> List[Booking]:
        return db.query(Booking).filter(Booking.freelancer_profile_id == freelancer_profile_id).order_by(Booking.created_at.desc()).all()

    @staticmethod
    def update_status(db: Session, booking: Booking, status: BookingStatus) -> Booking:
        booking.status = status
        db.commit()
        db.refresh(booking)
        return booking

    @staticmethod
    def generate_booking_number(db: Session) -> str:
        year = datetime.now().year
        # Loop to ensure uniqueness against race conditions
        count = db.query(func.count(Booking.id)).scalar()
        attempts = 0
        while attempts < 100:
            num = count + 1 + attempts
            booking_num = f"CM-{year}-{num:06d}"
            existing = db.query(Booking).filter(Booking.booking_number == booking_num).first()
            if not existing:
                return booking_num
            attempts += 1
        raise Exception("Failed to generate unique booking number after multiple attempts")

    @staticmethod
    def get_overlapping_bookings(
        db: Session,
        freelancer_profile_id: int,
        scheduled_date: date,
        start_time: time,
        end_time: time,
        exclude_booking_id: Optional[int] = None
    ) -> List[Booking]:
        # Overlapping interval formula: new_start < existing_end AND new_end > existing_start
        query = db.query(Booking).filter(
            Booking.freelancer_profile_id == freelancer_profile_id,
            Booking.scheduled_date == scheduled_date,
            # Conflict only with active confirmed states
            Booking.status.in_([
                BookingStatus.CONFIRMED,
                BookingStatus.IN_PROGRESS,
                BookingStatus.DELIVERY_PENDING,
                BookingStatus.RESCHEDULE_REQUESTED
            ]),
            Booking.start_time < end_time,
            Booking.end_time > start_time
        )
        if exclude_booking_id:
            query = query.filter(Booking.id != exclude_booking_id)
        return query.all()
