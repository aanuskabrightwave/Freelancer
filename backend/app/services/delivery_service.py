from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from typing import Optional, List, Dict, Any
from datetime import datetime

from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.delivery import Delivery, DeliveryFile, DeliveryType, DeliveryStatus
from app.models.revision import RevisionRequest, RevisionComment, RevisionStatus
from app.models.workspace_file import WorkspaceFile, FileCategory
from app.models.workspace_event import WorkspaceEventType
from app.repositories.booking_repository import BookingRepository
from app.repositories.freelancer_repository import FreelancerRepository
from app.repositories.delivery_repository import DeliveryRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.workspace_service import WorkspaceService


class DeliveryService:
    @staticmethod
    def submit_delivery(
        db: Session,
        user: User,
        booking_id: int,
        title: str,
        message: Optional[str],
        file_ids: List[int],
        delivery_type_str: str
    ) -> Delivery:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        # Freelancer permission check
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if not freelancer_profile or freelancer_profile.user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the assigned freelancer can submit project deliverables."
            )

        # Confirm workspace is active (auto-initialize if needed)
        workspace = WorkspaceRepository.get_by_booking_id(db, booking.id)
        if not workspace:
            workspace = WorkspaceRepository.create(db, booking.id)

        # Require resources
        if not file_ids and not message:
            raise HTTPException(
                status_code=400,
                detail="A delivery submission requires either uploaded files or descriptive message parameters."
            )

        dtype = DeliveryType.PREVIEW
        try:
            dtype = DeliveryType(delivery_type_str.upper())
        except ValueError:
            pass

        # Calculate version
        next_ver = DeliveryRepository.get_latest_delivery_version(db, booking.id)

        # Create delivery
        delivery_data = {
            "booking_id": booking.id,
            "workspace_id": workspace.id,
            "delivery_type": dtype,
            "version": next_ver,
            "title": title,
            "message": message,
            "status": DeliveryStatus.SUBMITTED,
            "submitted_by_user_id": user.id
        }
        delivery = DeliveryRepository.create_delivery(db, delivery_data)

        # Link files
        for sort_idx, fid in enumerate(file_ids):
            file = WorkspaceRepository.get_file_by_id(db, fid)
            if not file or file.workspace_id != workspace.id:
                raise HTTPException(status_code=404, detail=f"File ID {fid} not found in workspace.")

            # Update category
            if dtype == DeliveryType.PREVIEW:
                file.file_category = FileCategory.PREVIEW
            elif dtype == DeliveryType.FINAL:
                file.file_category = FileCategory.FINAL_DELIVERY

            df_data = {
                "delivery_id": delivery.id,
                "workspace_file_id": file.id,
                "sort_order": sort_idx
            }
            DeliveryRepository.create_delivery_file(db, df_data)

        # Log timeline event & transition booking state
        actor_name = user.full_name
        event_code = None
        title_notif = None
        msg_notif = None

        if dtype == DeliveryType.FINAL:
            booking.status = BookingStatus.DELIVERY_PENDING
            db.commit()

            WorkspaceService.log_workspace_event(
                db,
                workspace_id=workspace.id,
                event_type=WorkspaceEventType.FINAL_DELIVERY,
                actor_user_id=user.id,
                title=f"Final Delivery Version {next_ver} Submitted",
                description=f"{actor_name} submitted final delivery: {title}. Booking status changed to DELIVERY_PENDING."
            )
            event_code = "FINAL_DELIVERY_SUBMITTED"
            title_notif = "Final Delivery Ready"
            msg_notif = f"Your final Wedding Photography delivery is ready for review."
        else:
            event_t = WorkspaceEventType.PREVIEW_SUBMITTED
            WorkspaceService.log_workspace_event(
                db,
                workspace_id=workspace.id,
                event_type=event_t,
                actor_user_id=user.id,
                title=f"Preview Version {next_ver} Uploaded",
                description=f"{actor_name} shared preview copy: {title}"
            )
            # Check if this is a revision submission
            from app.models.revision import RevisionRequest, RevisionStatus
            has_revision = db.query(RevisionRequest).filter(
                RevisionRequest.booking_id == booking.id,
                RevisionRequest.status == RevisionStatus.OPEN
            ).first()
            if has_revision or next_ver > 1:
                event_code = "REVISION_SUBMITTED"
                title_notif = "Revision Submitted"
                msg_notif = f"A revised preview version {next_ver} was submitted for booking '{booking.booking_number}'."
            else:
                event_code = "DELIVERY_PREVIEW_SUBMITTED"
                title_notif = "Delivery Preview Ready"
                msg_notif = f"A preview delivery draft version {next_ver} was uploaded for booking '{booking.booking_number}'."

        db.commit()

        # Trigger notification
        try:
            from app.services.notification_service import NotificationService
            NotificationService.dispatch(
                db=db,
                recipient_id=booking.client_id,
                event_code=event_code,
                title=title_notif,
                message=msg_notif,
                action_url=f"/client/bookings/{booking.id}/workspace",
                entity_type="delivery",
                entity_id=delivery.id,
                payload_meta={
                    "booking_id": booking.id,
                    "booking_number": booking.booking_number
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("delivery_service").exception("Delivery notification failed")

        return delivery

    @staticmethod
    def get_deliveries(db: Session, user: User, booking_id: int) -> List[Delivery]:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        WorkspaceService.validate_membership(db, user, booking)
        workspace = WorkspaceRepository.get_by_booking_id(db, booking.id)
        if not workspace:
            return []
        return DeliveryRepository.get_deliveries(db, workspace.id)

    @staticmethod
    def request_revision(
        db: Session,
        user: User,
        delivery_id: int,
        title: str,
        description: str
    ) -> RevisionRequest:
        delivery = DeliveryRepository.get_delivery_by_id(db, delivery_id)
        if not delivery:
            raise HTTPException(status_code=404, detail="Delivery not found")

        booking = BookingRepository.get_by_id(db, delivery.booking_id)
        if booking.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the client owner can request revisions."
            )

        # Validate revision counter limit (for service package based bookings)
        if booking.service_package_id:
            package = booking.package
            if package and package.revisions is not None:
                # Count current non-cancelled revisions
                current_revisions_count = db.query(func.count(RevisionRequest.id)).filter(
                    RevisionRequest.booking_id == booking.id,
                    RevisionRequest.status != RevisionStatus.CANCELLED
                ).scalar() or 0

                if current_revisions_count >= package.revisions:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Included revision limit reached: {package.revisions} allowed."
                    )

        # Update delivery status
        delivery.status = DeliveryStatus.REVISION_REQUESTED

        # Create revision request
        rev_data = {
            "booking_id": booking.id,
            "delivery_id": delivery.id,
            "requested_by_user_id": user.id,
            "title": title,
            "description": description,
            "status": RevisionStatus.OPEN
        }
        rev_req = DeliveryRepository.create_revision_request(db, rev_data)

        # Restore booking status to IN_PROGRESS so freelancer can rework
        if booking.status == BookingStatus.DELIVERY_PENDING:
            booking.status = BookingStatus.IN_PROGRESS
            db.commit()

        # Log event
        WorkspaceService.log_workspace_event(
            db,
            workspace_id=delivery.workspace_id,
            event_type=WorkspaceEventType.REVISION_REQUESTED,
            actor_user_id=user.id,
            title="Revision Requested",
            description=f"Client requested revision on Version {delivery.version}: {title}"
        )

        db.commit()

        # Trigger notification
        try:
            from app.services.notification_service import NotificationService
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="REVISION_REQUESTED",
                title="Revision Requested",
                message=f"The client requested changes on your preview submission for '{booking.booking_number}'.",
                action_url=f"/freelancer/bookings/{booking.id}/workspace",
                entity_type="revision_request",
                entity_id=rev_req.id,
                payload_meta={
                    "booking_id": booking.id,
                    "booking_number": booking.booking_number
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("delivery_service").exception("Revision request notification failed")

        return rev_req

    @staticmethod
    def get_revisions(db: Session, user: User, booking_id: int) -> List[RevisionRequest]:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        WorkspaceService.validate_membership(db, user, booking)
        return DeliveryRepository.get_revision_requests(db, booking_id)

    @staticmethod
    def start_revision(db: Session, user: User, revision_id: int) -> RevisionRequest:
        rev_req = DeliveryRepository.get_revision_request_by_id(db, revision_id)
        if not rev_req:
            raise HTTPException(status_code=404, detail="Revision request not found")

        booking = BookingRepository.get_by_id(db, rev_req.booking_id)
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if freelancer_profile.user_id != user.id:
            raise HTTPException(status_code=403, detail="Only assigned freelancer can execute revisions.")

        rev_req.status = RevisionStatus.IN_PROGRESS
        db.commit()
        return rev_req

    @staticmethod
    def add_comment(db: Session, user: User, revision_id: int, timestamp_seconds: Optional[int], comment_text: str) -> RevisionComment:
        rev_req = DeliveryRepository.get_revision_request_by_id(db, revision_id)
        if not rev_req:
            raise HTTPException(status_code=404, detail="Revision request not found")

        booking = BookingRepository.get_by_id(db, rev_req.booking_id)
        WorkspaceService.validate_membership(db, user, booking)

        comment_data = {
            "revision_request_id": revision_id,
            "timestamp_seconds": timestamp_seconds,
            "comment": comment_text
        }
        return DeliveryRepository.create_revision_comment(db, comment_data)

    @staticmethod
    def get_comments(db: Session, user: User, revision_id: int) -> List[RevisionComment]:
        rev_req = DeliveryRepository.get_revision_request_by_id(db, revision_id)
        if not rev_req:
            raise HTTPException(status_code=404, detail="Revision request not found")

        booking = BookingRepository.get_by_id(db, rev_req.booking_id)
        WorkspaceService.validate_membership(db, user, booking)
        return DeliveryRepository.get_revision_comments(db, revision_id)
