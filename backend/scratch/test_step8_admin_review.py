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
from app.models.delivery import Delivery, DeliveryStatus, AdminReviewStatus

client = TestClient(app)
db = SessionLocal()

rand_id = random.randint(100000, 999999)

# 1. Create Test Users
cA_user = User(
    full_name=f"Client A {rand_id}",
    email=f"clientA_s8_{rand_id}@test.com",
    phone=f"+91{rand_id}801",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
cB_user = User(
    full_name=f"Client B {rand_id}",
    email=f"clientB_s8_{rand_id}@test.com",
    phone=f"+91{rand_id}802",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
a_user = User(
    full_name=f"Admin User {rand_id}",
    email=f"admin_s8_{rand_id}@test.com",
    phone=f"+91{rand_id}803",
    password_hash="pass_hash",
    role=UserRole.ADMIN,
    is_active=True
)
fA_user = User(
    full_name=f"Freelancer A {rand_id}",
    email=f"freeA_s8_{rand_id}@test.com",
    phone=f"+91{rand_id}804",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
fB_user = User(
    full_name=f"Freelancer B {rand_id}",
    email=f"freeB_s8_{rand_id}@test.com",
    phone=f"+91{rand_id}805",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
db.add_all([cA_user, cB_user, a_user, fA_user, fB_user])
db.commit()

fA_profile = FreelancerProfile(
    user_id=fA_user.id,
    professional_title="Lead Colorist",
    primary_profession=FreelancerProfession.COLOR_GRADER,
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

# Setup Booking 1: Client A creates booking, Admin assigns Freelancer A, Freelancer A ACCEPTS, Client A pays deposit, Freelancer A starts work
create_payload = {
    "selected_freelancer_profile_id": fA_profile.id,
    "scheduled_date": (date.today() + timedelta(days=30)).isoformat(),
    "venue_name": "Studio 9, Lower Parel",
    "requirement_description": "Full Film Color Grading & Mastering",
    "budget": 75000.0,
    "booking_type": "REMOTE"
}
resp_b1 = client.post("/api/v1/client/bookings", json=create_payload, headers=headers_cA)
assert resp_b1.status_code == 201
b1_id = resp_b1.json()["id"]

# Admin assigns Freelancer A
resp_assign = client.post(f"/api/v1/admin/bookings/{b1_id}/assign", json={"freelancer_profile_id": fA_profile.id, "offered_payout_amount": 60000.0}, headers=headers_admin)
assert resp_assign.status_code == 200
assign_id = resp_assign.json()["id"]

# Freelancer A ACCEPTS
resp_acc = client.post(f"/api/v1/freelancer/assignments/{assign_id}/accept", headers=headers_fA)
assert resp_acc.status_code == 200

# Client A pays 30% deposit
resp_order = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order.status_code == 201
order_data = resp_order.json()

verify_payload = {
    "razorpay_order_id": order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_test_step8_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_verify = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=verify_payload, headers=headers_cA)
assert resp_verify.status_code == 200

# Freelancer A starts work
resp_start = client.post(f"/api/v1/freelancer/bookings/{b1_id}/start", headers=headers_fA)
assert resp_start.status_code == 200
print(f"1. Booking ID {b1_id} is IN_PROGRESS after deposit payment and work start.")

# =========================================================================
# FLOW A: ADMIN REQUEST CHANGES WORKFLOW
# =========================================================================
print("\n--- FLOW A: ADMIN REQUEST CHANGES WORKFLOW ---")

# Freelancer A uploads Work File V1 and submits Delivery V1
work_file_v1 = ("draft_v1.mp4", b"Draft video v1 binary data", "video/mp4")
resp_upload_v1 = client.post(
    f"/api/v1/bookings/{b1_id}/files",
    files={"file": work_file_v1},
    data={"category": "OTHER", "description": "Draft cut v1"},
    headers=headers_fA
)
assert resp_upload_v1.status_code == 201
file_id_v1 = resp_upload_v1.json()["id"]

submit_payload_v1 = {
    "title": "Initial Draft Cut v1",
    "message": "Here is the initial color grade draft for review.",
    "file_ids": [file_id_v1],
    "delivery_type": "PREVIEW"
}
resp_sub_v1 = client.post(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", json=submit_payload_v1, headers=headers_fA)
assert resp_sub_v1.status_code == 201
v1_delivery = resp_sub_v1.json()
v1_id = v1_delivery["id"]
assert v1_delivery["version"] == 1
print(f"1. Freelancer A submitted Delivery V1 (ID {v1_id}).")

# Client A checks approved deliveries BEFORE Admin review -> MUST return empty list []
resp_client_app_v1 = client.get(f"/api/v1/client/bookings/{b1_id}/approved-deliveries", headers=headers_cA)
assert resp_client_app_v1.status_code == 200
assert len(resp_client_app_v1.json()) == 0
print("2. Client approved deliveries list is EMPTY before Admin review.")

# Client A attempts to access raw delivery -> MUST FAIL (403 Forbidden)
resp_client_raw = client.get(f"/api/v1/bookings/{b1_id}/deliveries", headers=headers_cA)
assert resp_client_raw.status_code == 403
print("3. Client direct raw submission access BLOCKED (403 Forbidden).")

# Client A attempts to request changes on delivery as non-admin -> MUST FAIL (403 Forbidden)
resp_client_req = client.post(f"/api/v1/admin/deliveries/{v1_id}/request-changes", json={"feedback": "Client attempt"}, headers=headers_cA)
assert resp_client_req.status_code == 403
print("4. Client attempt to request changes via Admin endpoint BLOCKED (403 Forbidden).")

# Admin requests changes on Delivery V1
change_feedback = "Please adjust contrast in low-light scenes and fix skin tones in closeups."
resp_admin_req = client.post(f"/api/v1/admin/deliveries/{v1_id}/request-changes", json={"feedback": change_feedback}, headers=headers_admin)
assert resp_admin_req.status_code == 200
req_data = resp_admin_req.json()
assert req_data["status"] == "REVISION_REQUESTED"
assert req_data["admin_review_status"] == "REVISION_REQUIRED"
assert req_data["admin_feedback_to_freelancer"] == change_feedback
print("5. Admin requested changes on Delivery V1. Status updated to REVISION_REQUESTED.")

# Verify MySQL Booking status returned to IN_PROGRESS so Freelancer can rework
db.commit()
db_b1_rework = db.query(Booking).filter(Booking.id == b1_id).first()
assert db_b1_rework.status == BookingStatus.IN_PROGRESS

# Verify Delivery V1 is PRESERVED in MySQL (not deleted or overwritten!)
db_v1 = db.query(Delivery).filter(Delivery.id == v1_id).first()
assert db_v1 is not None
assert db_v1.version == 1
assert db_v1.admin_feedback_to_freelancer == change_feedback
print("6. MySQL Delivery V1 preserved with Admin feedback intact.")

# Freelancer A fetches submission history -> sees V1 and Admin feedback
resp_free_hist = client.get(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", headers=headers_fA)
assert resp_free_hist.status_code == 200
hist_items = resp_free_hist.json()
assert len(hist_items) == 1
assert hist_items[0]["admin_feedback_to_freelancer"] == change_feedback
print("7. Freelancer A retrieved submission history and viewed Admin change feedback.")

# Freelancer A uploads Work File V2 and submits Delivery V2
work_file_v2 = ("master_v2.mp4", b"Revised master video v2 binary data", "video/mp4")
resp_upload_v2 = client.post(
    f"/api/v1/bookings/{b1_id}/files",
    files={"file": work_file_v2},
    data={"category": "OTHER", "description": "Master cut v2"},
    headers=headers_fA
)
assert resp_upload_v2.status_code == 201
file_id_v2 = resp_upload_v2.json()["id"]

submit_payload_v2 = {
    "title": "Revised Master Cut v2",
    "message": "Adjusted low-light contrast and refined skin tones as requested.",
    "file_ids": [file_id_v2],
    "delivery_type": "FINAL"
}
resp_sub_v2 = client.post(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", json=submit_payload_v2, headers=headers_fA)
assert resp_sub_v2.status_code == 201
v2_delivery = resp_sub_v2.json()
v2_id = v2_delivery["id"]
assert v2_delivery["version"] == 2
print(f"8. Freelancer A submitted Delivery V2 (ID {v2_id}).")

# Verify MySQL contains BOTH Version 1 and Version 2 (Version history preserved!)
db.commit()
all_delivs = db.query(Delivery).filter(Delivery.booking_id == b1_id).order_by(Delivery.version.asc()).all()
assert len(all_delivs) == 2
assert all_delivs[0].version == 1 and all_delivs[0].id == v1_id
assert all_delivs[1].version == 2 and all_delivs[1].id == v2_id
print(f"9. MySQL Version History verified: Found {len(all_delivs)} distinct versions (V1 ID={v1_id}, V2 ID={v2_id}).")

# =========================================================================
# FLOW B: ADMIN APPROVAL & CONTROLLED CLIENT DELIVERY
# =========================================================================
print("\n--- FLOW B: ADMIN APPROVAL & CONTROLLED CLIENT DELIVERY ---")

# Client B attempts to access Client A's approved deliveries -> MUST FAIL (403 Forbidden)
resp_clientB_app = client.get(f"/api/v1/client/bookings/{b1_id}/approved-deliveries", headers=headers_cB)
assert resp_clientB_app.status_code == 403
print("1. Client B unauthorized access to Client A's deliveries BLOCKED (403 Forbidden).")

# Client A attempts to approve delivery via Admin endpoint -> MUST FAIL (403 Forbidden)
resp_client_app_attempt = client.post(f"/api/v1/admin/deliveries/{v2_id}/approve", headers=headers_cA)
assert resp_client_app_attempt.status_code == 403
print("2. Client attempt to approve delivery via Admin endpoint BLOCKED (403 Forbidden).")

# Admin approves Delivery V2
resp_admin_app = client.post(f"/api/v1/admin/deliveries/{v2_id}/approve", headers=headers_admin)
assert resp_admin_app.status_code == 200
app_data = resp_admin_app.json()
assert app_data["status"] == "APPROVED"
assert app_data["admin_review_status"] == "APPROVED"
assert app_data["shared_with_client_at"] is not None
print("3. Admin APPROVED Delivery V2. Status is APPROVED and shared_with_client_at is set.")

# Admin attempts to re-approve already approved delivery -> MUST FAIL (400 Bad Request)
resp_re_app = client.post(f"/api/v1/admin/deliveries/{v2_id}/approve", headers=headers_admin)
assert resp_re_app.status_code == 400
assert "already been approved" in resp_re_app.json()["detail"]
print("4. Admin duplicate approval attempt BLOCKED (400 Bad Request).")

# Client A fetches approved deliveries -> MUST SUCCEED and return ONLY approved Delivery V2
resp_client_approved = client.get(f"/api/v1/client/bookings/{b1_id}/approved-deliveries", headers=headers_cA)
assert resp_client_approved.status_code == 200
client_deliv_items = resp_client_approved.json()
assert len(client_deliv_items) == 1
assert client_deliv_items[0]["id"] == v2_id
assert client_deliv_items[0]["version"] == 2
assert client_deliv_items[0]["status"] == "APPROVED"
print("5. Client A retrieved curated approved delivery (Version 2) successfully.")

# Client A is STILL BLOCKED from raw direct access to unapproved or raw endpoints
resp_client_raw_still = client.get(f"/api/v1/bookings/{b1_id}/deliveries", headers=headers_cA)
assert resp_client_raw_still.status_code == 403
print("6. Client A direct raw endpoint access STILL BLOCKED (403 Forbidden). Only controlled curated delivery is accessible.")

# Verify Freelancer earnings are STILL locked (Payout attempt fails 400)
resp_payout_attempt = client.post("/api/v1/freelancer/payouts/request", json={"amount": 1000.0}, headers=headers_fA)
assert resp_payout_attempt.status_code == 400
print("7. Freelancer payout attempt STILL BLOCKED (Advance earnings locked in PENDING status).")

db.close()
print("\n>>> ALL STEP 8 ADMIN REVIEW, CHANGE REQUESTS & CONTROLLED CLIENT DELIVERY TESTS PASSED CLEANLY! <<<")
