import os
import sys
import random
from datetime import date, timedelta
from io import BytesIO

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import create_token
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus
from app.models.delivery import Delivery, DeliveryStatus
from app.models.workspace_file import WorkspaceFile

client = TestClient(app)
db = SessionLocal()

rand_id = random.randint(100000, 999999)

# 1. Create Test Users
cA_user = User(
    full_name=f"Client A {rand_id}",
    email=f"clientA_{rand_id}@test.com",
    phone=f"+91{rand_id}101",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
cB_user = User(
    full_name=f"Client B {rand_id}",
    email=f"clientB_{rand_id}@test.com",
    phone=f"+91{rand_id}102",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
a_user = User(
    full_name=f"Admin User {rand_id}",
    email=f"admin_{rand_id}@test.com",
    phone=f"+91{rand_id}103",
    password_hash="pass_hash",
    role=UserRole.ADMIN,
    is_active=True
)
fA_user = User(
    full_name=f"Freelancer A {rand_id}",
    email=f"freeA_{rand_id}@test.com",
    phone=f"+91{rand_id}104",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
fB_user = User(
    full_name=f"Freelancer B {rand_id}",
    email=f"freeB_{rand_id}@test.com",
    phone=f"+91{rand_id}105",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
db.add_all([cA_user, cB_user, a_user, fA_user, fB_user])
db.commit()

fA_profile = FreelancerProfile(
    user_id=fA_user.id,
    professional_title="Senior Editor",
    primary_profession=FreelancerProfession.VIDEO_EDITOR,
    city="Mumbai",
    is_profile_public=True
)
fB_profile = FreelancerProfile(
    user_id=fB_user.id,
    professional_title="Unassigned Editor",
    primary_profession=FreelancerProfession.VIDEO_EDITOR,
    city="Mumbai",
    is_profile_public=True
)
db.add_all([fA_profile, fB_profile])
db.commit()

cA_token = create_token(cA_user.id, "access", role="CLIENT")
cB_token = create_token(cB_user.id, "access", role="CLIENT")
admin_token = create_token(a_user.id, "access", role="ADMIN")
fA_token = create_token(fA_user.id, "access", role="FREELANCER")
fB_token = create_token(fB_user.id, "access", role="FREELANCER")

headers_cA = {"Authorization": f"Bearer {cA_token}"}
headers_cB = {"Authorization": f"Bearer {cB_token}"}
headers_admin = {"Authorization": f"Bearer {admin_token}"}
headers_fA = {"Authorization": f"Bearer {fA_token}"}
headers_fB = {"Authorization": f"Bearer {fB_token}"}

print("SETUP COMPLETE:")
print(f"  Client A ID: {cA_user.id}")
print(f"  Admin ID: {a_user.id}")
print(f"  Freelancer A Profile ID: {fA_profile.id}")
print(f"  Freelancer B Profile ID: {fB_profile.id}")

# Setup Booking 1: Client A creates booking, Admin assigns Freelancer A, Freelancer A ACCEPTS
create_payload = {
    "selected_freelancer_profile_id": fA_profile.id,
    "scheduled_date": (date.today() + timedelta(days=25)).isoformat(),
    "venue_name": "Studio 5, Bandra",
    "requirement_description": "Full Video Post-Production & Color Grading",
    "budget": 60000.0,
    "booking_type": "REMOTE"
}
resp_b1 = client.post("/api/v1/client/bookings", json=create_payload, headers=headers_cA)
assert resp_b1.status_code == 201
b1_id = resp_b1.json()["id"]

# Admin assigns Freelancer A
resp_assign = client.post(f"/api/v1/admin/bookings/{b1_id}/assign", json={"freelancer_profile_id": fA_profile.id, "offered_payout_amount": 50000.0}, headers=headers_admin)
assert resp_assign.status_code == 200
assign_id = resp_assign.json()["id"]

# Freelancer A ACCEPTS
resp_acc = client.post(f"/api/v1/freelancer/assignments/{assign_id}/accept", headers=headers_fA)
assert resp_acc.status_code == 200
print(f"1. Booking ID {b1_id} is CONFIRMED and assigned to Freelancer A.")

# =========================================================================
# TEST A: WORK START ELIGIBILITY & DEPOSIT PAYMENT REQUIREMENT
# =========================================================================
print("\n--- TEST A: WORK START ELIGIBILITY & DEPOSIT PAYMENT REQUIREMENT ---")

# Freelancer A attempts to start work BEFORE deposit payment -> MUST FAIL (400 Bad Request)
resp_start_pre_deposit = client.post(f"/api/v1/freelancer/bookings/{b1_id}/start", headers=headers_fA)
assert resp_start_pre_deposit.status_code == 400
assert "Payment must be completed before" in resp_start_pre_deposit.json()["detail"]
print("1. Freelancer work start attempt BEFORE deposit payment BLOCKED (400 Bad Request).")

# Freelancer B (unassigned creator) attempts to start work -> MUST FAIL (403 Forbidden)
resp_start_unassigned = client.post(f"/api/v1/freelancer/bookings/{b1_id}/start", headers=headers_fB)
assert resp_start_unassigned.status_code == 403
print("2. Unassigned Freelancer B start work attempt BLOCKED (403 Forbidden).")

# Client A pays required deposit
resp_order = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order.status_code == 201
order_data = resp_order.json()

verify_payload = {
    "razorpay_order_id": order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_test_step7_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_verify = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=verify_payload, headers=headers_cA)
assert resp_verify.status_code == 200
print("3. Client A paid 30% deposit successfully. Payment state is DEPOSIT_PAID.")

# Freelancer A starts work -> MUST SUCCEED
resp_start_success = client.post(f"/api/v1/freelancer/bookings/{b1_id}/start", headers=headers_fA)
assert resp_start_success.status_code == 200
b1_started = resp_start_success.json()
assert b1_started["status"] == "IN_PROGRESS"
print("4. Freelancer A started work successfully. Booking status is now IN_PROGRESS.")

# Verify MySQL Booking status & started_at timestamp
db.commit()
db_b1 = db.query(Booking).filter(Booking.id == b1_id).first()
assert db_b1.status == BookingStatus.IN_PROGRESS
assert db_b1.started_at is not None
print(f"5. MySQL Booking verified: status={db_b1.status.value}, started_at={db_b1.started_at}")

# =========================================================================
# TEST B: FILE UPLOAD & WORK SUBMISSION TO ADMIN
# =========================================================================
print("\n--- TEST B: FILE UPLOAD & WORK SUBMISSION TO ADMIN ---")

# Freelancer B attempts to upload file to Booking 1 workspace -> MUST FAIL (403 Forbidden)
fake_file = ("sample_edit.mp4", b"Sample edit video content", "video/mp4")
resp_upload_unassigned = client.post(
    f"/api/v1/bookings/{b1_id}/files",
    files={"file": fake_file},
    data={"category": "FINAL_DELIVERY", "description": "Unassigned upload attempt"},
    headers=headers_fB
)
assert resp_upload_unassigned.status_code == 403
print("1. Unassigned Freelancer B file upload attempt BLOCKED (403 Forbidden).")

# Freelancer A uploads completed work file to Booking 1 workspace
work_file = ("final_master_v1.mp4", b"Final video edit binary content", "video/mp4")
resp_upload = client.post(
    f"/api/v1/bookings/{b1_id}/files",
    files={"file": work_file},
    data={"category": "OTHER", "description": "Master color graded video"},
    headers=headers_fA
)
assert resp_upload.status_code == 201
file_data = resp_upload.json()
uploaded_file_id = file_data["id"]
print(f"2. Freelancer A uploaded work file ID {uploaded_file_id} to project workspace.")

# Freelancer B attempts to submit work to Booking 1 -> MUST FAIL (403 Forbidden)
submit_payload_fB = {
    "title": "Hack Submission",
    "message": "Submitting unassigned work",
    "file_ids": [uploaded_file_id],
    "delivery_type": "FINAL"
}
resp_sub_fB = client.post(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", json=submit_payload_fB, headers=headers_fB)
assert resp_sub_fB.status_code == 403
print("3. Unassigned Freelancer B work submission BLOCKED (403 Forbidden).")

# Client A attempts to submit work to Booking 1 -> MUST FAIL (403 Forbidden)
resp_sub_cA = client.post(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", json=submit_payload_fB, headers=headers_cA)
assert resp_sub_cA.status_code == 403
print("4. Client A work submission BLOCKED (403 Forbidden).")

# Freelancer A submits completed work to ADMIN -> MUST SUCCEED
submit_payload_fA = {
    "title": "Final Commercial Master Edit v1",
    "message": "Completed color grading, audio leveling, and motion graphics as requested in the brief.",
    "file_ids": [uploaded_file_id],
    "delivery_type": "FINAL"
}
resp_sub_fA = client.post(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", json=submit_payload_fA, headers=headers_fA)
assert resp_sub_fA.status_code == 201
delivery_data = resp_sub_fA.json()
assert delivery_data["status"] == "SUBMITTED"
assert delivery_data["version"] == 1
print(f"5. Freelancer A submitted work ID {delivery_data['id']} to Admin successfully.")

# Verify MySQL Database Persistence
db.commit()
db_deliv = db.query(Delivery).filter(Delivery.id == delivery_data["id"]).first()
assert db_deliv is not None
assert db_deliv.submitted_by_user_id == fA_user.id
assert db_deliv.status == DeliveryStatus.SUBMITTED

db_b1_after = db.query(Booking).filter(Booking.id == b1_id).first()
assert db_b1_after.status == BookingStatus.DELIVERY_PENDING
print(f"6. MySQL Delivery verified: ID={db_deliv.id}, submitted_by_user_id={db_deliv.submitted_by_user_id}, booking_status={db_b1_after.status.value}")

# =========================================================================
# TEST C: CLIENT DIRECT ACCESS RESTRICTION & ADMIN VISIBILITY
# =========================================================================
print("\n--- TEST C: CLIENT DIRECT ACCESS RESTRICTION & ADMIN VISIBILITY ---")

# Client A attempts to directly retrieve raw freelancer submissions -> MUST FAIL (403 Forbidden)
resp_client_get_deliv = client.get(f"/api/v1/bookings/{b1_id}/deliveries", headers=headers_cA)
assert resp_client_get_deliv.status_code == 403
assert "pending Admin review" in resp_client_get_deliv.json()["detail"]
print("1. Client direct raw submission access BLOCKED (403 Forbidden). Client must wait for Admin review/delivery.")

# Admin retrieves all pending workspace submissions -> MUST SUCCEED
resp_admin_deliv = client.get("/api/v1/admin/deliveries", headers=headers_admin)
assert resp_admin_deliv.status_code == 200
admin_deliveries = resp_admin_deliv.json()
assert len(admin_deliveries) >= 1
target_admin_deliv = [d for d in admin_deliveries if d["id"] == delivery_data["id"]][0]
assert target_admin_deliv["booking_id"] == b1_id
print(f"2. Admin retrieved pending work submission ID {target_admin_deliv['id']} successfully.")

db.close()
print("\n>>> ALL STEP 7 FREELANCER WORK EXECUTION & SUBMISSION TESTS PASSED CLEANLY! <<<")
