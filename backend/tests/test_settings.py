import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.models.payout_account import FreelancerPayoutAccount
from app.core.security import get_password_hash, create_token
from app.api.v1.endpoints.settings import ensure_settings_columns

def create_test_freelancer_helper(db: Session, email: str) -> tuple[User, FreelancerProfile]:
    hashed = get_password_hash("password123")
    user = User(
        full_name="Jane Freelancer",
        email=email,
        phone="9876543210",
        password_hash=hashed,
        role=UserRole.FREELANCER,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    profile = FreelancerProfile(
        user_id=user.id,
        primary_profession=FreelancerProfession.PHOTOGRAPHER,
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        starting_price=Decimal("15000.00"),
        is_profile_public=False
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return user, profile

def create_test_client_helper(db: Session, email: str) -> User:
    hashed = get_password_hash("password123")
    user = User(
        full_name="John Client",
        email=email,
        phone="9876543211",
        password_hash=hashed,
        role=UserRole.CLIENT,
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def test_get_settings_client(client: TestClient, db: Session):
    user = create_test_client_helper(db, "settings_client@example.com")
    token = create_token(user.id, "access", role="CLIENT")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "John Client"
    assert data["email"] == "settings_client@example.com"
    assert data["role"] == "CLIENT"
    assert "is_profile_public" not in data

def test_get_settings_freelancer(client: TestClient, db: Session):
    user, profile = create_test_freelancer_helper(db, "settings_free@example.com")
    token = create_token(user.id, "access", role="FREELANCER")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.get("/api/v1/settings", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Jane Freelancer"
    assert data["email"] == "settings_free@example.com"
    assert data["role"] == "FREELANCER"
    assert data["is_profile_public"] is False
    assert data["payout_status"] == "NOT_CONFIGURED"

def test_update_client_settings(client: TestClient, db: Session):
    user = create_test_client_helper(db, "settings_client_up@example.com")
    token = create_token(user.id, "access", role="CLIENT")
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {"full_name": "John New Name"}
    resp = client.patch("/api/v1/settings", json=update_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "John New Name"

    # Verify db persistence
    db.refresh(user)
    assert user.full_name == "John New Name"

def test_update_freelancer_settings(client: TestClient, db: Session):
    user, profile = create_test_freelancer_helper(db, "settings_free_up@example.com")
    token = create_token(user.id, "access", role="FREELANCER")
    headers = {"Authorization": f"Bearer {token}"}

    update_payload = {
        "full_name": "Jane New Name",
        "preferred_categories": "1,2",
        "preferred_budget_min": 1000.00,
        "preferred_budget_max": 5000.00,
        "preferred_work_mode": "REMOTE",
        "preferred_locations": "Mumbai, Delhi",
        "open_to_remote": True
    }
    resp = client.patch("/api/v1/settings", json=update_payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Jane New Name"
    assert data["preferred_categories"] == "1,2"
    assert float(data["preferred_budget_min"]) == 1000.00
    assert float(data["preferred_budget_max"]) == 5000.00
    assert data["preferred_work_mode"] == "REMOTE"
    assert data["preferred_locations"] == "Mumbai, Delhi"
    assert data["open_to_remote"] is True

    # Check database persistence
    db.refresh(user)
    db.refresh(profile)
    assert user.full_name == "Jane New Name"
    assert profile.preferred_categories == "1,2"
    assert profile.preferred_work_mode == "REMOTE"

def test_change_password_success(client: TestClient, db: Session):
    user = create_test_client_helper(db, "settings_pass@example.com")
    token = create_token(user.id, "access", role="CLIENT")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "current_password": "password123",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123"
      }
    resp = client.post("/api/v1/settings/change-password", json=payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Password changed successfully"

    # Verify logging in with new credentials works
    login_resp = client.post("/api/v1/auth/login", json={
        "identifier": "settings_pass@example.com",
        "password": "newpassword123"
    })
    assert login_resp.status_code == 200

def test_change_password_wrong_current(client: TestClient, db: Session):
    user = create_test_client_helper(db, "settings_pass_wrong@example.com")
    token = create_token(user.id, "access", role="CLIENT")
    headers = {"Authorization": f"Bearer {token}"}

    payload = {
        "current_password": "wrongpassword",
        "new_password": "newpassword123",
        "confirm_password": "newpassword123"
      }
    resp = client.post("/api/v1/settings/change-password", json=payload, headers=headers)
    assert resp.status_code == 400
    assert "incorrect" in resp.json()["detail"].lower()

def test_deactivate_account(client: TestClient, db: Session):
    user = create_test_client_helper(db, "settings_deact@example.com")
    token = create_token(user.id, "access", role="CLIENT")
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post("/api/v1/settings/deactivate", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Account deactivated successfully"

    # Verify db status
    db.refresh(user)
    assert user.is_active is False

def test_settings_role_auth(client: TestClient):
    resp = client.get("/api/v1/settings")
    assert resp.status_code == 401
