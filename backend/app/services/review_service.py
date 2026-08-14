from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from fastapi import HTTPException, status
from app.models.review import Review, ReviewStatus
from app.models.review_response import ReviewResponse
from app.models.review_report import ReviewReport, ReportStatus
from app.models.booking import Booking, BookingStatus
from app.models.freelancer_profile import FreelancerProfile
from app.services.rating_service import RatingService
from app.services.trust_service import TrustService


class ReviewService:
    @staticmethod
    def create_review(db: Session, client_id: int, booking_id: int, review_data: dict) -> Review:
        # 1. Fetch booking and perform security validation
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking request not found.")

        if booking.client_id != client_id:
            raise HTTPException(status_code=403, detail="You do not own this booking.")

        if booking.status != BookingStatus.COMPLETED:
            raise HTTPException(status_code=400, detail="Only completed bookings can be reviewed.")

        if not booking.freelancer_profile_id:
            raise HTTPException(status_code=400, detail="No freelancer is assigned to this booking.")

        # 2. Check for duplicate reviews
        existing_review = db.query(Review).filter(Review.booking_id == booking_id).first()
        if existing_review:
            raise HTTPException(status_code=400, detail="A review has already been submitted for this booking.")

        # 3. Create review mapping fields from booking
        db_review = Review(
            booking_id=booking_id,
            client_id=client_id,
            freelancer_profile_id=booking.freelancer_profile_id,
            service_id=booking.service_id,
            project_id=booking.project_id,
            status=ReviewStatus.PUBLISHED,
            is_verified_booking=True,
            **review_data
        )

        db.add(db_review)
        db.commit()
        db.refresh(db_review)

        # 4. Trigger calculations & trust badges
        RatingService.recalculate_freelancer_aggregates(db, booking.freelancer_profile_id)
        if booking.service_id:
            RatingService.recalculate_service_aggregates(db, booking.service_id)
        TrustService.evaluate_freelancer_badges(db, booking.freelancer_profile_id)

        # Trigger notification to freelancer
        try:
            from app.services.notification_service import NotificationService
            from app.repositories.freelancer_repository import FreelancerRepository
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
            client_user = booking.client
            client_name = client_user.full_name if client_user else "Client"
            
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="REVIEW_RECEIVED",
                title="New Review Received",
                message=f"You received a new {db_review.overall_rating}-star review from {client_name}.",
                action_url="/freelancer/reviews",
                entity_type="review",
                entity_id=db_review.id,
                deduplication_key=f"review:{db_review.id}:received:freelancer:{freelancer_profile.user_id}",
                payload_meta={
                    "rating": str(db_review.overall_rating),
                    "client_name": client_name,
                    "booking_id": booking.id
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("review_service").exception("Review received notification failed")

        return db_review

    @staticmethod
    def edit_review(db: Session, client_id: int, review_id: int, update_data: dict) -> Review:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        if review.client_id != client_id:
            raise HTTPException(status_code=403, detail="You do not have permission to edit this review.")

        # Set status back to PUBLISHED if it was REPORTED or HIDDEN (for moderation safety if they edit it, or keep it published)
        # For Phase 9, we'll keep its status or set it to PUBLISHED if edited
        review.status = ReviewStatus.PUBLISHED

        for key, value in update_data.items():
            if value is not None:
                setattr(review, key, value)

        review.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(review)

        # Trigger recalculation
        RatingService.recalculate_freelancer_aggregates(db, review.freelancer_profile_id)
        if review.service_id:
            RatingService.recalculate_service_aggregates(db, review.service_id)
        TrustService.evaluate_freelancer_badges(db, review.freelancer_profile_id)

        return review

    @staticmethod
    def soft_delete_review(db: Session, client_id: int, review_id: int) -> None:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        if review.client_id != client_id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this review.")

        # Soft deletion: set status to REMOVED
        review.status = ReviewStatus.REMOVED
        review.updated_at = datetime.utcnow()
        db.commit()

        # Trigger recalculation
        RatingService.recalculate_freelancer_aggregates(db, review.freelancer_profile_id)
        if review.service_id:
            RatingService.recalculate_service_aggregates(db, review.service_id)
        TrustService.evaluate_freelancer_badges(db, review.freelancer_profile_id)

    @staticmethod
    def get_client_reviews(db: Session, client_id: int) -> List[Review]:
        # Do not return REMOVED reviews
        reviews = db.query(Review).filter(
            Review.client_id == client_id,
            Review.status != ReviewStatus.REMOVED
        ).order_by(desc(Review.created_at)).all()
        
        for r in reviews:
            # Attach first name format (Rahul M.)
            client_user = r.client
            if client_user:
                names = client_user.full_name.split()
                if len(names) > 1:
                    r.client_name = f"{names[0]} {names[1][0]}."
                else:
                    r.client_name = client_user.full_name
        return reviews

    @staticmethod
    def get_freelancer_reviews(db: Session, freelancer_profile_id: int) -> List[Review]:
        # Return all reviews that are NOT REMOVED
        reviews = db.query(Review).filter(
            Review.freelancer_profile_id == freelancer_profile_id,
            Review.status != ReviewStatus.REMOVED
        ).order_by(desc(Review.created_at)).all()
        
        for r in reviews:
            client_user = r.client
            if client_user:
                names = client_user.full_name.split()
                if len(names) > 1:
                    r.client_name = f"{names[0]} {names[1][0]}."
                else:
                    r.client_name = client_user.full_name
        return reviews

    @staticmethod
    def create_response(db: Session, freelancer_profile_id: int, review_id: int, response_text: str) -> ReviewResponse:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        if review.freelancer_profile_id != freelancer_profile_id:
            raise HTTPException(status_code=403, detail="You can only respond to reviews left on your profile.")

        # Enforce one response per review
        existing_resp = db.query(ReviewResponse).filter(ReviewResponse.review_id == review_id).first()
        if existing_resp:
            raise HTTPException(status_code=400, detail="You have already responded to this review.")

        db_resp = ReviewResponse(
            review_id=review_id,
            freelancer_profile_id=freelancer_profile_id,
            response=response_text
        )
        db.add(db_resp)
        db.commit()
        db.refresh(db_resp)

        # Trigger notification to client
        try:
            from app.services.notification_service import NotificationService
            from app.repositories.freelancer_repository import FreelancerRepository
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, freelancer_profile_id)
            freelancer_name = freelancer_profile.user.full_name if freelancer_profile and freelancer_profile.user else "Freelancer"
            
            NotificationService.dispatch(
                db=db,
                recipient_id=review.client_id,
                event_code="REVIEW_RESPONSE_RECEIVED",
                title="Review Reply Received",
                message=f"{freelancer_name} replied to your review.",
                action_url=f"/client/bookings/{review.booking_id}",
                entity_type="review_response",
                entity_id=db_resp.id,
                deduplication_key=f"review_response:{db_resp.id}:received:client:{review.client_id}",
                payload_meta={
                    "booking_id": review.booking_id
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("review_service").exception("Review response notification failed")

        return db_resp

    @staticmethod
    def edit_response(db: Session, freelancer_profile_id: int, review_id: int, response_text: str) -> ReviewResponse:
        resp = db.query(ReviewResponse).filter(
            ReviewResponse.review_id == review_id,
            ReviewResponse.freelancer_profile_id == freelancer_profile_id
        ).first()

        if not resp:
            raise HTTPException(status_code=404, detail="Response not found.")

        resp.response = response_text
        resp.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(resp)
        return resp

    @staticmethod
    def create_report(db: Session, reported_by_user_id: int, review_id: int, report_data: dict) -> ReviewReport:
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")

        # Check if already reported by this user
        existing = db.query(ReviewReport).filter(
            ReviewReport.review_id == review_id,
            ReviewReport.reported_by_user_id == reported_by_user_id
        ).first()
        if existing:
            return existing

        db_report = ReviewReport(
            review_id=review_id,
            reported_by_user_id=reported_by_user_id,
            status=ReportStatus.OPEN,
            **report_data
        )
        
        # Optionally update review status to REPORTED for moderation flags (but keep it published as per specs)
        if review.status == ReviewStatus.PUBLISHED:
            review.status = ReviewStatus.REPORTED

        db.add(db_report)
        db.commit()
        db.refresh(db_report)
        return db_report

    @staticmethod
    def list_public_freelancer_reviews(
        db: Session,
        freelancer_profile_id: int,
        page: int,
        page_size: int,
        rating: Optional[int] = None,
        sort: Optional[str] = None
    ) -> List[Review]:
        # Return ONLY PUBLISHED or REPORTED reviews (do not return HIDDEN or REMOVED reviews)
        query = db.query(Review).filter(
            Review.freelancer_profile_id == freelancer_profile_id,
            Review.status.in_([ReviewStatus.PUBLISHED, ReviewStatus.REPORTED])
        )

        if rating:
            query = query.filter(Review.overall_rating == rating)

        # Sorting: Newest, Oldest, Highest Rating, Lowest Rating
        if sort == "newest" or not sort:
            query = query.order_by(desc(Review.created_at))
        elif sort == "oldest":
            query = query.order_by(asc(Review.created_at))
        elif sort == "highest":
            query = query.order_by(desc(Review.overall_rating))
        elif sort == "lowest":
            query = query.order_by(asc(Review.overall_rating))

        offset = (page - 1) * page_size
        reviews = query.offset(offset).limit(page_size).all()

        for r in reviews:
            client_user = r.client
            if client_user:
                names = client_user.full_name.split()
                if len(names) > 1:
                    r.client_name = f"{names[0]} {names[1][0]}."
                else:
                    r.client_name = client_user.full_name
        return reviews

    @staticmethod
    def list_service_reviews(
        db: Session,
        service_id: int,
        page: int,
        page_size: int
    ) -> List[Review]:
        # Return ONLY PUBLISHED/REPORTED reviews associated with bookings of this service
        query = db.query(Review).filter(
            Review.service_id == service_id,
            Review.status.in_([ReviewStatus.PUBLISHED, ReviewStatus.REPORTED])
        ).order_by(desc(Review.created_at))

        offset = (page - 1) * page_size
        reviews = query.offset(offset).limit(page_size).all()

        for r in reviews:
            client_user = r.client
            if client_user:
                names = client_user.full_name.split()
                if len(names) > 1:
                    r.client_name = f"{names[0]} {names[1][0]}."
                else:
                    r.client_name = client_user.full_name
        return reviews
