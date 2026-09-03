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
    full_name=f"Freelancer A {rand_id}",
    email=f"freeA_{rand_id}@test.com",
    phone=f"+91{rand_id}103",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
f2_user = User(
    full_name=f"Freelancer B {rand_id}",
    email=f"freeB_{rand_id}@test.com",
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
print(f"  Freelancer A Profile ID: {f1_profile.id}")
print(f"  Freelancer B Profile ID: {f2_profile.id}")

client_token = create_token(c_user.id, "access", role="CLIENT")
admin_token = create_token(a_user.id, "access", role="ADMIN")
f1_token = create_token(f1_user.id, "access", role="FREELANCER")
f2_token = create_token(f2_user.id, "access", role="FREELANCER")

headers_client = {"Authorization": f"Bearer {client_token}"}
headers_admin = {"Authorization": f"Bearer {admin_token}"}
headers_f1 = {"Authorization": f"Bearer {f1_token}"}
headers_f2 = {"Authorization": f"Bearer {f2_token}"}

# =========================================================================
# TEST A: ACCEPTANCE & CONCURRENCY PROTECTION
# =========================================================================
print("\n--- TEST A: ACCEPTANCE & PREVENT MULTIPLE ACTIVE ASSIGNMENTS ---")
create_payload_A = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=12)).isoformat(),
    "venue_name": "Studio 1, Bandra, Mumbai",
    "requirement_description": "Commercial shoot for Test A.",
    "budget": 30000.0,
    "booking_type": "REMOTE"
}
resp_bA = client.post("/api/v1/client/bookings", json=create_payload_A, headers=headers_client)
assert resp_bA.status_code == 201
bA_id = resp_bA.json()["id"]

# Admin assigns Freelancer A
assign_payload_A = {
    "freelancer_profile_id": f1_profile.id,
    "offered_payout_amount": 25000.0,
    "admin_notes": "Offer to Freelancer A."
}
resp_aA = client.post(f"/api/v1/admin/bookings/{bA_id}/assign", json=assign_payload_A, headers=headers_admin)
assert resp_aA.status_code == 200
assignA_id = resp_aA.json()["id"]

# Freelancer A accepts
resp_accA = client.post(f"/api/v1/freelancer/assignments/{assignA_id}/accept", headers=headers_f1)
assert resp_accA.status_code == 200
print("1. Freelancer A accepted assignment.")

# Admin opens detail view
resp_detailA = client.get(f"/api/v1/admin/bookings/{bA_id}", headers=headers_admin)
assert resp_detailA.status_code == 200
detailA = resp_detailA.json()
assert detailA["freelancer"]["id"] == f1_profile.id
assert len(detailA["assignments"]) == 1
assert detailA["assignments"][0]["status"] == "ACCEPTED"
print("2. Admin view verified: Accepted status and Freelancer A active.")

# Admin attempts to assign Freelancer B when an accepted offer exists -> MUST FAIL with 409
assign_payload_B_on_A = {
    "freelancer_profile_id": f2_profile.id,
    "offered_payout_amount": 28000.0
}
resp_block = client.post(f"/api/v1/admin/bookings/{bA_id}/assign", json=assign_payload_B_on_A, headers=headers_admin)
assert resp_block.status_code == 409, f"Expected 409 Conflict! Got {resp_block.status_code}"
print("3. CONCURRENCY PROTECTION PASSED: Cannot assign another creator when an accepted offer exists.")

# =========================================================================
# TEST B & C: DECLINE & REASSIGN SAME FREELANCER (MULTIPLE ROUNDS)
# =========================================================================
print("\n--- TEST B & C: DECLINE & REASSIGN SAME FREELANCER (ROUND 2) ---")
create_payload_BC = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=14)).isoformat(),
    "venue_name": "Studio 2, Bandra, Mumbai",
    "requirement_description": "Fashion shoot for Test B & C.",
    "budget": 30000.0,
    "booking_type": "REMOTE"
}
resp_bBC = client.post("/api/v1/client/bookings", json=create_payload_BC, headers=headers_client)
assert resp_bBC.status_code == 201
bBC_id = resp_bBC.json()["id"]

# Round 1: Admin assigns Freelancer A for 20000
assign_round1 = {
    "freelancer_profile_id": f1_profile.id,
    "offered_payout_amount": 20000.0,
    "admin_notes": "Initial lower offer."
}
resp_r1 = client.post(f"/api/v1/admin/bookings/{bBC_id}/assign", json=assign_round1, headers=headers_admin)
assert resp_r1.status_code == 200
assign_r1_id = resp_r1.json()["id"]

# Freelancer A declines with counter-offer 25000
reject_payload = {
    "reason": "Budget is too low for standard rate.",
    "counter_offer_amount": 25000.0,
    "counter_offer_notes": "Can do full shoot for 25000."
}
resp_dec1 = client.post(f"/api/v1/freelancer/assignments/{assign_r1_id}/reject", json=reject_payload, headers=headers_f1)
assert resp_dec1.status_code == 200
print("1. Freelancer A declined Round 1 offer with counter offer Rs 25000.")

# Admin views detail -> sees DECLINED, decline_reason, counter_offer_amount
resp_detailBC1 = client.get(f"/api/v1/admin/bookings/{bBC_id}", headers=headers_admin)
assert resp_detailBC1.status_code == 200
detailBC1 = resp_detailBC1.json()
r1_log = detailBC1["assignments"][0]
assert r1_log["status"] == "DECLINED"
assert r1_log["decline_reason"] == "Budget is too low for standard rate."
assert float(r1_log["counter_offer_amount"]) == 25000.0
assert r1_log["counter_offer_notes"] == "Can do full shoot for 25000."
print("2. Admin view verified: Decline reason and counter offer details visible.")

