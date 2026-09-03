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
from app.models.booking import Booking, BookingStatus
from app.models.booking_assignment import BookingAssignment, AssignmentStatus

client = TestClient(app)
db = SessionLocal()

rand_id = random.randint(100000, 999999)

# 1. Create Test Users
c_user = User(
    full_name=f"Client User {rand_id}",
    email=f"client_{rand_id}@test.com",
    phone=f"+91{rand_id}101",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
a_user = User(
    full_name=f"Admin User {rand_id}",
    email=f"admin_{rand_id}@test.com",
    phone=f"+91{rand_id}102",
    password_hash="pass_hash",
    role=UserRole.ADMIN,
    is_active=True
)
f1_user = User(
    full_name=f"Freelancer Preferred {rand_id}",
    email=f"free1_{rand_id}@test.com",
    phone=f"+91{rand_id}103",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
f2_user = User(
    full_name=f"Freelancer Assigned {rand_id}",
    email=f"free2_{rand_id}@test.com",
    phone=f"+91{rand_id}104",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
db.add_all([c_user, a_user, f1_user, f2_user])
db.commit()

f1_profile = FreelancerProfile(
    user_id=f1_user.id,
    professional_title="Fashion Photographer",
    primary_profession=FreelancerProfession.PHOTOGRAPHER,
    city="Mumbai",
    is_profile_public=True
)
f2_profile = FreelancerProfile(
    user_id=f2_user.id,
    professional_title="Event Videographer",
    primary_profession=FreelancerProfession.VIDEOGRAPHER,
    city="Mumbai",
    is_profile_public=True
)
db.add_all([f1_profile, f2_profile])
db.commit()

print(f"SETUP COMPLETE:")
print(f"  Client ID: {c_user.id}")
print(f"  Admin ID: {a_user.id}")
print(f"  Freelancer 1 (Client Choice) Profile ID: {f1_profile.id}")
print(f"  Freelancer 2 (Admin Choice) Profile ID: {f2_profile.id}")

client_token = create_token(c_user.id, "access", role="CLIENT")
admin_token = create_token(a_user.id, "access", role="ADMIN")
freelancer_token = create_token(f1_user.id, "access", role="FREELANCER")

headers_client = {"Authorization": f"Bearer {client_token}"}
headers_admin = {"Authorization": f"Bearer {admin_token}"}
headers_freelancer = {"Authorization": f"Bearer {freelancer_token}"}

# 2. Client submits booking with Freelancer 1 selected
booking_date = (date.today() + timedelta(days=7)).isoformat()
create_payload = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": booking_date,
    "venue_name": "Grand Ballroom, Taj Lands End, Mumbai",
    "requirement_description": "Wedding reception coverage, highlights video and raw photos.",
    "budget": 50000.0,
    "booking_type": "REMOTE"
}

resp_create = client.post("/api/v1/client/bookings", json=create_payload, headers=headers_client)
assert resp_create.status_code == 201, f"Client booking failed: {resp_create.text}"
b_data = resp_create.json()
booking_id = b_data["id"]
booking_number = b_data["booking_number"]
print(f"\n1. CLIENT CREATED BOOKING: ID={booking_id}, Number={booking_number}")

# 3. Direct MySQL check after Client booking
db.commit()
db_b1 = db.query(Booking).filter(Booking.id == booking_id).first()
assert db_b1.selected_freelancer_profile_id == f1_profile.id, "Client choice missing!"
assert db_b1.freelancer_profile_id is None, "freelancer_profile_id should be None initially!"
assert db_b1.status == BookingStatus.REQUESTED, "Status should be REQUESTED!"
print("2. MYSQL CLIENT BOOKING CHECK PASSED:")
print(f"   selected_freelancer_profile_id = {db_b1.selected_freelancer_profile_id}")
print(f"   freelancer_profile_id = {db_b1.freelancer_profile_id}")
print(f"   status = {db_b1.status}")

# 4. Admin opens booking details before assignment
resp_detail_before = client.get(f"/api/v1/admin/bookings/{booking_id}", headers=headers_admin)
assert resp_detail_before.status_code == 200
detail_before = resp_detail_before.json()
assert detail_before["selected_freelancer"]["id"] == f1_profile.id
assert detail_before["selected_freelancer"]["full_name"] == f1_user.full_name
assert detail_before["freelancer"] is None
print("3. ADMIN VIEW BEFORE ASSIGNMENT PASSED:")
print(f"   Selected Freelancer Name: {detail_before['selected_freelancer']['full_name']}")
print(f"   Assigned Freelancer: {detail_before['freelancer']}")

# 5. Admin assigns Freelancer 2
assign_payload = {
    "freelancer_profile_id": f2_profile.id,
    "offered_payout_amount": 37500.0,
    "admin_notes": "Assigned skilled videographer for event requirements."
}

resp_assign = client.post(f"/api/v1/admin/bookings/{booking_id}/assign", json=assign_payload, headers=headers_admin)
assert resp_assign.status_code == 200, f"Assignment API failed: {resp_assign.text}"
assign_data = resp_assign.json()
assignment_id = assign_data["id"]
print(f"\n4. ADMIN ASSIGNED FREELANCER 2: Assignment ID={assignment_id}")
print(f"   Round: {assign_data['assignment_round']}")
print(f"   Status: {assign_data['status']}")
print(f"   Offered Payout: INR {assign_data['offered_payout_amount']}")
print(f"   Is Replacement: {assign_data['is_replacement']}")
print(f"   Client Approval Required: {assign_data['client_approval_required']}")

# 6. Direct MySQL check after assignment
db.commit()
db_b2 = db.query(Booking).filter(Booking.id == booking_id).first()
db_assignment = db.query(BookingAssignment).filter(BookingAssignment.id == assignment_id).first()

assert db_assignment is not None, "BookingAssignment record not saved in MySQL!"
assert db_assignment.booking_id == booking_id
assert db_assignment.freelancer_profile_id == f2_profile.id
assert db_assignment.assigned_by_admin_id == a_user.id
assert db_assignment.status == AssignmentStatus.OFFERED.value

assert db_b2.selected_freelancer_profile_id == f1_profile.id, "CRITICAL: Client's original selected freelancer was overwritten!"
assert db_b2.freelancer_profile_id is None, "freelancer_profile_id must remain None until offer is accepted!"
assert db_b2.status == BookingStatus.MATCHING_IN_PROGRESS, "Booking status must update to MATCHING_IN_PROGRESS!"

print("5. MYSQL POST-ASSIGNMENT CHECK PASSED:")
print(f"   Selected Freelancer ID (Client Choice) preserved: {db_b2.selected_freelancer_profile_id}")
print(f"   Active Assigned Profile ID in booking_assignments: {db_assignment.freelancer_profile_id}")
print(f"   Booking Status: {db_b2.status}")
print(f"   Assignment Status: {db_assignment.status}")

# 7. Test Duplicate Assignment Protection (re-submitting same assignment)
resp_dup = client.post(f"/api/v1/admin/bookings/{booking_id}/assign", json=assign_payload, headers=headers_admin)
assert resp_dup.status_code == 409, f"Expected 409 Conflict on duplicate assignment! Got {resp_dup.status_code}"
print("\n6. DUPLICATE ASSIGNMENT PROTECTION PASSED: 409 Conflict returned on re-click.")

# 8. Admin re-fetches inbox & detail to verify persistence
resp_inbox_after = client.get("/api/v1/admin/bookings", headers=headers_admin)
assert resp_inbox_after.status_code == 200
inbox_items = resp_inbox_after.json()
target_inbox = next(item for item in inbox_items if item["id"] == booking_id)

print("\n7. ADMIN INBOX AFTER ASSIGNMENT VERIFIED:")
print(f"   Client Name: {target_inbox['client']['full_name']}")
print(f"   Selected Creator: {target_inbox['selected_freelancer']['full_name']}")
print(f"   Active Assignment Status: {target_inbox['active_assignment']['status']}")
print(f"   Assigned Candidate Name: {target_inbox['active_assignment']['freelancer_profile']['full_name']}")

# 9. Security Verification
resp_client_assign = client.post(f"/api/v1/admin/bookings/{booking_id}/assign", json=assign_payload, headers=headers_client)
assert resp_client_assign.status_code == 403, f"Client was not blocked! Code: {resp_client_assign.status_code}"

resp_free_assign = client.post(f"/api/v1/admin/bookings/{booking_id}/assign", json=assign_payload, headers=headers_freelancer)
assert resp_free_assign.status_code == 403, f"Freelancer was not blocked! Code: {resp_free_assign.status_code}"

print("\n8. SECURITY CHECKS PASSED:")
print("   Client blocked from assign endpoint (403 Forbidden).")
print("   Freelancer blocked from assign endpoint (403 Forbidden).")

db.close()
print("\n>>> ALL STEP 2 ASSIGNMENT TESTS PASSED CLEANLY! <<<")
