from sqlalchemy.orm import Session
from datetime import date, time, datetime
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status

from app.repositories.availability_repository import AvailabilityRepository
from app.repositories.booking_repository import BookingRepository
from app.models.availability import FreelancerWeeklySchedule, FreelancerAvailability


class AvailabilityService:
    @staticmethod
    def check_availability(
        db: Session,
        freelancer_profile_id: int,
        scheduled_date: date,
        start_time: time,
        end_time: time,
        exclude_booking_id: Optional[int] = None
    ) -> Dict[str, Any]:
        # 1. Booking conflict check (overlapping bookings)
        overlaps = BookingRepository.get_overlapping_bookings(
            db, freelancer_profile_id, scheduled_date, start_time, end_time, exclude_booking_id
        )
        if overlaps:
            return {
                "available": False,
                "reason": f"Conflict detected with confirmed booking CM ID #{overlaps[0].booking_number}"
            }

        # 2. Dateoverride check
        override = AvailabilityRepository.get_override_by_date(db, freelancer_profile_id, scheduled_date)
        if override:
            if override.availability_type in ["UNAVAILABLE", "BLOCKED"]:
                return {
                    "available": False,
                    "reason": f"Freelancer blocked this date override ({override.availability_type}): {override.note or ''}"
                }
            # Override says AVAILABLE: verify range
            if override.start_time and override.end_time:
                if start_time < override.start_time or end_time > override.end_time:
                    return {
                        "available": False,
                        "reason": f"Requested hours fall outside override availability window: {override.start_time.strftime('%H:%M')} - {override.end_time.strftime('%H:%M')}"
                    }
            return {"available": True, "reason": "Available (Date Override)"}

        # 3. Weekly schedule check
        day_str = scheduled_date.strftime("%A").upper()
        weekly = AvailabilityRepository.get_weekly_schedule_for_day(db, freelancer_profile_id, day_str)
        if not weekly or not weekly.is_available:
            return {
                "available": False,
                "reason": f"Freelancer does not offer working hours on {day_str}s"
            }

        if start_time < weekly.start_time or end_time > weekly.end_time:
            return {
                "available": False,
                "reason": f"Requested hours fall outside freelancer's standard hours: {weekly.start_time.strftime('%H:%M')} - {weekly.end_time.strftime('%H:%M')}"
            }

        return {"available": True, "reason": "Available (Standard Schedule)"}

    @staticmethod
    def get_weekly_schedule(db: Session, freelancer_profile_id: int) -> List[FreelancerWeeklySchedule]:
        return AvailabilityRepository.get_weekly_schedule(db, freelancer_profile_id)

    @staticmethod
    def update_weekly_schedule(db: Session, freelancer_profile_id: int, schedules_in: list) -> List[FreelancerWeeklySchedule]:
        return AvailabilityRepository.save_weekly_schedule(db, freelancer_profile_id, schedules_in)

    @staticmethod
    def get_overrides(db: Session, freelancer_profile_id: int) -> List[FreelancerAvailability]:
        return AvailabilityRepository.get_overrides(db, freelancer_profile_id)

    @staticmethod
    def create_override(db: Session, freelancer_profile_id: int, override_in: dict) -> FreelancerAvailability:
        # Check past date override
        if override_in["date"] < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot manage availability overrides for past dates"
            )
        return AvailabilityRepository.create_override(db, freelancer_profile_id, override_in)

    @staticmethod
    def delete_override(db: Session, override_id: int, freelancer_profile_id: int) -> bool:
        success = AvailabilityRepository.delete_override(db, override_id, freelancer_profile_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Availability override record not found"
            )
        return True
