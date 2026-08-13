import pytest
from app.models.user import User, UserRole
from app.core.security import create_token, get_password_hash


def test_register_client_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "John Client",
            "email": "client@example.com",
            "phone": "9876543210",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["message"] == "Account created successfully"
    assert data["user"]["full_name"] == "John Client"
    assert data["user"]["email"] == "client@example.com"
    assert data["user"]["phone"] == "9876543210"
    assert data["user"]["role"] == "CLIENT"
    assert data["user"]["is_verified"] is False


def test_register_freelancer_success(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Jane Freelancer",
            "email": "freelancer@example.com",
            "phone": "+919876543211",
            "password": "Password123",
            "role": "FREELANCER",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["role"] == "FREELANCER"


def test_register_admin_rejection(client):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Admin User",
            "email": "admin@example.com",
            "phone": "1234567890",
            "password": "Password123",
            "role": "ADMIN",
        },
    )
    assert response.status_code == 422  # Pydantic validation error


def test_register_duplicate_email(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User One",
            "email": "duplicate@example.com",
            "phone": "9876543201",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    # Register second with same email
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User Two",
            "email": "duplicate@example.com",
            "phone": "9876543202",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    assert response.status_code == 409
    assert "email already exists" in response.json()["detail"]


def test_register_duplicate_phone(client):
    # Register first
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User One",
            "email": "one@example.com",
            "phone": "9876543200",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    # Register second with same phone
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "User Two",
            "email": "two@example.com",
            "phone": "9876543200",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    assert response.status_code == 409
    assert "phone number already exists" in response.json()["detail"]


def test_register_weak_password(client):
    # Short password
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Weak Pass",
            "email": "weak@example.com",
            "phone": "9876543000",
            "password": "short",
            "role": "CLIENT",
        },
    )
    assert response.status_code == 422

    # No uppercase
    response = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Weak Pass",
            "email": "weak@example.com",
            "phone": "9876543000",
            "password": "password123",
            "role": "CLIENT",
        },
    )
    assert response.status_code == 422


def test_login_email_success(client):
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Login User",
            "email": "login@example.com",
            "phone": "9876543111",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    # Login via email
    response = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "login@example.com",
            "password": "Password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "login@example.com"


def test_login_phone_success(client):
    # Register user
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Login User",
            "email": "loginphone@example.com",
            "phone": "9876543222",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    # Login via phone
    response = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "9876543222",
            "password": "Password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["phone"] == "9876543222"


def test_login_wrong_password(client):
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Login User",
            "email": "wrongpass@example.com",
            "phone": "9876543333",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    response = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "wrongpass@example.com",
            "password": "WrongPassword",
        },
    )
    assert response.status_code == 401
    assert "Invalid email/phone or password" in response.json()["detail"]


def test_get_current_user(client):
    # Create a user in DB directly or register
    register_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Current User",
            "email": "current@example.com",
            "phone": "9876543444",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    # Login to get token
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "current@example.com",
            "password": "Password123",
        },
    )
    token = login_res.json()["access_token"]
    
    # Access /me
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    assert response.json()["email"] == "current@example.com"


def test_invalid_token(client):
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalidtokenhere"},
    )
    assert response.status_code == 401


def test_refresh_token(client):
    # Register and login
    client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Refresh User",
            "email": "refresh@example.com",
            "phone": "9876543555",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "refresh@example.com",
            "password": "Password123",
        },
    )
    refresh_token = login_res.json()["refresh_token"]

    # Post to refresh
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_forgot_password(client):
    # Trigger forgot-password
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent@example.com"},
    )
    # Should return success and generic message even if it doesn't exist
    assert response.status_code == 200
    assert "password reset instructions have been sent" in response.json()["message"]


def test_reset_password_flow(client):
    # Register first
    register_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Reset User",
            "email": "reset@example.com",
            "phone": "9876543666",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    user_id = register_res.json()["user"]["id"]
    
    # Generate token manually for testing
    reset_token = create_token(user_id, "password_reset")
    
    # Reset password
    response = client.post(
        "/api/v1/auth/reset-password",
        json={
            "token": reset_token,
            "new_password": "NewPassword123",
        },
    )
    assert response.status_code == 200
    assert "reset successfully" in response.json()["message"]

    # Verify we can login with new password
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "reset@example.com",
            "password": "NewPassword123",
        },
    )
    assert login_res.status_code == 200


def test_verify_email_flow(client):
    # Register first
    register_res = client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Verify User",
            "email": "verify@example.com",
            "phone": "9876543777",
            "password": "Password123",
            "role": "CLIENT",
        },
    )
    user_id = register_res.json()["user"]["id"]
    assert register_res.json()["user"]["is_verified"] is False
    
    # Generate token manually
    verify_token = create_token(user_id, "email_verification")
    
    # Post verify
    response = client.post(
        "/api/v1/auth/verify-email",
        json={"token": verify_token},
    )
    assert response.status_code == 200
    assert "verified successfully" in response.json()["message"]

    # Verify status in database by logging in
    login_res = client.post(
        "/api/v1/auth/login",
        json={
            "identifier": "verify@example.com",
            "password": "Password123",
        },
    )
    assert login_res.json()["user"]["is_verified"] is True
