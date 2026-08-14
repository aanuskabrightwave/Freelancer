from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.review import Review, ReviewStatus
from app.models.booking import Booking, BookingStatus
from app.models.freelancer_profile import FreelancerProfile
from app.models.service import Service


class RatingService:
    @staticmethod
    def recalculate_freelancer_aggregates(db: Session, freelancer_profile_id: int) -> None:
        """
        Recalculate average_rating, review_count, and completed_jobs_count for a freelancer
        and update the cached values in FreelancerProfile.
        """
        # 1. Calculate ratings aggregates (only for PUBLISHED reviews)
        result = db.query(
            func.coalesce(func.avg(Review.overall_rating), 0),
            func.count(Review.id)
        ).filter(
            Review.freelancer_profile_id == freelancer_profile_id,
            Review.status == ReviewStatus.PUBLISHED
        ).first()

        avg_rating = float(result[0]) if result and result[0] is not None else None
        # Round avg rating to 2 decimal places for storage precision
        if avg_rating is not None:
            if avg_rating == 0:
                avg_rating = None
            else:
                avg_rating = round(avg_rating, 2)
                
        review_cnt = result[1] if result else 0

        # 2. Calculate completed bookings count
        completed_bookings = db.query(func.count(Booking.id)).filter(
            Booking.freelancer_profile_id == freelancer_profile_id,
            Booking.status == BookingStatus.COMPLETED
        ).scalar() or 0

        # 3. Update profile
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == freelancer_profile_id).first()
        if profile:
            profile.average_rating = avg_rating
            profile.review_count = review_cnt
            profile.completed_jobs_count = completed_bookings
            db.commit()

    @staticmethod
    def recalculate_service_aggregates(db: Session, service_id: int) -> None:
        """
        Recalculate average_rating and review_count for a service and update the cached values in Service.
        """
        result = db.query(
            func.coalesce(func.avg(Review.overall_rating), 0),
            func.count(Review.id)
        ).filter(
            Review.service_id == service_id,
            Review.status == ReviewStatus.PUBLISHED
        ).first()

        avg_rating = float(result[0]) if result and result[0] is not None else None
        if avg_rating is not None:
            if avg_rating == 0:
                avg_rating = None
            else:
                avg_rating = round(avg_rating, 2)
                
        review_cnt = result[1] if result else 0

        service = db.query(Service).filter(Service.id == service_id).first()
        if service:
            service.average_rating = avg_rating
            service.review_count = review_cnt
            db.commit()
