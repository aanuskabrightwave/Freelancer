from typing import Optional
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.trust_badge import TrustBadge, FreelancerBadge
from app.models.freelancer_profile import FreelancerProfile
from app.models.user import User


class TrustService:
    @staticmethod
    def seed_badges_if_empty(db: Session) -> None:
        """
        Seeds standard trust badges into the database if they do not exist.
        """
        badges_data = [
            {
                "code": "EMAIL_VERIFIED",
                "name": "Email Verified",
                "description": "User email address is verified by the platform",
                "icon": "shield-check"
            },
            {
                "code": "PHONE_VERIFIED",
                "name": "Phone Verified",
                "description": "User mobile phone is verified by the platform",
                "icon": "phone-check"
            },
            {
                "code": "TOP_RATED",
                "name": "Top Rated",
                "description": "Highly rated creative professional with successful job history",
                "icon": "award"
            },
            {
                "code": "RISING_CREATOR",
                "name": "Rising Creator",
                "description": "Newly verified creative professional showing early success",
                "icon": "sparkles"
            },
            {
                "code": "EXPERIENCED_CREATOR",
                "name": "Experienced Creator",
                "description": "Veteran creative professional with 100+ completed marketplace bookings",
                "icon": "briefcase"
            }
        ]

        for b in badges_data:
            badge = db.query(TrustBadge).filter(TrustBadge.code == b["code"]).first()
            if not badge:
                db.add(TrustBadge(**b))
        db.commit()

    @staticmethod
    def evaluate_freelancer_badges(db: Session, freelancer_profile_id: int) -> None:
        """
        Evaluate and sync trust badges for a freelancer profile.
        """
        # Seed badges first to guarantee existence
        TrustService.seed_badges_if_empty(db)

        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == freelancer_profile_id).first()
        if not profile:
            return

        user = db.query(User).filter(User.id == profile.user_id).first()
        if not user:
            return

        # Fetch all trust badge rows mapped by code
        all_badges = {b.code: b for b in db.query(TrustBadge).filter(TrustBadge.is_active == True).all()}
        
        # Helper to get/create award status
        existing_badges = {
            fb.badge.code: fb 
            for fb in db.query(FreelancerBadge).filter(
                FreelancerBadge.freelancer_profile_id == freelancer_profile_id,
                FreelancerBadge.is_active == True
            ).all()
        }

        # 1. EMAIL_VERIFIED
        email_eligible = bool(user.is_verified)
        TrustService._sync_badge_status(
            db, freelancer_profile_id, all_badges.get("EMAIL_VERIFIED"), 
            email_eligible, existing_badges.get("EMAIL_VERIFIED")
        )

        # 2. PHONE_VERIFIED
        phone_eligible = bool(user.is_phone_verified)
        TrustService._sync_badge_status(
            db, freelancer_profile_id, all_badges.get("PHONE_VERIFIED"),
            phone_eligible, existing_badges.get("PHONE_VERIFIED")
        )

        # 3. TOP_RATED
        avg_rating = profile.average_rating or 0.0
        top_rated_eligible = (
            profile.review_count >= settings.TOP_RATED_MIN_REVIEWS and
            avg_rating >= settings.TOP_RATED_MIN_RATING and
            profile.completed_jobs_count >= settings.TOP_RATED_MIN_COMPLETED_BOOKINGS
        )
        TrustService._sync_badge_status(
            db, freelancer_profile_id, all_badges.get("TOP_RATED"),
            top_rated_eligible, existing_badges.get("TOP_RATED")
        )

        # 4. RISING_CREATOR
        rising_eligible = (
            profile.profile_completion_percentage >= 80 and
            profile.completed_jobs_count >= settings.RISING_CREATOR_MIN_BOOKINGS and
            profile.completed_jobs_count < settings.RISING_CREATOR_MAX_BOOKINGS and
            avg_rating >= settings.RISING_CREATOR_MIN_RATING
        )
        TrustService._sync_badge_status(
            db, freelancer_profile_id, all_badges.get("RISING_CREATOR"),
            rising_eligible, existing_badges.get("RISING_CREATOR")
        )

        # 5. EXPERIENCED_CREATOR
        experienced_eligible = (profile.completed_jobs_count >= 100)
        TrustService._sync_badge_status(
            db, freelancer_profile_id, all_badges.get("EXPERIENCED_CREATOR"),
            experienced_eligible, existing_badges.get("EXPERIENCED_CREATOR")
        )

        db.commit()

    @staticmethod
    def _sync_badge_status(
        db: Session, 
        freelancer_profile_id: int, 
        badge: Optional[TrustBadge], 
        eligible: bool, 
        existing_award: Optional[FreelancerBadge]
    ) -> None:
        if not badge:
            return

        if eligible and not existing_award:
            # Award the badge
            new_award = FreelancerBadge(
                freelancer_profile_id=freelancer_profile_id,
                badge_id=badge.id,
                source="SYSTEM",
                is_active=True
            )
            db.add(new_award)
        elif not eligible and existing_award:
            # Remove badge award
            db.delete(existing_award)
