import pytest
import io
from datetime import datetime, timedelta
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.models.service import Service, ServiceType, ServiceStatus
from app.models.service_package import ServicePackage, PackageType
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.core.security import create_token
from tests.test_bookings import create_test_freelancer, create_test_client


def test_project_workspace_collaboration_pipeline(client, db):
    # 1. Create users
    free_user, free_prof = create_test_freelancer(db, "free_ws@example.com")
    client_user = create_test_client(db, "client_ws@example.com")
    intruder_user = create_test_client(db, "intruder_ws@example.com")

    free_token = create_token(free_user.id, "access", role="FREELANCER")
    client_token = create_token(client_user.id, "access", role="CLIENT")
    intruder_token = create_token(intruder_user.id, "access", role="CLIENT")

    free_headers = {"Authorization": f"Bearer {free_token}"}
    client_headers = {"Authorization": f"Bearer {client_token}"}
    intruder_headers = {"Authorization": f"Bearer {intruder_token}"}

    # 2. Setup Service listing with package revisions limit=2
    service = Service(
        freelancer_profile_id=free_prof.id,
        title="Wedding Video Montage Production",
        slug="wedding-video-montage",
        short_description="Full highlight film production",
        description="Premium editing services with timeline delivery",
        service_type=ServiceType.REMOTE,
        status=ServiceStatus.PUBLISHED,
        category_id=1
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    package = ServicePackage(
        service_id=service.id,
        package_type=PackageType.BASIC,
        name="Basic Highlights Film",
        description="Standard basic edits",
        price=7500.0,
        revisions=2,  # Set revisions limit to 2
        delivery_time_days=7
    )
    db.add(package)
    db.commit()
    db.refresh(package)

    # 3. Create Booking: directly CONFIRMED (simulating accepted project agreement)
    booking = Booking(
        booking_number="CM-2026-000099",
        client_id=client_user.id,
        freelancer_profile_id=free_prof.id,
        source_type=BookingSourceType.SERVICE,
        service_id=service.id,
        service_package_id=package.id,
        title=service.title,
        description=service.short_description,
        booking_type="REMOTE",
        status=BookingStatus.CONFIRMED,
        scheduled_date=datetime.now().date(),
        booking_date=datetime.now(),
        timezone="Asia/Kolkata",
        agreed_amount=package.price,
        price=package.price
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # 4. Trigger get/create Workspace endpoint
    workspace_res = client.get(f"/api/v1/bookings/{booking.id}/workspace", headers=client_headers)
    assert workspace_res.status_code == 200
    workspace_data = workspace_res.json()
    workspace_id = workspace_data["id"]
    assert workspace_data["booking_id"] == booking.id

    # 5. Access Security Check: intruder gets 403 Forbidden
    intruder_res = client.get(f"/api/v1/bookings/{booking.id}/workspace", headers=intruder_headers)
    assert intruder_res.status_code == 403

    # 6. Upload file to Workspace
    file_payload = {"category": "REFERENCE", "description": "Wedding style mockup PDF"}
    file_bytes = io.BytesIO(b"style guide layout data pdf")
    upload_res = client.post(
        f"/api/v1/bookings/{booking.id}/files",
        data=file_payload,
        files={"file": ("style_guide.pdf", file_bytes, "application/pdf")},
        headers=client_headers
    )
    assert upload_res.status_code == 201
    file_data = upload_res.json()
    assert file_data["original_name"] == "style_guide.pdf"
    assert file_data["file_category"] == "REFERENCE"
    file_id = file_data["id"]

    # 7. Add External URL Link
    link_payload = {"label": "Google Drive Folder Reference", "url": "https://drive.google.com/drive/workspace"}
    link_res = client.post(
        f"/api/v1/bookings/{booking.id}/links",
        json=link_payload,
        headers=client_headers
    )
    assert link_res.status_code == 201
    assert link_res.json()["label"] == "Google Drive Folder Reference"

    # 8. Send Workspace Messages
    msg_payload = {"content": "Hi freelancer, here is the reference style guide."}
    msg_res = client.post(
        f"/api/v1/bookings/{booking.id}/messages",
        json=msg_payload,
        headers=client_headers
    )
    assert msg_res.status_code == 201
    msg_data = msg_res.json()
    assert msg_data["content"] == "Hi freelancer, here is the reference style guide."
    message_id = msg_data["id"]

    # Edit Message (Patch)
    edit_payload = {"content": "Hello freelancer, please check the updated style guide."}
    edit_res = client.patch(
        f"/api/v1/messages/{message_id}",
        json=edit_payload,
        headers=client_headers
    )
    assert edit_res.status_code == 200
    assert edit_res.json()["is_edited"] is True
    assert edit_res.json()["content"] == "Hello freelancer, please check the updated style guide."

    # Soft Delete message
    delete_res = client.delete(f"/api/v1/messages/{message_id}", headers=client_headers)
    assert delete_res.status_code == 200
    assert delete_res.json()["is_deleted"] is True

    # Reply Message
    reply_payload = {
        "content": "Got it! Starting work now.",
        "reply_to_message_id": message_id
    }
    reply_res = client.post(
        f"/api/v1/bookings/{booking.id}/messages",
        json=reply_payload,
        headers=free_headers
    )
    assert reply_res.status_code == 201
    assert reply_res.json()["reply_to_message_id"] == message_id

    # 9. Freelancer submits Preview Delivery V1
    delivery_payload = {
        "delivery_type": "PREVIEW",
        "title": "First Highlights Cut Draft V1",
        "message": "Let me know your thoughts on color grading.",
        "file_ids": [file_id]
    }
    delivery_res = client.post(
        f"/api/v1/freelancer/bookings/{booking.id}/deliveries",
        json=delivery_payload,
        headers=free_headers
    )
    assert delivery_res.status_code == 201
    del_data = delivery_res.json()
    assert del_data["delivery_type"] == "PREVIEW"
    assert del_data["version"] == 1
    assert del_data["status"] == "SUBMITTED"
    delivery_id = del_data["id"]

    # 10. Client Requests Revision
    revision_payload = {
        "title": "Color grade revisions",
        "description": "Please increase contrast and boost warm tones."
    }
    rev_res = client.post(
        f"/api/v1/client/deliveries/{delivery_id}/revision",
        json=revision_payload,
        headers=client_headers
    )
    assert rev_res.status_code == 201
    rev_data = rev_res.json()
    assert rev_data["status"] == "OPEN"
    revision_id = rev_data["id"]

    # Client adds timestamped comment
    comment_payload = {
        "timestamp_seconds": 45,
        "comment": "Color transition at this timestamp is too saturated."
    }
    comment_res = client.post(
        f"/api/v1/revisions/{revision_id}/comments",
        json=comment_payload,
        headers=client_headers
    )
    assert comment_res.status_code == 201
    assert comment_res.json()["timestamp_seconds"] == 45

    # 11. Freelancer accepts revision request (starts work)
    start_rev_res = client.post(
        f"/api/v1/freelancer/revisions/{revision_id}/start",
        headers=free_headers
    )
    assert start_rev_res.status_code == 200
    assert start_rev_res.json()["status"] == "IN_PROGRESS"

    # 12. Freelancer submits Final Delivery V2 -> booking status transitions to DELIVERY_PENDING
    final_payload = {
        "delivery_type": "FINAL",
        "title": "Completed Final film deliverables",
        "message": "Enclosed final files.",
        "file_ids": [file_id]
    }
    final_res = client.post(
        f"/api/v1/freelancer/bookings/{booking.id}/deliveries",
        json=final_payload,
        headers=free_headers
    )
    assert final_res.status_code == 201
    assert final_res.json()["delivery_type"] == "FINAL"
    assert final_res.json()["version"] == 2

    # Check booking status is now DELIVERY_PENDING
    db.refresh(booking)
    assert booking.status == BookingStatus.DELIVERY_PENDING

    # 13. Client accepts work -> booking status COMPLETED
    complete_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/complete",
        headers=client_headers
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    # 14. Verify timeline events log
    timeline_res = client.get(f"/api/v1/bookings/{booking.id}/timeline", headers=client_headers)
    assert timeline_res.status_code == 200
    events = timeline_res.json()
    assert len(events) >= 4
    event_types = [e["event_type"] for e in events]
    assert "BOOKING_CONFIRMED" in event_types
    assert "FILE_UPLOADED" in event_types
    assert "PREVIEW_SUBMITTED" in event_types
    assert "FINAL_DELIVERY" in event_types
