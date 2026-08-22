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


def test_freelancer_bookings_list_success(client, db):
    # Setup freelancer user
    freelancer = create_test_user(db, "free_bookings@example.com", UserRole.FREELANCER)
    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    res = client.get(
        "/api/v1/freelancer/bookings",
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_freelancer_bookings_client_forbidden(client, db):
    # Setup client user
    client_user = create_test_user(db, "client_bookings@example.com", UserRole.CLIENT)
    client_token = create_token(client_user.id, "access", role="CLIENT")

    # Clients should be rejected with 403 Forbidden
    res = client.get(
        "/api/v1/freelancer/bookings",
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert res.status_code == 403


def test_freelancer_bookings_unauthenticated(client, db):
    # Unauthenticated requests should be rejected with 401 Unauthorized
    res = client.get("/api/v1/freelancer/bookings")
    assert res.status_code == 401
