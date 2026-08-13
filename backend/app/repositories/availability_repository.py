from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import date, time
from app.models.availability import FreelancerWeeklySchedule, FreelancerAvailability, AvailabilityType


class AvailabilityRepository:
    @staticmethod
    def get_weekly_schedule(db: Session, freelancer_profile_id: int) -> List[FreelancerWeeklySchedule]:
        return db.query(FreelancerWeeklySchedule).filter(
            FreelancerWeeklySchedule.freelancer_profile_id == freelancer_profile_id
        ).all()

    @staticmethod
    def get_weekly_schedule_for_day(db: Session, freelancer_profile_id: int, day_of_week: str) -> Optional[FreelancerWeeklySchedule]:
        return db.query(FreelancerWeeklySchedule).filter(
            FreelancerWeeklySchedule.freelancer_profile_id == freelancer_profile_id,
            FreelancerWeeklySchedule.day_of_week == day_of_week
        ).first()

    @staticmethod
    def save_weekly_schedule(db: Session, freelancer_profile_id: int, schedules_data: list) -> List[FreelancerWeeklySchedule]:
        # Delete existing schedules for this freelancer first to allow full replacements
        db.query(FreelancerWeeklySchedule).filter(
            FreelancerWeeklySchedule.freelancer_profile_id == freelancer_profile_id
        ).delete()

        created_records = []
        for s in schedules_data:
            from datetime import datetime
            
            # Helper to parse HH:MM string to time object
            start_t = datetime.strptime(s["start_time"], "%H:%M").time() if isinstance(s["start_time"], str) else s["start_time"]
            end_t = datetime.strptime(s["end_time"], "%H:%M").time() if isinstance(s["end_time"], str) else s["end_time"]

            db_sched = FreelancerWeeklySchedule(
                freelancer_profile_id=freelancer_profile_id,
                day_of_week=s["day_of_week"].upper(),
                is_available=s["is_available"],
                start_time=start_t,
                end_time=end_t
            )
            db.add(db_sched)
            created_records.append(db_sched)
        
        db.commit()
        return created_records

    @staticmethod
    def get_override_by_date(db: Session, freelancer_profile_id: int, target_date: date) -> Optional[FreelancerAvailability]:
        return db.query(FreelancerAvailability).filter(
            FreelancerAvailability.freelancer_profile_id == freelancer_profile_id,
            FreelancerAvailability.date == target_date
        ).first()

    @staticmethod
    def get_overrides(db: Session, freelancer_profile_id: int) -> List[FreelancerAvailability]:
        return db.query(FreelancerAvailability).filter(
            FreelancerAvailability.freelancer_profile_id == freelancer_profile_id
        ).order_by(FreelancerAvailability.date.asc()).all()

    @staticmethod
    def create_override(db: Session, freelancer_profile_id: int, override_data: dict) -> FreelancerAvailability:
        from datetime import datetime
        # Parse time inputs
        start_t = None
        if override_data.get("start_time"):
            start_t = datetime.strptime(override_data["start_time"], "%H:%M").time() if isinstance(override_data["start_time"], str) else override_data["start_time"]
        
        end_t = None
        if override_data.get("end_time"):
            end_t = datetime.strptime(override_data["end_time"], "%H:%M").time() if isinstance(override_data["end_time"], str) else override_data["end_time"]

        # Delete any existing override for the same date
        db.query(FreelancerAvailability).filter(
            FreelancerAvailability.freelancer_profile_id == freelancer_profile_id,
            FreelancerAvailability.date == override_data["date"]
        ).delete()

        db_override = FreelancerAvailability(
            freelancer_profile_id=freelancer_profile_id,
            date=override_data["date"],
            start_time=start_t,
            end_time=end_t,
            availability_type=override_data["availability_type"].upper(),
            note=override_data.get("note")
        )
        db.add(db_override)
        db.commit()
        db.refresh(db_override)
        return db_override

    @staticmethod
    def delete_override(db: Session, override_id: int, freelancer_profile_id: int) -> bool:
        override = db.query(FreelancerAvailability).filter(
            FreelancerAvailability.id == override_id,
            FreelancerAvailability.freelancer_profile_id == freelancer_profile_id
        ).first()
        if override:
            db.delete(override)
            db.commit()
            return True
        return False
