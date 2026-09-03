import os
import sys
import random
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import create_token
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking

client = TestClient(app)
db = SessionLocal()

# 1. Setup Test Users
rand_id = random.randint(100000, 999999)
client_email = f"e2e_client_{rand_id}@example.com"
admin_email = f"e2e_admin_{rand_id}@example.com"
freelancer_email = f"e2e_freelancer_{rand_id}@example.com"

# Create Client user
c_user = User(
    full_name=f"E2E Client {rand_id}",
    email=client_email,
    phone=f"+91{rand_id}001",
    password_hash="hashed_pass_test",
    role=UserRole.CLIENT,
    is_active=True
)
db.add(c_user)

# Create Admin user
a_user = User(
    full_name=f"E2E Admin {rand_id}",
    email=admin_email,
    phone=f"+91{rand_id}002",
    password_hash="hashed_pass_test",
    role=UserRole.ADMIN,
    is_active=True
)
db.add(a_user)

# Create Freelancer user & profile
f_user = User(
    full_name=f"E2E Freelancer {rand_id}",
    email=freelancer_email,
    phone=f"+91{rand_id}003",
    password_hash="hashed_pass_test",
    role=UserRole.FREELANCER,
    is_active=True
)
db.add(f_user)
db.commit()

f_profile = FreelancerProfile(
    user_id=f_user.id,
    professional_title="Senior Commercial Photographer",
    primary_profession=FreelancerProfession.PHOTOGRAPHER,
    city="Mumbai",
    is_profile_public=True
)
db.add(f_profile)
db.commit()

print(f"Created test users: Client ID {c_user.id}, Admin ID {a_user.id}, Freelancer Profile ID {f_profile.id}")

client_token = create_token(c_user.id, "access", role="CLIENT")
admin_token = create_token(a_user.id, "access", role="ADMIN")

# 2. Submit Booking as Client
booking_date = (date.today() + timedelta(days=5)).isoformat()
payload = {
    "selected_freelancer_profile_id": f_profile.id,
    "scheduled_date": booking_date,
    "venue_name": "Studio 5, Bandra West, Mumbai",
    "requirement_description": "Full day product shoot for upcoming Autumn fashion collection.",
    "budget": 25000.0,
    "booking_type": "REMOTE"
}

headers_client = {"Authorization": f"Bearer {client_token}"}
response = client.post("/api/v1/client/bookings", json=payload, headers=headers_client)
print("Client creation status code:", response.status_code)
assert response.status_code == 201, f"Failed to create booking: {response.text}"
booking_data = response.json()
booking_id = booking_data["id"]
booking_number = booking_data["booking_number"]
print(f"SUCCESSFULLY CREATED BOOKING: ID={booking_id}, Number={booking_number}")

# 3. Verify MySQL database record directly in fresh session
db.commit()
db_booking = db.query(Booking).filter(Booking.id == booking_id).first()
assert db_booking is not None, "Booking not found in MySQL!"
print("MySQL direct check passed! Status:", db_booking.status, "Agreed Amount:", db_booking.agreed_amount)

# 4. Fetch Admin Booking Inbox as Admin
headers_admin = {"Authorization": f"Bearer {admin_token}"}
admin_list_resp = client.get("/api/v1/admin/bookings", headers=headers_admin)
assert admin_list_resp.status_code == 200, f"Admin list failed: {admin_list_resp.text}"
inbox_items = admin_list_resp.json()

target_item = next((item for item in inbox_items if item["id"] == booking_id), None)
assert target_item is not None, f"Booking {booking_id} not visible in Admin Booking Inbox!"
print(f"ADMIN INBOX VERIFIED! Booking {booking_number} visible to Admin.")
print("  Client Name:", target_item["client"]["full_name"])
print("  Selected Freelancer Name:", target_item["selected_freelancer"]["full_name"])
print("  Status:", target_item["status"])
print("  Agreed Amount:", target_item["agreed_amount"])

# 5. Fetch Admin Booking Detail as Admin
admin_detail_resp = client.get(f"/api/v1/admin/bookings/{booking_id}", headers=headers_admin)
assert admin_detail_resp.status_code == 200, f"Admin detail failed: {admin_detail_resp.text}"
detail = admin_detail_resp.json()

print(f"ADMIN BOOKING DETAIL VERIFIED!")
print("  Description:", detail["description"])
print("  Venue:", detail["venue_name"])
print("  Agreed Amount:", detail["agreed_amount"])
print("  Client Email:", detail["client"]["email"])
print("  Selected Freelancer Title:", detail["selected_freelancer"]["professional_title"])

# 6. Verify Security: Client forbidden from Admin endpoints
client_blocked_resp = client.get("/api/v1/admin/bookings", headers=headers_client)
assert client_blocked_resp.status_code == 403, f"Client was not blocked! Code: {client_blocked_resp.status_code}"
print("SECURITY VERIFIED: Client blocked from Admin booking API (403 Forbidden).")

db.close()
print("\n>>> ALL E2E TESTS PASSED CLEANLY! <<<")
