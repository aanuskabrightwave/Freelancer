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
    full_name=f"Freelancer 1 Preferred {rand_id}",
    email=f"free1_{rand_id}@test.com",
    phone=f"+91{rand_id}103",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
f2_user = User(
    full_name=f"Freelancer 2 Assigned {rand_id}",
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
print(f"  Freelancer 1 Profile ID: {f1_profile.id}")
print(f"  Freelancer 2 Profile ID: {f2_profile.id}")

client_token = create_token(c_user.id, "access", role="CLIENT")
admin_token = create_token(a_user.id, "access", role="ADMIN")
f1_token = create_token(f1_user.id, "access", role="FREELANCER")
f2_token = create_token(f2_user.id, "access", role="FREELANCER")

headers_client = {"Authorization": f"Bearer {client_token}"}
headers_admin = {"Authorization": f"Bearer {admin_token}"}
headers_f1 = {"Authorization": f"Bearer {f1_token}"}
headers_f2 = {"Authorization": f"Bearer {f2_token}"}

# =========================================================================
# SCENARIO A1: FREELANCER ACCEPTS DIRECT ASSIGNMENT (SAME AS CLIENT CHOICE)
# =========================================================================
print("\n--- SCENARIO A1: DIRECT ASSIGNMENT ACCEPTANCE ---")
create_payload1 = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=7)).isoformat(),
    "venue_name": "Studio A, Bandra West, Mumbai",
    "requirement_description": "Full day commercial shoot for A1.",
    "budget": 30000.0,
    "booking_type": "REMOTE"
}
resp_b1 = client.post("/api/v1/client/bookings", json=create_payload1, headers=headers_client)
assert resp_b1.status_code == 201, f"b1 failed: {resp_b1.text}"
b1_id = resp_b1.json()["id"]

# Admin assigns Freelancer 1 (the same freelancer requested by client)
assign_payload1 = {
    "freelancer_profile_id": f1_profile.id,
    "offered_payout_amount": 25000.0,
    "admin_notes": "Assigned requested creator."
}
resp_a1 = client.post(f"/api/v1/admin/bookings/{b1_id}/assign", json=assign_payload1, headers=headers_admin)
assert resp_a1.status_code == 200
assign1_id = resp_a1.json()["id"]
assert resp_a1.json()["is_replacement"] is False
print(f"1. Admin assigned Freelancer 1 to Booking {b1_id} -> Assignment ID {assign1_id} (is_replacement=False)")

# Freelancer 1 accepts
resp_accept1 = client.post(f"/api/v1/freelancer/assignments/{assign1_id}/accept", headers=headers_f1)
assert resp_accept1.status_code == 200, f"Accept failed: {resp_accept1.text}"
assert resp_accept1.json()["status"] == "ACCEPTED"
print("2. Freelancer 1 accepted assignment successfully.")

# Verify MySQL State After Direct Acceptance
db.commit()
db_b1 = db.query(Booking).filter(Booking.id == b1_id).first()
db_assign1 = db.query(BookingAssignment).filter(BookingAssignment.id == assign1_id).first()

assert db_assign1.status == AssignmentStatus.ACCEPTED.value
assert db_assign1.responded_at is not None
assert db_b1.selected_freelancer_profile_id == f1_profile.id, "Client choice preserved!"
assert db_b1.freelancer_profile_id == f1_profile.id, "freelancer_profile_id populated upon acceptance!"
assert db_b1.status == BookingStatus.CONFIRMED, "Booking status transitioned to CONFIRMED!"

print("3. MYSQL DIRECT ACCEPTANCE VERIFIED:")
print(f"   Selected Freelancer Profile ID (Client Choice) preserved: {db_b1.selected_freelancer_profile_id}")
print(f"   Confirmed Freelancer Profile ID: {db_b1.freelancer_profile_id}")
print(f"   Booking Status: {db_b1.status}")
print(f"   Assignment Status: {db_assign1.status}")

# =========================================================================
# SCENARIO A2: FREELANCER ACCEPTS REPLACEMENT ASSIGNMENT (DIFFERENT CREATOR)
# =========================================================================
print("\n--- SCENARIO A2: REPLACEMENT ASSIGNMENT ACCEPTANCE ---")
create_payload2 = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=8)).isoformat(),
    "venue_name": "Studio B, Bandra West, Mumbai",
    "requirement_description": "Full day commercial shoot for A2.",
    "budget": 30000.0,
    "booking_type": "REMOTE"
}
resp_b2 = client.post("/api/v1/client/bookings", json=create_payload2, headers=headers_client)
assert resp_b2.status_code == 201, f"b2 failed: {resp_b2.text}"
b2_id = resp_b2.json()["id"]

