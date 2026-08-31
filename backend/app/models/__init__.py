# Import Base first to ensure models register correctly
from app.core.database import Base
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.models.skill import Skill
from app.models.equipment import FreelancerEquipment, EquipmentType
from app.models.portfolio import PortfolioItem, MediaType
from app.models.service_category import ServiceCategory
from app.models.service import Service, ServiceType, ServiceStatus
from app.models.service_package import ServicePackage, PackageType, PackageDeliverable
from app.models.service_media import ServiceMedia
from app.models.service_requirement import ServiceRequirement, RequirementFieldType
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
from app.models.message import Conversation, Message, ConversationType, MessageType
from app.models.project import Project, Proposal
from app.models.booking_requirement_answer import BookingRequirementAnswer
from app.models.availability import FreelancerWeeklySchedule, FreelancerAvailability, AvailabilityType
from app.models.reschedule import BookingRescheduleRequest, RescheduleRequestStatus
from app.models.workspace import BookingWorkspace
from app.models.conversation_participant import ConversationParticipant
from app.models.workspace_file import WorkspaceFile, WorkspaceLink, MessageAttachment
from app.models.delivery import Delivery, DeliveryFile, DeliveryType, DeliveryStatus, AdminReviewStatus
from app.models.revision import RevisionRequest, RevisionComment, RevisionStatus
from app.models.workspace_event import WorkspaceEvent, WorkspaceEventType
from app.models.payment import Payment, PaymentAttempt, PaymentWebhookEvent
from app.models.refund import Refund
from app.models.payout_account import FreelancerPayoutAccount
from app.models.payout import Payout
from app.models.ledger import LedgerEntry
from app.models.review import Review, ReviewStatus
from app.models.review_response import ReviewResponse
from app.models.review_report import ReviewReport, ReportReason, ReportStatus
from app.models.favourite import FavouriteFreelancer, FavouriteService
from app.models.trust_badge import TrustBadge, FreelancerBadge
from app.models.notification import Notification, NotificationType
from app.models.notification_preferences import NotificationPreferences
from app.models.email_delivery import EmailDelivery
from app.models.verification import FreelancerVerification, VerificationDocument, DocumentType, DocumentStatus
from app.models.dispute import Dispute, DisputeMessage, DisputeEvidence, DisputeReason, DisputeStatus, DisputePriority, ResolutionType
from app.models.platform_setting import PlatformSetting, SettingValueType
from app.models.admin_audit_log import AdminAuditLog

__all__ = [
    "Base",
    "User",
    "UserRole",
    "FreelancerProfile",
    "FreelancerProfession",
    "VerificationStatus",
    "Skill",
    "FreelancerEquipment",
    "EquipmentType",
    "PortfolioItem",
    "MediaType",
    "ServiceCategory",
    "Service",
    "ServiceType",
    "ServiceStatus",
    "ServicePackage",
    "PackageType",
    "PackageDeliverable",
    "ServiceMedia",
    "ServiceRequirement",
    "RequirementFieldType",
    "Booking",
    "BookingStatus",
    "BookingSourceType",
    "BookingAssignment",
    "AssignmentStatus",
    "ClientApprovalStatus",
    "Conversation",
    "ConversationType",
    "Message",
    "MessageType",
    "Project",
    "Proposal",
    "BookingRequirementAnswer",
    "FreelancerWeeklySchedule",
    "FreelancerAvailability",
    "AvailabilityType",
    "BookingRescheduleRequest",
    "RescheduleRequestStatus",
    "BookingWorkspace",
    "ConversationParticipant",
    "WorkspaceFile",
    "WorkspaceLink",
    "MessageAttachment",
    "Delivery",
    "DeliveryFile",
    "DeliveryType",
    "DeliveryStatus",
    "AdminReviewStatus",
    "RevisionRequest",
    "RevisionComment",
    "RevisionStatus",
    "WorkspaceEvent",
    "WorkspaceEventType",
    "Payment",
    "PaymentAttempt",
    "PaymentWebhookEvent",
    "Refund",
    "FreelancerPayoutAccount",
    "Payout",
    "LedgerEntry",
    "Review",
    "ReviewStatus",
    "ReviewResponse",
    "ReviewReport",
    "ReportReason",
    "ReportStatus",
    "FavouriteFreelancer",
    "FavouriteService",
    "TrustBadge",
    "FreelancerBadge",
    "Notification",
    "NotificationType",
    "NotificationPreferences",
    "EmailDelivery",
    "FreelancerVerification",
    "VerificationDocument",
    "DocumentType",
    "DocumentStatus",
    "Dispute",
    "DisputeMessage",
    "DisputeEvidence",
    "DisputeReason",
    "DisputeStatus",
    "DisputePriority",
    "ResolutionType",
    "PlatformSetting",
    "SettingValueType",
    "AdminAuditLog"
]
