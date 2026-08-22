import pytest
from decimal import Decimal
from app.models.user import User, UserRole
from app.models.project import Project
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


def test_create_project_success(client, db):
    # Setup client user
    client_user = create_test_user(db, "client@example.com", UserRole.CLIENT)
    client_token = create_token(client_user.id, "access", role="CLIENT")

    payload = {
        "title": "Wedding Cinematic Video Edit",
        "description": "Please edit a 5-minute cinematic video from raw footages.",
        "project_type": "REMOTE",
        "budget_min": 15000.0,
        "budget_max": 25000.0,
        "category_id": 3,
        "deadline": "2026-09-30"
    }

    res = client.post(
        "/api/v1/projects",
        json=payload,
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["title"] == "Wedding Cinematic Video Edit"
    assert Decimal(str(data["budget_min"])) == Decimal("15000.0")
    assert Decimal(str(data["budget_max"])) == Decimal("25000.0")
    assert data["client_id"] == client_user.id
    assert data["status"] == "OPEN"

    # Query MySQL database persistence
    db_project = db.query(Project).filter(Project.id == data["id"]).first()
    assert db_project is not None
    assert db_project.title == "Wedding Cinematic Video Edit"
    assert db_project.budget == Decimal("25000.0")


def test_create_project_invalid_budget(client, db):
    client_user = create_test_user(db, "client@example.com", UserRole.CLIENT)
    client_token = create_token(client_user.id, "access", role="CLIENT")

    # min_budget > max_budget
    payload = {
        "title": "Wedding Cinematic Video Edit",
        "description": "Please edit a 5-minute cinematic video from raw footages.",
        "project_type": "REMOTE",
        "budget_min": 30000.0,
        "budget_max": 20000.0,
        "category_id": 3
    }

    res = client.post(
        "/api/v1/projects",
        json=payload,
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert res.status_code == 400
    assert "budget" in res.json()["detail"].lower()


def test_create_project_unauthorized_role(client, db):
    # Authenticate as freelancer
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    payload = {
        "title": "Wedding Cinematic Video Edit",
        "description": "Please edit a 5-minute cinematic video.",
        "project_type": "REMOTE",
        "budget_min": 10000.0,
        "budget_max": 20000.0,
        "category_id": 3
    }

    # Freelancers cannot post jobs (403 Forbidden)
    res = client.post(
        "/api/v1/projects",
        json=payload,
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res.status_code == 403


def test_freelancer_browse_jobs_visibility(client, db):
    client_user = create_test_user(db, "client@example.com", UserRole.CLIENT)
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    
    client_token = create_token(client_user.id, "access", role="CLIENT")
    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    # 1. Create open project
    payload_open = {
        "title": "Open Project",
        "description": "Description of open project",
        "budget_min": 1000.0,
        "budget_max": 2000.0,
        "category_id": 1
    }
    res_open = client.post(
        "/api/v1/projects",
        json=payload_open,
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert res_open.status_code == 201
    open_id = res_open.json()["id"]

    # 2. Create another project and close it
    payload_closed = {
        "title": "Closed Project",
        "description": "Description of closed project",
        "budget_min": 1000.0,
        "budget_max": 2000.0,
        "category_id": 1
    }
    res_closed = client.post(
        "/api/v1/projects",
        json=payload_closed,
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert res_closed.status_code == 201
    closed_id = res_closed.json()["id"]

    # Close project in DB
    client.post(
        f"/api/v1/client/projects/{closed_id}/close",
        headers={"Authorization": f"Bearer {client_token}"}
    )

    # 3. Freelancer browses available jobs
    res = client.get(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res.status_code == 200
    jobs = res.json()
    
    # Open project must be visible, closed must not
    job_ids = [j["id"] for j in jobs]
    assert open_id in job_ids
    assert closed_id not in job_ids


def test_project_ownership_idor_checks(client, db):
    client_a = create_test_user(db, "client_a@example.com", UserRole.CLIENT)
    client_b = create_test_user(db, "client_b@example.com", UserRole.CLIENT)

    token_a = create_token(client_a.id, "access", role="CLIENT")
    token_b = create_token(client_b.id, "access", role="CLIENT")

    # Client A creates project
    payload = {
        "title": "Client A Project",
        "description": "Client A Description Details",
        "budget_min": 5000.0,
        "budget_max": 10000.0,
        "category_id": 2
    }
    res = client.post(
        "/api/v1/projects",
        json=payload,
        headers={"Authorization": f"Bearer {token_a}"}
    )
    project_id = res.json()["id"]

    # Client B tries to view details of Client A's project (403 Forbidden)
    res_idor_get = client.get(
        f"/api/v1/client/projects/{project_id}",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_idor_get.status_code == 403

    # Client B tries to close Client A's project (403 Forbidden)
    res_idor_close = client.post(
        f"/api/v1/client/projects/{project_id}/close",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_idor_close.status_code == 403
