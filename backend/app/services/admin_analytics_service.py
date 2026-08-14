from datetime import datetime, timedelta
from decimal import Decimal
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, VerificationStatus
from app.models.service import Service
from app.models.project import Project
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.payout import Payout
from app.models.dispute import Dispute, DisputeStatus
from app.models.review_report import ReviewReport, ReportStatus
from app.models.review import Review
from app.models.verification import FreelancerVerification


class AdminAnalyticsService:
    @staticmethod
    def get_dashboard_summary(db: Session) -> Dict[str, Any]:
        # 1. User counters
        total_users = db.query(User).count()
        clients_count = db.query(User).filter(User.role == UserRole.CLIENT).count()
        freelancers_count = db.query(User).filter(User.role == UserRole.FREELANCER).count()

        # 2. Marketplace counters
        total_services = db.query(Service).count()
        total_projects = db.query(Project).count()
        total_bookings = db.query(Booking).count()
        completed_bookings = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).count()

        # 3. Financial aggregates
        # Gross Marketplace Volume = Sum of paid Payments (CAPTURED status)
        gvm = db.query(func.sum(Payment.gross_amount)).filter(Payment.status.in_(["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"])).scalar() or Decimal("0.00")
        platform_revenue = db.query(func.sum(Payment.platform_fee_amount)).filter(Payment.status.in_(["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"])).scalar() or Decimal("0.00")
        
        # Pending Payouts = Sum of Payouts in PROCESSING or Ledger entries PENDING payout
        pending_payouts = db.query(func.sum(Payout.amount)).filter(Payout.status == "PROCESSING").scalar() or Decimal("0.00")

        # 4. Operational counters
        pending_verifications = db.query(FreelancerVerification).filter(
            FreelancerVerification.status.in_([VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW])
        ).count()
        open_disputes = db.query(Dispute).filter(Dispute.status != DisputeStatus.RESOLVED, Dispute.status != DisputeStatus.CLOSED).count()
        reported_reviews = db.query(ReviewReport).filter(ReviewReport.status == ReportStatus.OPEN).count()

        return {
            "users": {
                "total": total_users,
                "clients": clients_count,
                "freelancers": freelancers_count
            },
            "marketplace": {
                "services": total_services,
                "projects": total_projects,
                "bookings": total_bookings,
                "completed_bookings": completed_bookings
            },
            "financial": {
                "gross_volume": str(gvm),
                "platform_revenue": str(platform_revenue),
                "pending_payouts": str(pending_payouts)
            },
            "operations": {
                "pending_verifications": pending_verifications,
                "open_disputes": open_disputes,
                "reported_reviews": reported_reviews
            }
        }

    @staticmethod
    def get_filtered_analytics(db: Session, days_limit: int = 30) -> Dict[str, Any]:
        start_date = datetime.now() - timedelta(days=days_limit)

        # 1. User registrations over time
        user_regs = db.query(
            func.date(User.created_at).label("date"),
            func.count(User.id).label("count")
        ).filter(User.created_at >= start_date).group_by(func.date(User.created_at)).all()

        # 2. Bookings over time
        bookings_trend = db.query(
            func.date(Booking.created_at).label("date"),
            func.count(Booking.id).label("count")
        ).filter(Booking.created_at >= start_date).group_by(func.date(Booking.created_at)).all()

        # 3. Marketplace payment volume (GVM) and Platform revenue
        financials_trend = db.query(
            func.date(Payment.paid_at).label("date"),
            func.sum(Payment.gross_amount).label("gvm"),
            func.sum(Payment.platform_fee_amount).label("revenue")
        ).filter(
            Payment.paid_at >= start_date,
            Payment.status.in_(["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"])
        ).group_by(func.date(Payment.paid_at)).all()

        # 4. Completed vs cancelled booking counts
        completed_cancelled = db.query(
            Booking.status.label("status"),
            func.count(Booking.id).label("count")
        ).filter(
            Booking.created_at >= start_date,
            Booking.status.in_([BookingStatus.COMPLETED, BookingStatus.CANCELLED])
        ).group_by(Booking.status).all()

        return {
            "registrations": [{"date": str(r.date), "count": r.count} for r in user_regs],
            "bookings": [{"date": str(b.date), "count": b.count} for b in bookings_trend],
            "financials": [{
                "date": str(f.date),
                "gvm": str(f.gvm or Decimal("0.00")),
                "revenue": str(f.revenue or Decimal("0.00"))
            } for f in financials_trend],
            "completions": {status.value: count for status, count in completed_cancelled}
        }