# Round 2: Admin accepts counter and reassigns SAME Freelancer A for 25000
assign_round2 = {
    "freelancer_profile_id": f1_profile.id,
    "offered_payout_amount": 25000.0,
    "admin_notes": "Accepted counter offer rate."
}
resp_r2 = client.post(f"/api/v1/admin/bookings/{bBC_id}/assign", json=assign_round2, headers=headers_admin)
assert resp_r2.status_code == 200
assign_r2_id = resp_r2.json()["id"]

# Verify MySQL State for Round 1 & Round 2
db.commit()
assignments_db = db.query(BookingAssignment).filter(BookingAssignment.booking_id == bBC_id).order_by(BookingAssignment.assignment_round).all()
assert len(assignments_db) == 2, f"Expected 2 assignment rounds! Found {len(assignments_db)}"
assert assignments_db[0].assignment_round == 1
assert assignments_db[0].status == AssignmentStatus.DECLINED.value
assert assignments_db[0].decline_reason == "Budget is too low for standard rate."

assert assignments_db[1].assignment_round == 2
assert assignments_db[1].status == AssignmentStatus.OFFERED.value
assert float(assignments_db[1].offered_payout_amount) == 25000.0
assert assignments_db[1].freelancer_profile_id == f1_profile.id

print("3. SAME FREELANCER REASSIGNMENT VERIFIED:")
print(f"   Round 1 ID {assignments_db[0].id}: status={assignments_db[0].status}, reason={assignments_db[0].decline_reason}")
print(f"   Round 2 ID {assignments_db[1].id}: status={assignments_db[1].status}, amount=INR {assignments_db[1].offered_payout_amount}")

# =========================================================================
# TEST D: ASSIGN DIFFERENT FREELANCER AFTER DECLINE (REPLACEMENT)
# =========================================================================
print("\n--- TEST D: ASSIGN DIFFERENT FREELANCER (ROUND 2) ---")
create_payload_D = {
    "selected_freelancer_profile_id": f1_profile.id,
    "scheduled_date": (date.today() + timedelta(days=16)).isoformat(),
    "venue_name": "Studio 3, Bandra, Mumbai",
    "requirement_description": "Event shoot for Test D.",
    "budget": 35000.0,
    "booking_type": "REMOTE"
}
resp_bD = client.post("/api/v1/client/bookings", json=create_payload_D, headers=headers_client)
assert resp_bD.status_code == 201
bD_id = resp_bD.json()["id"]

# Round 1: Admin assigns Freelancer A (Client choice)
resp_r1D = client.post(f"/api/v1/admin/bookings/{bD_id}/assign", json=assign_round1, headers=headers_admin)
assert resp_r1D.status_code == 200
assign_r1D_id = resp_r1D.json()["id"]

# Freelancer A declines
client.post(f"/api/v1/freelancer/assignments/{assign_r1D_id}/reject", json={"reason": "Schedule conflict."}, headers=headers_f1)

# Round 2: Admin assigns DIFFERENT Freelancer B
assign_round2D = {
    "freelancer_profile_id": f2_profile.id,
    "offered_payout_amount": 26000.0,
    "admin_notes": "Assigned Freelancer B after A declined."
}
resp_r2D = client.post(f"/api/v1/admin/bookings/{bD_id}/assign", json=assign_round2D, headers=headers_admin)
assert resp_r2D.status_code == 200
assign_r2D_data = resp_r2D.json()
assert assign_r2D_data["is_replacement"] is True
assert assign_r2D_data["client_approval_required"] is True

# Verify MySQL State for Test D
db.commit()
db_bD = db.query(Booking).filter(Booking.id == bD_id).first()
assignments_db_D = db.query(BookingAssignment).filter(BookingAssignment.booking_id == bD_id).order_by(BookingAssignment.assignment_round).all()

assert db_bD.selected_freelancer_profile_id == f1_profile.id, "CRITICAL: Client choice Freelancer A was overwritten!"
assert len(assignments_db_D) == 2
assert assignments_db_D[0].freelancer_profile_id == f1_profile.id
assert assignments_db_D[0].status == AssignmentStatus.DECLINED.value
assert assignments_db_D[1].freelancer_profile_id == f2_profile.id
assert assignments_db_D[1].status == AssignmentStatus.OFFERED.value
assert assignments_db_D[1].is_replacement is True

print("1. DIFFERENT FREELANCER REASSIGNMENT VERIFIED:")
print(f"   Selected Freelancer Profile ID (Client Choice): {db_bD.selected_freelancer_profile_id} (Preserved Freelancer A)")
print(f"   Round 1 (Freelancer A ID {f1_profile.id}): status={assignments_db_D[0].status}")
print(f"   Round 2 (Freelancer B ID {f2_profile.id}): status={assignments_db_D[1].status}, is_replacement={assignments_db_D[1].is_replacement}")

# =========================================================================
# SECURITY CHECKS FOR REASSIGNMENT ENDPOINTS
# =========================================================================
print("\n--- REASSIGNMENT SECURITY CHECKS ---")
resp_c_assign = client.post(f"/api/v1/admin/bookings/{bD_id}/assign", json=assign_round2D, headers=headers_client)
assert resp_c_assign.status_code == 403
print("1. Client blocked from admin assign endpoint (403 Forbidden).")

resp_f_assign = client.post(f"/api/v1/admin/bookings/{bD_id}/assign", json=assign_round2D, headers=headers_f1)
assert resp_f_assign.status_code == 403
print("2. Freelancer blocked from admin assign endpoint (403 Forbidden).")

db.close()
print("\n>>> ALL STEP 4 ADMIN ASSIGNMENT RESPONSE & REASSIGNMENT TESTS PASSED CLEANLY! <<<")
