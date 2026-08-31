import pytest
from datetime import datetime, timedelta
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.models.service_category import ServiceCategory
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.booking import BookingStatus
from app.core.security import create_token


def create_test_freelancer(db_session, email: str) -> tuple[User, FreelancerProfile]:
    username = email.split("@")[0]
    user = User(
        full_name="Jane Freelancer",
        email=email,
        phone=f"9876543{username}"[:20],
        password_hash="hashedpassword",
        role=UserRole.FREELANCER,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    profile = FreelancerProfile(
        user_id=user.id,
        professional_title="Creative Videographer",
        primary_profession="VIDEOGRAPHER",
        bio="Creative videographer specialized in corporate ads and weddings.",
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        service_radius_km=30,
        willing_to_travel=True,
        profile_completion_percentage=80,
        is_profile_public=True
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return user, profile


def create_test_client(db_session, email: str) -> User:
    username = email.split("@")[0]
    user = User(
        full_name="John Client",
        email=email,
        phone=f"1234567{username}"[:20],
        password_hash="hashedpassword",
        role=UserRole.CLIENT,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def setup_published_service(db_session, freelancer_profile_id: int) -> Service:
    # 1. Ensure categories seeded
    from app.services.service_service import ServiceService
    ServiceService.seed_categories_if_empty(db_session)
    subcat = db_session.query(ServiceCategory).filter(ServiceCategory.parent_id != None).first()

    # 2. Create Service
    service = Service(
        freelancer_profile_id=freelancer_profile_id,
        title="Cinematic Wedding Film Editing",
        slug="cinematic-wedding-film-editing",
        short_description="I edit premium reels and full wedding films.",
        description="Cinematic transitions, color grading, sound design and multi-cam sync.",
        service_type=ServiceType.REMOTE,
        category_id=subcat.parent_id,
        subcategory_id=subcat.id,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        status=ServiceStatus.PUBLISHED,
        is_active=True
    )
    db_session.add(service)
    db_session.commit()
    db_session.refresh(service)

    # 3. Add package
    from app.models.service_package import ServicePackage, PackageType
    package = ServicePackage(
        service_id=service.id,
        package_type=PackageType.BASIC,
        name="Standard Highlights Edit",
        description="2-3 minutes highlight cinematic video editing.",
        price=5000.00,
        delivery_time_days=5,
        revisions=2
    )
    db_session.add(package)

    # 4. Add cover media
    from app.models.service_media import ServiceMedia, MediaType
    media = ServiceMedia(
        service_id=service.id,
        media_type=MediaType.IMAGE,
        media_url="https://example.com/cover.jpg",
        is_cover=True,
        sort_order=1
    )
    db_session.add(media)

    # 5. Add required requirement
    from app.models.service_requirement import ServiceRequirement, RequirementFieldType
    req = ServiceRequirement(
        service_id=service.id,
        question="Link to raw footage files",
        field_type=RequirementFieldType.TEXT,
        is_required=True,
        sort_order=1
    )
    db_session.add(req)

    db_session.commit()
    db_session.refresh(service)
    return service


def test_booking_workflow_and_chat_logs(client, db):
    # 1. Create client & freelancer
    free_user, free_prof = create_test_freelancer(db, "free_b@example.com")
    client_user = create_test_client(db, "client_b@example.com")

    # 2. Create tokens
    free_token = create_token(free_user.id, "access", role="FREELANCER")
    client_token = create_token(client_user.id, "access", role="CLIENT")

    free_headers = {"Authorization": f"Bearer {free_token}"}
    client_headers = {"Authorization": f"Bearer {client_token}"}

    # 3. Setup a published service listing
    service = setup_published_service(db, free_prof.id)
    pkg = service.packages[0]
    req = service.requirements[0]

    booking_date = (datetime.now() + timedelta(days=7)).isoformat()

    # 4. Attempt booking with missing requirements (should fail with 400)
    failed_payload = {
        "service_id": service.id,
        "service_package_id": pkg.id,
        "booking_date": booking_date,
        "notes": "Please deliver quickly.",
        "requirements_answers": {} # Empty answers
    }
    response = client.post("/api/v1/bookings", json=failed_payload, headers=client_headers)
    assert response.status_code == 400
    assert "requirement" in response.json()["detail"].lower()

    # 5. Correct booking payload
    success_payload = {
        "service_id": service.id,
        "service_package_id": pkg.id,
        "booking_date": booking_date,
        "notes": "Here is my raw wedding highlights footage.",
        "requirements_answers": {
            str(req.id): "https://drive.google.com/drive/folders/test"
        }
    }
    response = client.post("/api/v1/bookings", json=success_payload, headers=client_headers)
    assert response.status_code == 201
    booking_data = response.json()
    assert booking_data["status"] == "REQUESTED"
    assert booking_data["price"] == "5000.00"
    booking_id = booking_data["id"]

    # 6. Retrieve booking details (Client side)
    res_detail = client.get(f"/api/v1/bookings/{booking_id}", headers=client_headers)
    assert res_detail.status_code == 200
    assert res_detail.json()["notes"] == "Here is my raw wedding highlights footage."

    # 7. Check if Conversation was created and contains automated message
    convo_res = client.get("/api/v1/messages/conversations", headers=client_headers)
    assert convo_res.status_code == 200
    assert len(convo_res.json()) == 1
    convo_id = convo_res.json()[0]["id"]

    messages_res = client.get(f"/api/v1/messages/conversations/{convo_id}/messages", headers=client_headers)
    assert messages_res.status_code == 200
    assert len(messages_res.json()) >= 1
    # Check that system message contains booking details
    assert "concierge" in messages_res.json()[0]["message_text"].lower() or "system notice" in messages_res.json()[0]["message_text"].lower()

    # 8. Setup Admin user and headers
    admin_user = User(
        full_name="Platform Admin",
        email="admin_test_booking@example.com",
        phone="9999999999",
        password_hash="hashedpassword",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)
    admin_token = create_token(admin_user.id, "access", role="ADMIN")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Admin reviews booking
    review_res = client.post(
        f"/api/v1/admin/bookings/{booking_id}/review",
        json={"admin_notes": "Looks good"},
        headers=admin_headers
    )
    assert review_res.status_code == 200

    # Admin assigns freelancer
    assign_res = client.post(
        f"/api/v1/admin/bookings/{booking_id}/assign",
        json={"freelancer_profile_id": free_prof.id, "offered_payout_amount": 4000.0},
        headers=admin_headers
    )
    assert assign_res.status_code == 200
    assignment_id = assign_res.json()["id"]

    # 9. Send message in thread (Client -> Admin)
    msg_payload = {"message_text": "Hey concierge, let's schedule a call."}
    send_res = client.post(
        f"/api/v1/messages/conversations/{convo_id}",
        json=msg_payload,
        headers=client_headers
    )
    assert send_res.status_code == 201
    assert send_res.json()["message_text"] == "Hey concierge, let's schedule a call."

    # 10. Fetch messages in Freelancer-Admin conversation
    convo_free_res = client.get("/api/v1/freelancer/messages/conversations", headers=free_headers)
    assert convo_free_res.status_code == 200
    assert len(convo_free_res.json()) >= 1
    free_convo_id = convo_free_res.json()[0]["id"]
    
    messages_free = client.get(f"/api/v1/messages/conversations/{free_convo_id}/messages", headers=free_headers)
    assert len(messages_free.json()) >= 1 # contains welcoming message
    
    # Freelancer accepts assignment to finalize booking
    accept_res = client.post(
        f"/api/v1/freelancer/assignments/{assignment_id}/accept",
        headers=free_headers
    )
    assert accept_res.status_code == 200