# Admin assigns Freelancer 2 (replacement creator)
assign_payload2 = {
    "freelancer_profile_id": f2_profile.id,
    "offered_payout_amount": 25000.0,
    "admin_notes": "Assigned alternative creator."
}
resp_a2 = client.post(f"/api/v1/admin/bookings/{b2_id}/assign", json=assign_payload2, headers=headers_admin)
assert resp_a2.status_code == 200
assign2_id = resp_a2.json()["id"]
assert resp_a2.json()["is_replacement"] is True
print(f"1. Admin assigned Freelancer 2 as replacement to Booking {b2_id} -> Assignment ID {assign2_id} (is_replacement=True)")

# Freelancer 2 accepts
resp_accept2 = client.post(f"/api/v1/freelancer/assignments/{assign2_id}/accept", headers=headers_f2)
assert resp_accept2.status_code == 200
assert resp_accept2.json()["status"] == "ACCEPTED"
print("2. Freelancer 2 accepted replacement assignment successfully.")

# Verify MySQL State After Replacement Acceptance
db.commit()
db_b2 = db.query(Booking).filter(Booking.id == b2_id).first()
db_assign2 = db.query(BookingAssignment).filter(BookingAssignment.id == assign2_id).first()

assert db_assign2.status == AssignmentStatus.ACCEPTED.value
assert db_b2.selected_freelancer_profile_id == f1_profile.id, "Client choice preserved!"
assert db_b2.freelancer_profile_id is None, "freelancer_profile_id remains None until Client approves replacement!"
assert db_b2.status == BookingStatus.MATCHING_IN_PROGRESS, "Booking status remains MATCHING_IN_PROGRESS!"

print("3. MYSQL REPLACEMENT ACCEPTANCE VERIFIED:")
print(f"   Selected Freelancer Profile ID (Client Choice) preserved: {db_b2.selected_freelancer_profile_id}")
print(f"   Confirmed Freelancer Profile ID (Awaiting Client): {db_b2.freelancer_profile_id}")
print(f"   Booking Status: {db_b2.status}")
print(f"   Assignment Status: {db_assign2.status}")

# =========================================================================
# SCENARIO B: FREELANCER REJECTS ASSIGNMENT WITHOUT COUNTER OFFER
# =========================================================================
print("\n--- SCENARIO B: FREELANCER REJECTS WITHOUT COUNTER OFFER ---")
create_payload3 = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=9)).isoformat(),
    "venue_name": "Studio C, Bandra West, Mumbai",
    "requirement_description": "Full day commercial shoot for B.",
    "budget": 30000.0,
    "booking_type": "REMOTE"
}
resp_b3 = client.post("/api/v1/client/bookings", json=create_payload3, headers=headers_client)
assert resp_b3.status_code == 201, f"b3 failed: {resp_b3.text}"
b3_id = resp_b3.json()["id"]

resp_a3 = client.post(f"/api/v1/admin/bookings/{b3_id}/assign", json=assign_payload2, headers=headers_admin)
assert resp_a3.status_code == 200
assign3_id = resp_a3.json()["id"]

# Test reject without mandatory reason -> should fail validation (422)
resp_invalid_reject = client.post(f"/api/v1/freelancer/assignments/{assign3_id}/reject", json={"reason": ""}, headers=headers_f2)
assert resp_invalid_reject.status_code in [400, 422], f"Expected validation failure for empty reason! Got {resp_invalid_reject.status_code}"
print("1. Empty reason validation PASSED: Blank reason rejected.")

# Valid rejection without counter offer
reject_payload = {"reason": "Unavailable on requested date due to existing booking."}
resp_reject = client.post(f"/api/v1/freelancer/assignments/{assign3_id}/reject", json=reject_payload, headers=headers_f2)
assert resp_reject.status_code == 200, f"Reject failed: {resp_reject.text}"
reject_data = resp_reject.json()
assert reject_data["status"] == "DECLINED"
assert reject_data["decline_reason"] == "Unavailable on requested date due to existing booking."
assert reject_data["counter_offer_amount"] is None

# Verify MySQL State After Rejection
db.commit()
db_b3 = db.query(Booking).filter(Booking.id == b3_id).first()
db_assign3 = db.query(BookingAssignment).filter(BookingAssignment.id == assign3_id).first()

