import pytest
from datetime import date, time
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.models.project import Project, Proposal
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.core.security import create_token
from app.models.booking_assignment import BookingAssignment
from tests.test_bookings import create_test_freelancer, create_test_client


def test_proposal_award_and_booking_lifecycle(client, db):
    # 1. Create client & freelancer
    free_user, free_prof = create_test_freelancer(db, "free_order@example.com")
    client_user = create_test_client(db, "client_order@example.com")

    free_token = create_token(free_user.id, "access", role="FREELANCER")
    client_token = create_token(client_user.id, "access", role="CLIENT")

    free_headers = {"Authorization": f"Bearer {free_token}"}
    client_headers = {"Authorization": f"Bearer {client_token}"}

    # 2. Add weekly schedule for Freelancer so they are available on Fridays (2026-12-18 is Friday)
    from app.services.availability_service import AvailabilityService
    AvailabilityService.update_weekly_schedule(db, free_prof.id, [
        {
            "day_of_week": "FRIDAY",
            "is_available": True,
            "start_time": "08:00",
            "end_time": "19:00"
        },
        {
            "day_of_week": "SATURDAY",
            "is_available": True,
            "start_time": "08:00",
            "end_time": "19:00"
        }
    ])

    # 3. Create Project
    project = Project(
        client_id=client_user.id,
        title="Wedding Highlights Photography shoot",
        description="Need a video shoot on location.",
        project_type="ON_SITE",
        budget=5000.0,
        city="Mumbai",
        state="Maharashtra",
        status="OPEN"
    )
    db.add(project)
    db.commit()
    db.refresh(project)

    # 4. Create Proposal
    proposal = Proposal(
        project_id=project.id,
        freelancer_profile_id=free_prof.id,
        proposed_amount=4500.0,
        cover_letter="I am videography expert and available.",
        status="PENDING"
    )
    db.add(proposal)
    db.commit()
    db.refresh(proposal)

    # 5. Client accepts proposal -> creates Booking
    accept_payload = {
        "scheduled_date": "2026-12-18",
        "start_time": "10:00",
        "end_time": "17:00",
        "venue_name": "Main Hall Room",
        "venue_address": "Street 10, Bandra East",
        "city": "Mumbai",
        "state": "Maharashtra"
    }
    accept_res = client.post(
        f"/api/v1/client/proposals/{proposal.id}/accept",
        json=accept_payload,
        headers=client_headers
    )
    assert accept_res.status_code == 201
    booking_data = accept_res.json()
    assert booking_data["source_type"] == "PROJECT"
    assert booking_data["status"] == "PENDING_CONFIRMATION"
    assert booking_data["agreed_amount"] == "4500.00"
    assert booking_data["booking_number"].startswith("CM-")
    booking_id = booking_data["id"]

    # Freelancer accepts assignment to transition status to CONFIRMED
    assignment = db.query(BookingAssignment).filter(BookingAssignment.booking_id == booking_id).first()
    assert assignment is not None
    accept_assign_res = client.post(
        f"/api/v1/freelancer/assignments/{assignment.id}/accept",
        headers=free_headers
    )
    assert accept_assign_res.status_code == 200

    # Re-verify Project & Proposal status
    db.refresh(project)
    db.refresh(proposal)
    assert project.status == "AWARDED"
    assert proposal.status == "ACCEPTED"

    # 6. Prevent duplicate proposal accept check
    duplicate_res = client.post(
        f"/api/v1/client/proposals/{proposal.id}/accept",
        json=accept_payload,
        headers=client_headers
    )
    assert duplicate_res.status_code == 400

    # 6.5 client completes payment order and verify
    pay_order = client.post(
        f"/api/v1/client/bookings/{booking_id}/payment/order",
        headers=client_headers
    )
    assert pay_order.status_code == 201
    provider_order_id = pay_order.json()["provider_order_id"]
    verify_payload = {
        "razorpay_order_id": provider_order_id,
        "razorpay_payment_id": "pay_captured_order_test",
        "razorpay_signature": "mock_signature_bypass_for_pytest"
    }
    verify_res = client.post(
        f"/api/v1/client/bookings/{booking_id}/payment/verify",
        json=verify_payload,
        headers=client_headers
    )
    assert verify_res.status_code == 200

    # 7. Freelancer starts booking
    start_res = client.post(f"/api/v1/freelancer/bookings/{booking_id}/start", headers=free_headers)
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "IN_PROGRESS"

    # 8. Freelancer marks delivery pending
    deliver_res = client.post(f"/api/v1/freelancer/bookings/{booking_id}/mark-delivery-pending", headers=free_headers)
    assert deliver_res.status_code == 200
    assert deliver_res.json()["status"] == "DELIVERY_PENDING"

    # 9. Client completes booking
    complete_res = client.post(f"/api/v1/client/bookings/{booking_id}/complete", headers=client_headers)
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"
