import pytest
from app.models.user import User, UserRole
from app.core.security import create_token


def create_test_user(db_session, email: str, role: UserRole) -> User:
    username = email.split("@")[0]
    user = User(
        full_name="Test User",
        email=email,
        phone=f"9876543{username}"[:20],
        password_hash="hashedpassword",
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_create_profile_role_restrictions(client, db):
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    client_user = create_test_user(db, "client@example.com", UserRole.CLIENT)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")
    client_token = create_token(client_user.id, "access", role="CLIENT")

    profile_payload = {
        "professional_title": "Senior Portrait Photographer",
        "primary_profession": "PHOTOGRAPHER",
        "bio": "I am a wedding photographer based in Mumbai with 10 years of experience.",
        "experience_years": 8,
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "service_radius_km": 50,
        "willing_to_travel": True,
        "starting_price": 5000.0,
    }

    # CLIENT role should be rejected with 403
    res = client.post(
        "/api/v1/freelancer/profile",
        json=profile_payload,
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res.status_code == 403

    # FREELANCER role should succeed
    res = client.post(
        "/api/v1/freelancer/profile",
        json=profile_payload,
        headers={"Authorization": f"Bearer {free_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["professional_title"] == "Senior Portrait Photographer"
    assert data["user_id"] == freelancer.id
    assert data["profile_completion_percentage"] > 0

    # Duplicate profile should be rejected with 409
    res = client.post(
        "/api/v1/freelancer/profile",
        json=profile_payload,
        headers={"Authorization": f"Bearer {free_token}"},
    )
    assert res.status_code == 409


def test_profile_bio_validation(client, db):
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    # Short Bio (less than 30 chars)
    payload = {
        "professional_title": "Photographer",
        "primary_profession": "PHOTOGRAPHER",
        "bio": "Too short bio.",
        "experience_years": 5,
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
    }
    res = client.post(
        "/api/v1/freelancer/profile",
        json=payload,
        headers={"Authorization": f"Bearer {free_token}"},
    )
    assert res.status_code == 422


def test_equipment_crud(client, db):
    f1 = create_test_user(db, "f1@example.com", UserRole.FREELANCER)
    f2 = create_test_user(db, "f2@example.com", UserRole.FREELANCER)

    t1 = create_token(f1.id, "access", role="FREELANCER")
    t2 = create_token(f2.id, "access", role="FREELANCER")

    # Create profiles
    profile_payload = {
        "professional_title": "Wedding Videographer",
        "primary_profession": "VIDEOGRAPHER",
        "bio": "I am a videographer based in Mumbai with 10 years of experience.",
        "experience_years": 5,
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
    }
    client.post(
        "/api/v1/freelancer/profile",
        json=profile_payload,
        headers={"Authorization": f"Bearer {t1}"},
    )
    client.post(
        "/api/v1/freelancer/profile",
        json=profile_payload,
        headers={"Authorization": f"Bearer {t2}"},
    )

    # 1. Add equipment for f1
    eq_payload = {
        "equipment_type": "CAMERA",
        "brand": "Sony",
        "model": "FX3",
        "description": "Cinema Line camera",
    }
    res = client.post(
        "/api/v1/freelancer/profile/equipment",
        json=eq_payload,
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 201
    eq_id = res.json()["id"]

    # 2. Update equipment for f1
    update_payload = {
        "equipment_type": "CAMERA",
        "brand": "Sony",
        "model": "FX3 - Updated",
        "description": "Primary body",
    }
    res = client.put(
        "/api/v1/freelancer/profile/equipment/{}".format(eq_id),
        json=update_payload,
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 200
    assert res.json()["model"] == "FX3 - Updated"

    # 3. Prevent modification of f1's equipment by f2 (returns 403)
    res = client.put(
        "/api/v1/freelancer/profile/equipment/{}".format(eq_id),
        json=update_payload,
        headers={"Authorization": f"Bearer {t2}"},
    )
    assert res.status_code == 403

    # 4. List equipment
    res = client.get(
        "/api/v1/freelancer/profile/equipment",
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 5. Delete equipment
    res = client.delete(
        "/api/v1/freelancer/profile/equipment/{}".format(eq_id),
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 204

    # Verify deleted
    res = client.get(
        "/api/v1/freelancer/profile/equipment",
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert len(res.json()) == 0


def test_portfolio_crud_and_featured_limit(client, db):
    f1 = create_test_user(db, "f1@example.com", UserRole.FREELANCER)
    t1 = create_token(f1.id, "access", role="FREELANCER")

    # Create profile
    client.post(
        "/api/v1/freelancer/profile",
        json={
            "professional_title": "Drone Operator",
            "primary_profession": "DRONE_OPERATOR",
            "bio": "I am a drone operator based in Mumbai with 10 years of experience.",
            "experience_years": 4,
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
        },
        headers={"Authorization": f"Bearer {t1}"},
    )

    # Add 6 featured items
    for i in range(6):
        res = client.post(
            "/api/v1/freelancer/profile/portfolio",
            json={
                "title": f"Drone Project {i}",
                "media_type": "IMAGE",
                "media_url": "https://example.com/drone{}.jpg".format(i),
                "category": "Travel",
                "is_featured": True,
            },
            headers={"Authorization": f"Bearer {t1}"},
        )
        assert res.status_code == 201

    # Adding a 7th featured item should be rejected (400)
    res = client.post(
        "/api/v1/freelancer/profile/portfolio",
        json={
            "title": "Drone Project 7",
            "media_type": "IMAGE",
            "media_url": "https://example.com/drone7.jpg",
            "category": "Travel",
            "is_featured": True,
        },
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 400


def test_publication_gate(client, db):
    f1 = create_test_user(db, "f1@example.com", UserRole.FREELANCER)
    t1 = create_token(f1.id, "access", role="FREELANCER")

    # Create profile (completion ~ 45% because skills, equipment, pricing, photos are missing)
    client.post(
        "/api/v1/freelancer/profile",
        json={
            "professional_title": "Video Editor",
            "primary_profession": "VIDEO_EDITOR",
            "bio": "I am a video editor based in Mumbai with 10 years of experience.",
            "experience_years": 5,
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
        },
        headers={"Authorization": f"Bearer {t1}"},
    )

    # Attempt to publish (sends is_profile_public: true) - should fail with 400 because completion < 60%
    res = client.patch(
        "/api/v1/freelancer/profile",
        json={"is_profile_public": True},
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert res.status_code == 400
    assert "at least 60% complete" in res.json()["detail"]


def test_public_directory_and_detail_security(client, db):
    f1 = create_test_user(db, "f1@example.com", UserRole.FREELANCER)
    t1 = create_token(f1.id, "access", role="FREELANCER")

    # Create profile
    client.post(
        "/api/v1/freelancer/profile",
        json={
            "professional_title": "Photo Retoucher",
            "primary_profession": "PHOTO_EDITOR",
            "bio": "I am a photo editor based in Mumbai with 10 years of experience.",
            "experience_years": 5,
            "city": "Mumbai",
            "state": "Maharashtra",
            "country": "India",
            "starting_price": 2000.0,
            "profile_photo_url": "https://example.com/photo.jpg",
        },
        headers={"Authorization": f"Bearer {t1}"},
    )

    # Add 3 portfolio items (to help reach 60%+ completion & satisfy portfolio requirement)
    for i in range(3):
        client.post(
            "/api/v1/freelancer/profile/portfolio",
            json={
                "title": f"Retouch Work {i}",
                "media_type": "IMAGE",
                "media_url": f"https://example.com/work{i}.jpg",
                "category": "Commercial",
            },
            headers={"Authorization": f"Bearer {t1}"},
        )

    # Add 3 skills (Basic Info: 20, Details: 15, Location: 10, Portfolio: 20, Pricing: 10, Photo: 5, Skills: 10 = 90% completion)
    # Fetch skill IDs first
    skills_res = client.get("/api/v1/skills")
    skill_ids = [s["id"] for s in skills_res.json()[:3]]
    client.post(
        "/api/v1/freelancer/profile/skills",
        json={"skill_ids": skill_ids},
        headers={"Authorization": f"Bearer {t1}"},
    )

    # Retrieve profile to check it's > 60%
    prof_res = client.get(
        "/api/v1/freelancer/profile",
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert prof_res.json()["profile_completion_percentage"] >= 60

    # Publish profile now
    pub_res = client.patch(
        "/api/v1/freelancer/profile",
        json={"is_profile_public": True},
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert pub_res.status_code == 200
    profile_id = pub_res.json()["id"]

    # Verify showing up in public directory
    dir_res = client.get("/api/v1/freelancers")
    assert dir_res.status_code == 200
    assert len(dir_res.json()) == 1
    assert dir_res.json()[0]["id"] == profile_id
    
    # Confirm sensitive data (email, phone, is_profile_public status) is hidden in public model
    assert "email" not in dir_res.json()[0]
    assert "phone" not in dir_res.json()[0]

    # Verify public details fetch
    detail_res = client.get("/api/v1/freelancers/{}".format(profile_id))
    assert detail_res.status_code == 200
    assert detail_res.json()["full_name"] == "Test User"
    assert "email" not in detail_res.json()