assert db_assign3.status == AssignmentStatus.DECLINED.value
assert db_assign3.decline_reason == "Unavailable on requested date due to existing booking."
assert db_assign3.counter_offer_amount is None
assert db_b3.status == BookingStatus.MATCHING_IN_PROGRESS

print("2. MYSQL REJECTION VERIFIED:")
print(f"   Assignment Status: {db_assign3.status}")
print(f"   Decline Reason: {db_assign3.decline_reason}")
print(f"   Booking Status: {db_b3.status}")

# =========================================================================
# SCENARIO C: FREELANCER REJECTS WITH COUNTER OFFER
# =========================================================================
print("\n--- SCENARIO C: FREELANCER REJECTS WITH COUNTER OFFER ---")
create_payload4 = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=10)).isoformat(),
    "venue_name": "Studio D, Bandra West, Mumbai",
    "requirement_description": "Full day commercial shoot for C.",
    "budget": 30000.0,
    "booking_type": "REMOTE"
}
resp_b4 = client.post("/api/v1/client/bookings", json=create_payload4, headers=headers_client)
assert resp_b4.status_code == 201, f"b4 failed: {resp_b4.text}"
b4_id = resp_b4.json()["id"]

resp_a4 = client.post(f"/api/v1/admin/bookings/{b4_id}/assign", json=assign_payload2, headers=headers_admin)
assert resp_a4.status_code == 200
assign4_id = resp_a4.json()["id"]

counter_payload = {
    "reason": "Scope requires additional equipment and assistant.",
    "counter_offer_amount": 35000.0,
    "counter_offer_notes": "Can execute with 2 4K cameras and full lighting setup."
}
resp_counter = client.post(f"/api/v1/freelancer/assignments/{assign4_id}/reject", json=counter_payload, headers=headers_f2)
assert resp_counter.status_code == 200, f"Counter failed: {resp_counter.text}"
counter_data = resp_counter.json()
assert counter_data["status"] == "DECLINED"
assert counter_data["counter_offer_amount"] == "35000.00" or float(counter_data["counter_offer_amount"]) == 35000.0

# Verify MySQL State After Counter Offer
db.commit()
db_assign4 = db.query(BookingAssignment).filter(BookingAssignment.id == assign4_id).first()
assert db_assign4.status == AssignmentStatus.DECLINED.value
assert float(db_assign4.counter_offer_amount) == 35000.0
assert db_assign4.counter_offer_notes == "Can execute with 2 4K cameras and full lighting setup."

print("1. MYSQL COUNTER OFFER VERIFIED:")
print(f"   Assignment Status: {db_assign4.status}")
print(f"   Decline Reason: {db_assign4.decline_reason}")
print(f"   Counter Offer Amount: INR {db_assign4.counter_offer_amount}")
print(f"   Counter Offer Notes: {db_assign4.counter_offer_notes}")

# =========================================================================
# SECURITY & DUPLICATE RESPONSE TESTS
# =========================================================================
print("\n--- SECURITY & DUPLICATE RESPONSE PROTECTION TESTS ---")

# Freelancer 1 attempts to respond to Freelancer 2's assignment
resp_f1_hack = client.post(f"/api/v1/freelancer/assignments/{assign4_id}/accept", headers=headers_f1)
assert resp_f1_hack.status_code == 403, f"Expected 403 Forbidden! Got {resp_f1_hack.status_code}"
print("1. Ownership check PASSED: Freelancer 1 blocked from accepting Freelancer 2's assignment.")

# Client attempts to call freelancer accept endpoint
resp_client_hack = client.post(f"/api/v1/freelancer/assignments/{assign4_id}/accept", headers=headers_client)
assert resp_client_hack.status_code == 403, f"Expected 403 Forbidden! Got {resp_client_hack.status_code}"
print("2. Role check PASSED: Client blocked from freelancer accept endpoint.")

# Duplicate response on DECLINED assignment
resp_dup_reject = client.post(f"/api/v1/freelancer/assignments/{assign4_id}/accept", headers=headers_f2)
assert resp_dup_reject.status_code == 400, f"Expected 400 Bad Request on declined offer! Got {resp_dup_reject.status_code}"
print("3. Duplicate protection PASSED: Cannot accept an assignment that was already DECLINED.")

db.close()
print("\n>>> ALL STEP 3 FREELANCER RESPONSE TESTS PASSED CLEANLY! <<<")
