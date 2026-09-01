import pytest
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.models.service_category import ServiceCategory
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.service_package import PackageType
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
        profile_completion_percentage=80
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


def test_service_categories_seed(client, db):
    # Verify categories were seeded automatically during startup or in tests
    from app.services.service_service import ServiceService
    ServiceService.seed_categories_if_empty(db)

    response = client.get("/api/v1/services/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) > 0
    # Check parent category
    root_names = [cat["name"] for cat in categories]
    assert "Photography" in root_names
    assert "Videography" in root_names
    assert "Editor" in root_names
    assert "3D Animator" in root_names
    assert "Graphics" in root_names


def test_service_creation_and_ownership(client, db):
    free1, prof1 = create_test_freelancer(db, "free1@example.com")
    free2, prof2 = create_test_freelancer(db, "free2@example.com")
    client_user = create_test_client(db, "client@example.com")

    token1 = create_token(free1.id, "access", role="FREELANCER")
    token2 = create_token(free2.id, "access", role="FREELANCER")
    client_token = create_token(client_user.id, "access", role="CLIENT")

    headers1 = {"Authorization": f"Bearer {token1}"}
    headers2 = {"Authorization": f"Bearer {token2}"}
    client_headers = {"Authorization": f"Bearer {client_token}"}

    payload = {
        "title": "Professional Video Editing Draft",
        "short_description": "I will edit high quality YouTube video highlights.",
        "description": "Comprehensive video editing packages including color correction, audio design and transitions.",
        "service_type": "REMOTE"
    }

    # 1. CLIENT cannot create service
    response = client.post("/api/v1/freelancer/services", json=payload, headers=client_headers)
    assert response.status_code == 403

    # 2. Freelancer can create service draft
    response = client.post("/api/v1/freelancer/services", json=payload, headers=headers1)
    assert response.status_code == 201
    service_id = response.json()["id"]
    assert response.json()["title"] == "Professional Video Editing Draft"
    assert response.json()["slug"] == "professional-video-editing-draft"
    assert response.json()["status"] == "DRAFT"

    # 3. Freelancer 2 cannot retrieve/edit Freelancer 1's service
    response = client.get(f"/api/v1/freelancer/services/{service_id}", headers=headers2)
    assert response.status_code == 404

    # 4. Freelancer 1 can retrieve and edit
    response = client.get(f"/api/v1/freelancer/services/{service_id}", headers=headers1)
    assert response.status_code == 200
    assert response.json()["title"] == "Professional Video Editing Draft"

    edit_payload = {"title": "Updated Cinematic Editing Title"}
    response = client.patch(f"/api/v1/freelancer/services/{service_id}", json=edit_payload, headers=headers1)
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Cinematic Editing Title"
    assert response.json()["slug"] == "updated-cinematic-editing-title"


def test_packages_crud_and_pricing(client, db):
    free, prof = create_test_freelancer(db, "free_pkg@example.com")
    token = create_token(free.id, "access", role="FREELANCER")
    headers = {"Authorization": f"Bearer {token}"}

    # Create service
    service_payload = {
        "title": "Wedding Video Editing Reels",
        "short_description": "We edit awesome short wedding videography packages.",
        "description": "Editing full length cinematic and mini reels customized for social media sharing.",
        "service_type": "REMOTE"
    }
    response = client.post("/api/v1/freelancer/services", json=service_payload, headers=headers)
    service_id = response.json()["id"]

    # 1. Add BASIC package
    basic_payload = {
        "package_type": "BASIC",
        "name": "Standard Edit",
        "description": "Includes 2 minutes highlights and transitions",
        "price": 2500.0,
        "delivery_time_days": 3,
        "revisions": 2,
        "deliverables": [
            {"label": "Duration", "value": "2 Mins"},
            {"label": "Color Grading", "value": "Basic"}
        ]
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/packages", json=basic_payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["package_type"] == "BASIC"
    assert response.json()["price"] == "2500.00"
    assert len(response.json()["deliverables"]) == 2

    # Verify starting price is updated to 2500
    s_response = client.get(f"/api/v1/freelancer/services/{service_id}", headers=headers)
    assert s_response.json()["starting_price"] == "2500.00"

    # 2. Add STANDARD package with lower price
    standard_payload = {
        "package_type": "STANDARD",
        "name": "Super Wedding Edit",
        "description": "Includes 5 minutes high-res video sound design",
        "price": 1800.0,  # Lower price for testing starting price recalculation
        "delivery_time_days": 5,
        "revisions": 4,
        "deliverables": []
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/packages", json=standard_payload, headers=headers)
    assert response.status_code == 201

    # Verify starting price is updated to 1800
    s_response = client.get(f"/api/v1/freelancer/services/{service_id}", headers=headers)
    assert s_response.json()["starting_price"] == "1800.00"

    # 3. Block duplicate package type
    response = client.post(f"/api/v1/freelancer/services/{service_id}/packages", json=basic_payload, headers=headers)
    assert response.status_code == 400

    # 4. Limit to max 3 packages
    premium_payload = {
        "package_type": "PREMIUM",
        "name": "Deluxe Cinematic Edit",
        "description": "Full wedding coverage post processing, custom colors, subtitles",
        "price": 10000.0,
        "delivery_time_days": 10,
        "revisions": 10
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/packages", json=premium_payload, headers=headers)
    assert response.status_code == 201

    # Attempting to add 4th package
    extra_payload = {
        "package_type": "PREMIUM",
        "name": "Extra Package",
        "description": "Over limit package description",
        "price": 15000.0,
        "delivery_time_days": 12,
        "revisions": 5
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/packages", json=extra_payload, headers=headers)
    assert response.status_code == 400


def test_media_crud_and_requirements(client, db):
    free, prof = create_test_freelancer(db, "free_med@example.com")
    token = create_token(free.id, "access", role="FREELANCER")
    headers = {"Authorization": f"Bearer {token}"}

    # Create service
    service_payload = {
        "title": "Commercial Photo Session",
        "short_description": "Studio lighting commercial shoot packages.",
        "description": "High resolution product photographs for brand campaigns.",
        "service_type": "ON_SITE"
    }
    response = client.post("/api/v1/freelancer/services", json=service_payload, headers=headers)
    service_id = response.json()["id"]

    # 1. Add cover image media
    media_payload1 = {
        "media_type": "IMAGE",
        "media_url": "/uploads/portfolios/pic1.jpg",
        "is_cover": True
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/media", json=media_payload1, headers=headers)
    assert response.status_code == 201
    media_id1 = response.json()["id"]
    assert response.json()["is_cover"] is True

    # 2. Add second media
    media_payload2 = {
        "media_type": "IMAGE",
        "media_url": "/uploads/portfolios/pic2.jpg",
        "is_cover": False
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/media", json=media_payload2, headers=headers)
    assert response.status_code == 201
    media_id2 = response.json()["id"]

    # 3. Toggle cover image
    response = client.patch(f"/api/v1/freelancer/services/{service_id}/media/{media_id2}/cover", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_cover"] is True

    # Check that previous media1 is no longer cover
    s_response = client.get(f"/api/v1/freelancer/services/{service_id}", headers=headers)
    media_list = s_response.json()["media"]
    for m in media_list:
        if m["id"] == media_id1:
            assert m["is_cover"] is False

    # 4. Add requirement questions
    req_payload = {
        "question": "What is the expected product weight?",
        "field_type": "NUMBER",
        "is_required": True
    }
    response = client.post(f"/api/v1/freelancer/services/{service_id}/requirements", json=req_payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["question"] == "What is the expected product weight?"


def test_service_publication_gates(client, db):
    from app.services.service_service import ServiceService
    ServiceService.seed_categories_if_empty(db)
    
    # Get a seeded subcategory
    subcat = db.query(ServiceCategory).filter(ServiceCategory.parent_id != None).first()
    
    free, prof = create_test_freelancer(db, "free_pub@example.com")
    token = create_token(free.id, "access", role="FREELANCER")
    headers = {"Authorization": f"Bearer {token}"}

    # Create Service draft
    service_payload = {
        "title": "Premium Drone Videography Mumbai",
        "short_description": "We provide beautiful 4k drone footages.",
        "description": "High end drone coverage with licensed operators for events and films.",
        "service_type": "ON_SITE",
        "category_id": subcat.parent_id,
        "subcategory_id": subcat.id
    }
    response = client.post("/api/v1/freelancer/services", json=service_payload, headers=headers)
    service_id = response.json()["id"]

    # Attempt to publish -> fails because no packages
    response = client.post(f"/api/v1/freelancer/services/{service_id}/publish", headers=headers)
    assert response.status_code == 400
    assert "package" in response.json()["detail"].lower()

    # Add package
    pkg_payload = {
        "package_type": "BASIC",
        "name": "Standard Fly",
        "description": "1 hour drone footage",
        "price": 5000.00,
        "delivery_time_days": 2,
        "revisions": 1
    }
    client.post(f"/api/v1/freelancer/services/{service_id}/packages", json=pkg_payload, headers=headers)

    # Attempt to publish -> fails because no media/images
    response = client.post(f"/api/v1/freelancer/services/{service_id}/publish", headers=headers)
    assert response.status_code == 400
    assert "image" in response.json()["detail"].lower()

    # Add media
    media_payload = {
        "media_type": "IMAGE",
        "media_url": "/uploads/portfolios/dron1.jpg",
        "is_cover": True
    }
    client.post(f"/api/v1/freelancer/services/{service_id}/media", json=media_payload, headers=headers)

    # Attempt to publish -> fails because it is ON_SITE and location is not specified
    response = client.post(f"/api/v1/freelancer/services/{service_id}/publish", headers=headers)
    assert response.status_code == 400
    assert "location" in response.json()["detail"].lower() or "city" in response.json()["detail"].lower()

    # Add location details to service
    location_payload = {
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
    }
    client.patch(f"/api/v1/freelancer/services/{service_id}", json=location_payload, headers=headers)

    # Now publication should succeed
    response = client.post(f"/api/v1/freelancer/services/{service_id}/publish", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "PUBLISHED"

    # Verify published service shows up in public listings
    pub_listings = client.get("/api/v1/services")
    assert pub_listings.status_code == 200
    pub_ids = [s["id"] for s in pub_listings.json()]
    assert service_id in pub_ids

    # 5. Pause the service
    response = client.post(f"/api/v1/freelancer/services/{service_id}/pause", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "PAUSED"

    # Verify paused service disappears from public results
    pub_listings = client.get("/api/v1/services")
    pub_ids = [s["id"] for s in pub_listings.json()]
    assert service_id not in pub_ids
