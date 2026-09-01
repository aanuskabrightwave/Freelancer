from app.core.database import SessionLocal
from app.models import (
    User, UserRole, FreelancerProfile, Skill, FreelancerEquipment, PortfolioItem,
    ServiceCategory, Service, ServicePackage, PackageDeliverable, ServiceMedia, ServiceRequirement,
    Booking, BookingAssignment, Conversation, Message, Project, Proposal, BookingRequirementAnswer,
    FreelancerWeeklySchedule, FreelancerAvailability, BookingRescheduleRequest, BookingWorkspace,
    ConversationParticipant, WorkspaceFile, WorkspaceLink, MessageAttachment, Delivery, DeliveryFile,
    RevisionRequest, RevisionComment, WorkspaceEvent, Payment, PaymentAttempt, PaymentWebhookEvent,
    Refund, FreelancerPayoutAccount, Payout, LedgerEntry, Review, ReviewResponse, ReviewReport,
    FavouriteFreelancer, FavouriteService, TrustBadge, FreelancerBadge, Notification,
    NotificationPreferences, EmailDelivery, FreelancerVerification, VerificationDocument,
    Dispute, DisputeMessage, DisputeEvidence, PlatformSetting, AdminAuditLog
)

def run_cleanup():
    db = SessionLocal()

    # Find preserve users
    abhijeet = db.query(User).filter((User.email == 'abhijeet@gmail.com') | (User.full_name == 'Abhijeet C')).first()
    admin_user = db.query(User).filter(User.email == 'admin@marketplace.com').first()

    preserve_ids = set()
    if abhijeet:
        preserve_ids.add(abhijeet.id)
    if admin_user:
        preserve_ids.add(admin_user.id)

    print(f"Preserving user IDs: {preserve_ids}")

    # 1. Clean child tables
    db.query(ReviewReport).delete()
    db.query(ReviewResponse).delete()
    db.query(Review).delete()

    db.query(DisputeEvidence).delete()
    db.query(DisputeMessage).delete()
    db.query(Dispute).delete()

    db.query(RevisionComment).delete()
    db.query(RevisionRequest).delete()
    db.query(DeliveryFile).delete()
    db.query(Delivery).delete()

    db.query(WorkspaceEvent).delete()
    db.query(WorkspaceFile).delete()
    db.query(WorkspaceLink).delete()
    db.query(MessageAttachment).delete()
    db.query(BookingWorkspace).delete()

    db.query(BookingRescheduleRequest).delete()
    db.query(BookingRequirementAnswer).delete()
    db.query(BookingAssignment).delete()
    db.query(Booking).delete()

    db.query(Proposal).delete()
    db.query(Project).delete()

    db.query(ConversationParticipant).delete()
    db.query(Message).delete()
    db.query(Conversation).delete()

    db.query(Refund).delete()
    db.query(PaymentWebhookEvent).delete()
    db.query(PaymentAttempt).delete()
    db.query(Payment).delete()
    db.query(LedgerEntry).delete()
    db.query(Payout).delete()
    db.query(FreelancerPayoutAccount).delete()

    db.query(PackageDeliverable).delete()
    db.query(ServicePackage).delete()
    db.query(ServiceMedia).delete()
    db.query(ServiceRequirement).delete()
    db.query(Service).delete()

    db.query(FreelancerEquipment).delete()
    db.query(PortfolioItem).delete()
    db.query(VerificationDocument).delete()
    db.query(FreelancerVerification).delete()
    db.query(FreelancerWeeklySchedule).delete()
    db.query(FreelancerAvailability).delete()
    db.query(FreelancerBadge).delete()
    db.query(FavouriteFreelancer).delete()
    db.query(FavouriteService).delete()
    db.query(Skill).delete()
    db.query(FreelancerProfile).delete()

    db.query(EmailDelivery).delete()
    db.query(Notification).delete()
    db.query(NotificationPreferences).delete()

    # 2. Delete all users except preserved
    users_to_delete = db.query(User).filter(~User.id.in_(preserve_ids)).all()
    print(f"Deleting {len(users_to_delete)} users...")
    db.query(User).filter(~User.id.in_(preserve_ids)).delete(synchronize_session=False)

    # 3. Update Abhijeet Login ID and Admin Login ID
    if abhijeet:
        abhijeet.login_id = 'CL-000001'
    if admin_user:
        admin_user.login_id = 'ADM-000001'

    db.commit()

    remaining = db.query(User).all()
    print("Remaining Users in DB:")
    for u in remaining:
        print(f"ID: {u.id}, Email: {u.email}, Name: {u.full_name}, Role: {u.role.value}, LoginID: {u.login_id}")

if __name__ == "__main__":
    run_cleanup()
