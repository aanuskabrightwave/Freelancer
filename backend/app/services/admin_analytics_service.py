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
from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
from app.models.delivery import Delivery, DeliveryType, AdminReviewStatus


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
        gvm = db.query(func.sum(Payment.gross_amount)).filter(Payment.status.in_(["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"])).scalar() or Decimal("0.00")
        platform_revenue = db.query(func.sum(Payment.platform_fee_amount)).filter(Payment.status.in_(["CAPTURED", "REFUNDED", "PARTIALLY_REFUNDED"])).scalar() or Decimal("0.00")
        pending_payouts = db.query(func.sum(Payout.amount)).filter(Payout.status == "PROCESSING").scalar() or Decimal("0.00")

        # 4. Operational counters
        pending_verifications = db.query(FreelancerVerification).filter(
            FreelancerVerification.status.in_([VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW])
        ).count()
        open_disputes = db.query(Dispute).filter(Dispute.status != DisputeStatus.RESOLVED, Dispute.status != DisputeStatus.CLOSED).count()
        reported_reviews = db.query(ReviewReport).filter(ReviewReport.status == ReportStatus.OPEN).count()

        # 5. Managed operational counts (Task 4A)
        new_bookings = db.query(Booking).filter(
            Booking.is_admin_managed == True, 
            Booking.status == BookingStatus.REQUESTED
        ).count()

        job_posts_to_review = db.query(Project).filter(
            Project.is_admin_managed == True, 
            Project.status == "SUBMITTED"
        ).count()

        pending_freelancer_responses = db.query(BookingAssignment).filter(
            BookingAssignment.status == AssignmentStatus.OFFERED.value
        ).count()

        counter_offers = db.query(BookingAssignment).filter(
            BookingAssignment.status == AssignmentStatus.DECLINED.value,
            BookingAssignment.counter_offer_amount.isnot(None)
        ).count()

        replacements_awaiting_approval = db.query(BookingAssignment).filter(
            BookingAssignment.is_replacement == True,
            BookingAssignment.client_approval_required == True,
            BookingAssignment.client_approval_status == ClientApprovalStatus.PENDING.value
        ).count()

        submissions_to_review = db.query(Delivery).filter(
            Delivery.admin_review_status.in_([AdminReviewStatus.PENDING.value, AdminReviewStatus.UNDER_REVIEW.value])
        ).count()

        payments_pending = db.query(Booking).filter(
            Booking.is_admin_managed == True,
            Booking.payment_completion_state != "FULLY_PAID",
            Booking.status.notin_([BookingStatus.REJECTED, BookingStatus.CANCELLED])
        ).count()

        deliveries_ready = db.query(Delivery).filter(
            Delivery.delivery_type == DeliveryType.FINAL,
            Delivery.admin_review_status == AdminReviewStatus.APPROVED.value
        ).count()

        payouts_ready = db.query(Payout).filter(
            Payout.status == "PENDING"
        ).count()

        # Needs Attention Queue list
        attention_items = []
        
        # New bookings needing review
        req_bookings = db.query(Booking).filter(
            Booking.is_admin_managed == True, 
            Booking.status == BookingStatus.REQUESTED
        ).order_by(Booking.created_at.desc()).limit(10).all()
        for b in req_bookings:
            attention_items.append({
                "id": f"booking-review-{b.id}",
                "type": "booking_review",
                "title": f"Booking {b.booking_number} needs review",
                "action_label": "Review Booking",
                "action_url": f"/admin/bookings/{b.id}",
                "created_at": b.created_at.isoformat() if b.created_at else None
            })
            
        # Projects needing review
        sub_projects = db.query(Project).filter(
            Project.is_admin_managed == True,
            Project.status == "SUBMITTED"
        ).order_by(Project.created_at.desc()).limit(10).all()
        for p in sub_projects:
            attention_items.append({
                "id": f"project-review-{p.id}",
                "type": "project_review",
                "title": f"Project Post '{p.title}' needs review",
                "action_label": "Review Project",
                "action_url": f"/admin/bookings",
                "created_at": p.created_at.isoformat() if p.created_at else None
            })
            
        # Freelancer counter offers
        countered_assigns = db.query(BookingAssignment).filter(
            BookingAssignment.status == AssignmentStatus.DECLINED.value,
            BookingAssignment.counter_offer_amount.isnot(None)
        ).order_by(BookingAssignment.responded_at.desc()).limit(10).all()
        for a in countered_assigns:
            attention_items.append({
                "id": f"counter-offer-{a.id}",
                "type": "counter_offer",
                "title": f"Freelancer proposed counter-offer on Booking {a.booking.booking_number if a.booking else a.booking_id}",
                "action_label": "Review Counter",
                "action_url": f"/admin/bookings/{a.booking_id}",
                "created_at": a.responded_at.isoformat() if a.responded_at else None
            })

        # Replacement approvals awaiting Client response
        rep_approvals = db.query(BookingAssignment).filter(
            BookingAssignment.is_replacement == True,
            BookingAssignment.client_approval_required == True,
            BookingAssignment.client_approval_status == ClientApprovalStatus.PENDING.value
        ).order_by(BookingAssignment.created_at.desc()).limit(10).all()
        for a in rep_approvals:
            attention_items.append({
                "id": f"replacement-approval-{a.id}",
                "type": "replacement_approval",
                "title": f"Replacement candidate on Booking {a.booking.booking_number if a.booking else a.booking_id} awaits Client approval",
                "action_label": "View Booking",
                "action_url": f"/admin/bookings/{a.booking_id}",
                "created_at": a.created_at.isoformat() if a.created_at else None
            })
            
        # Freelancer submissions awaiting admin review
        sub_deliveries = db.query(Delivery).filter(
            Delivery.admin_review_status.in_([AdminReviewStatus.PENDING.value, AdminReviewStatus.UNDER_REVIEW.value])
        ).order_by(Delivery.submitted_at.desc()).limit(10).all()
        for d in sub_deliveries:
            attention_items.append({
                "id": f"submission-review-{d.id}",
                "type": "submission_review",
                "title": f"Delivery submission on Booking {d.booking.booking_number if d.booking else d.booking_id} needs review",
                "action_label": "Open Submission",
                "action_url": f"/admin/bookings/{d.booking_id}",
                "created_at": d.submitted_at.isoformat() if d.submitted_at else None
            })
            
        # Payouts ready for release
        pend_payouts = db.query(Payout).filter(
            Payout.status == "PENDING"
        ).order_by(Payout.created_at.desc()).limit(10).all()
        for py in pend_payouts:
            attention_items.append({
                "id": f"payout-release-{py.id}",
                "type": "payout_release",
                "title": f"Payout {py.payout_number} of amount ₹{py.amount} ready for release",
                "action_label": "View Payouts",
                "action_url": f"/admin/dashboard",
                "created_at": py.created_at.isoformat() if py.created_at else None
            })

        # Sort all attention items by created_at desc
        attention_items.sort(key=lambda x: x["created_at"] or "", reverse=True)
        attention_items = attention_items[:15]

        # Recent booking requests
        recent_bookings = []
        recent_req = db.query(Booking).filter(
            Booking.is_admin_managed == True
        ).order_by(Booking.created_at.desc()).limit(5).all()
        for b in recent_req:
            recent_bookings.append({
                "id": b.id,
                "booking_number": b.booking_number,
                "client_name": b.client.full_name if b.client else "",
                "freelancer_name": b.freelancer.user.full_name if (b.freelancer and b.freelancer.user) else None,
                "selected_freelancer_name": b.selected_freelancer.user.full_name if (b.selected_freelancer and b.selected_freelancer.user) else None,
                "booking_date": b.scheduled_date.isoformat() if b.scheduled_date else (b.booking_date.isoformat() if b.booking_date else None),
                "venue": b.venue_name or b.location_city or "",
                "budget": str(b.agreed_amount),
                "status": b.status.value if hasattr(b.status, "value") else str(b.status),
                "created_at": b.created_at.isoformat() if b.created_at else None
            })

        # Recent Client Job Posts
        recent_projects = []
        recent_proj_list = db.query(Project).filter(
            Project.is_admin_managed == True
        ).order_by(Project.created_at.desc()).limit(5).all()
        for p in recent_proj_list:
            recent_projects.append({
                "id": p.id,
                "title": p.title,
                "client_name": p.client.full_name if p.client else "",
                "budget": str(p.budget),
                "status": p.status,
                "created_at": p.created_at.isoformat() if p.created_at else None
            })

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
            },
            "managed_ops": {
                "new_bookings": new_bookings,
                "job_posts_to_review": job_posts_to_review,
                "pending_freelancer_responses": pending_freelancer_responses,
                "counter_offers": counter_offers,
                "replacements_awaiting_approval": replacements_awaiting_approval,
                "submissions_to_review": submissions_to_review,
                "payments_pending": payments_pending,
                "deliveries_ready": deliveries_ready,
                "payouts_ready": payouts_ready
            },
            "attention_items": attention_items,
            "recent_bookings": recent_bookings,
            "recent_projects": recent_projects
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
