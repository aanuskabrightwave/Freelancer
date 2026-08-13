import pytest
from datetime import date, time
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.models.availability import FreelancerWeeklySchedule, FreelancerAvailability
from app.core.security import create_token
from app.services.availability_service import AvailabilityService
from tests.test_bookings import create_test_freelancer, create_test_client


def test_freelancer_availability_and_overrides(client, db):
    # 1. Setup freelancer & client
    free_user, free_prof = create_test_freelancer(db, "free_avail@example.com")
    free_token = create_token(free_user.id, "access", role="FREELANCER")
    free_headers = {"Authorization": f"Bearer {free_token}"}

    # 2. Add weekly schedule: TUESDAY 09:00 - 18:00
    weekly_payload = {
        "schedules": [
            {
                "day_of_week": "TUESDAY",
                "is_available": True,
                "start_time": "09:00",
                "end_time": "18:00"
            }
        ]
    }
    weekly_res = client.put("/api/v1/freelancer/availability/weekly", json=weekly_payload, headers=free_headers)
    assert weekly_res.status_code == 200
    assert len(weekly_res.json()) == 1

    # 3. Check public availability for Tuesday (within hours) -> True
    check_url = f"/api/v1/freelancers/{free_prof.id}/availability?date=2026-12-15&start_time=10:00&end_time=12:00" # 2026-12-15 is a Tuesday
    res = client.get(check_url)
    assert res.status_code == 200
    assert res.json()["available"] is True

    # 4. Check public availability for Tuesday (outside hours) -> False
    check_url_outside = f"/api/v1/freelancers/{free_prof.id}/availability?date=2026-12-15&start_time=08:00&end_time=10:00"
    res_outside = client.get(check_url_outside)
    assert res_outside.json()["available"] is False

    # 5. Check public availability for Wednesday (not scheduled) -> False
    check_url_wed = f"/api/v1/freelancers/{free_prof.id}/availability?date=2026-12-16&start_time=10:00&end_time=12:00" # Wednesday
    res_wed = client.get(check_url_wed)
    assert res_wed.json()["available"] is False

    # 6. Add Date Override: Wednesday is AVAILABLE 10:00 - 14:00
    override_payload = {
        "date": "2026-12-16",
        "start_time": "10:00",
        "end_time": "14:00",
        "availability_type": "AVAILABLE",
        "note": "Custom available slot"
    }
    res_override = client.post("/api/v1/freelancer/availability/override", json=override_payload, headers=free_headers)
    assert res_override.status_code == 201

    # Recheck Wednesday (within override) -> True
    res_wed_new = client.get(check_url_wed)
    assert res_wed_new.json()["available"] is True

    # 7. Add Date Override: Tuesday is UNAVAILABLE (Blocked day)
    override_payload_block = {
        "date": "2026-12-15",
        "availability_type": "UNAVAILABLE",
        "note": "Doctor appointment"
    }
    client.post("/api/v1/freelancer/availability/override", json=override_payload_block, headers=free_headers)

    # Recheck Tuesday -> False
    res_tues_new = client.get(check_url)
    assert res_tues_new.json()["available"] is False
