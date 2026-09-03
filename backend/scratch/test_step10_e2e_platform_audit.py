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
from app.models.message import Conversation, Message, ConversationType
from app.models.delivery import Delivery, DeliveryStatus, AdminReviewStatus
from app.models.payment import Payment
from app.models.ledger import LedgerEntry
from app.models.payout import Payout
from app.models.payout_account import FreelancerPayoutAccount

client = TestClient(app)
db = SessionLocal()

rand_id = random.randint(100000, 999999)

print("=========================================================================")
print("STEP 10 — COMPLETE PLATFORM END-TO-END AUDIT & VERIFICATION")
print("=========================================================================")

# 1. CLIENT REGISTRATION & LOGIN
client_email = f"client_audit_{rand_id}@test.com"
client_reg = {
    "full_name": f"Audit Client {rand_id}",
    "email": client_email,
    "phone": f"+91{rand_id}001",
    "password": "Password123!",
    "role": "CLIENT"
}
resp_c_reg = client.post("/api/v1/auth/register", json=client_reg)
assert resp_c_reg.status_code in [200, 201]
c_data = resp_c_reg.json()
client_id = c_data["user"]["id"]

# Login Client
resp_c_login = client.post("/api/v1/auth/login", json={"identifier": client_email, "password": "Password123!"})
assert resp_c_login.status_code == 200
c_token = resp_c_login.json()["access_token"]
headers_client = {"Authorization": f"Bearer {c_token}"}
print(f"STAGE 1: Client Registration & Authentication PASS (User ID: {client_id})")

# 2. FREELANCER A REGISTRATION & PROFILE SETUP
fA_email = f"freeA_audit_{rand_id}@test.com"
fA_reg = {
    "full_name": f"Audit Freelancer A {rand_id}",
    "email": fA_email,
    "phone": f"+91{rand_id}002",
    "password": "Password123!",
    "role": "FREELANCER"
}
resp_fA_reg = client.post("/api/v1/auth/register", json=fA_reg)
assert resp_fA_reg.status_code in [200, 201]
fA_data = resp_fA_reg.json()
fA_user_id = fA_data["user"]["id"]

resp_fA_login = client.post("/api/v1/auth/login", json={"identifier": fA_email, "password": "Password123!"})
assert resp_fA_login.status_code == 200
fA_token = resp_fA_login.json()["access_token"]
headers_fA = {"Authorization": f"Bearer {fA_token}"}

# Create Freelancer A Profile
fA_profile = FreelancerProfile(
    user_id=fA_user_id,
    professional_title="Master Photographer",
    primary_profession=FreelancerProfession.PHOTOGRAPHER,
    city="Mumbai",
    is_profile_public=True
)
db.add(fA_profile)
db.commit()
db.refresh(fA_profile)
fA_profile_id = fA_profile.id
print(f"STAGE 2: Freelancer A Profile Setup PASS (Profile ID: {fA_profile_id})")

# FREELANCER B (FOR REASSIGNMENT TEST)
fB_email = f"freeB_audit_{rand_id}@test.com"
fB_reg = {
    "full_name": f"Audit Freelancer B {rand_id}",
    "email": fB_email,
    "phone": f"+91{rand_id}003",
    "password": "Password123!",
    "role": "FREELANCER"
}
resp_fB_reg = client.post("/api/v1/auth/register", json=fB_reg)
assert resp_fB_reg.status_code in [200, 201]
fB_data = resp_fB_reg.json()
fB_user_id = fB_data["user"]["id"]

resp_fB_login = client.post("/api/v1/auth/login", json={"identifier": fB_email, "password": "Password123!"})
assert resp_fB_login.status_code == 200
fB_token = resp_fB_login.json()["access_token"]
headers_fB = {"Authorization": f"Bearer {fB_token}"}

fB_profile = FreelancerProfile(
    user_id=fB_user_id,
    professional_title="Backup Photographer",
    primary_profession=FreelancerProfession.PHOTOGRAPHER,
    city="Mumbai",
    is_profile_public=True
)
db.add(fB_profile)
db.commit()
db.refresh(fB_profile)
fB_profile_id = fB_profile.id

# ADMIN USER SETUP
a_user = User(
    full_name=f"Audit Admin {rand_id}",
    email=f"admin_audit_{rand_id}@test.com",
    phone=f"+91{rand_id}004",
    password_hash="pass_hash",
    role=UserRole.ADMIN,
    is_active=True
)
db.add(a_user)
db.commit()
admin_token = create_token(a_user.id, "access", role="ADMIN")
headers_admin = {"Authorization": f"Bearer {admin_token}"}

# 3. CLIENT CREATES BOOKING
create_booking_payload = {
    "selected_freelancer_profile_id": fA_profile_id,
    "scheduled_date": (date.today() + timedelta(days=40)).isoformat(),
    "venue_name": "Grand Ballroom, Taj Lands End",
    "requirement_description": "Full Day Fashion Event Photography & Editing",
    "budget": 120000.0,
    "booking_type": "ON_SITE"
}
resp_book = client.post("/api/v1/client/bookings", json=create_booking_payload, headers=headers_client)
if resp_book.status_code != 201:
    print("BOOKING ERROR:", resp_book.status_code, resp_book.json())
assert resp_book.status_code == 201
b_data = resp_book.json()
booking_id = b_data["id"]
assert b_data["status"] == "REQUESTED"
print(f"STAGE 3: Client Booking Creation PASS (Booking ID: {booking_id})")

# 4. ADMIN INBOX & FREELANCER ASSIGNMENT
resp_inbox = client.get(f"/api/v1/admin/bookings/{booking_id}", headers=headers_admin)
assert resp_inbox.status_code == 200
assert resp_inbox.json()["id"] == booking_id

# Admin assigns Freelancer A
resp_assign_fA = client.post(
    f"/api/v1/admin/bookings/{booking_id}/assign",
    json={"freelancer_profile_id": fA_profile_id, "offered_payout_amount": 100000.0, "admin_notes": "First offer"},
    headers=headers_admin
)
assert resp_assign_fA.status_code == 200
assign_A_id = resp_assign_fA.json()["id"]
print(f"STAGE 4: Admin Freelancer Assignment PASS (Offer ID: {assign_A_id})")

# 5. FREELANCER A DECLINES WITH REASON & COUNTER-OFFER
decline_payload = {
    "decline_reason": "Date conflict on morning schedule",
    "counter_offer_amount": 110000.0,
    "counter_offer_notes": "Available for full day if budget is 1.1L"
}
resp_dec = client.post(f"/api/v1/freelancer/assignments/{assign_A_id}/reject", json=decline_payload, headers=headers_fA)
assert resp_dec.status_code == 200
assert resp_dec.json()["status"] == "DECLINED"
print("STAGE 5: Freelancer Decline & Counter-Offer PASS")

# 6. ADMIN REASSIGNMENT TO FREELANCER B
resp_reassign = client.post(
    f"/api/v1/admin/bookings/{booking_id}/assign",
    json={"freelancer_profile_id": fB_profile_id, "offered_payout_amount": 100000.0, "admin_notes": "Reassignment to Freelancer B"},
    headers=headers_admin
)
assert resp_reassign.status_code == 200
assign_B_id = resp_reassign.json()["id"]

# FREELANCER B ACCEPTS
resp_acc_B = client.post(f"/api/v1/freelancer/assignments/{assign_B_id}/accept", headers=headers_fB)
assert resp_acc_B.status_code == 200
print(f"STAGE 6: Admin Reassignment & Freelancer Acceptance PASS (Booking CONFIRMED with Freelancer B)")

# 7. CLIENT DEPOSIT PAYMENT
resp_dep_order = client.post(f"/api/v1/client/bookings/{booking_id}/payment/order", headers=headers_client)
assert resp_dep_order.status_code == 201
dep_order_data = resp_dep_order.json()

dep_verify_payload = {
    "razorpay_order_id": dep_order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_dep_audit_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_dep_verify = client.post(f"/api/v1/client/bookings/{booking_id}/payment/verify", json=dep_verify_payload, headers=headers_client)
assert resp_dep_verify.status_code == 200
print("STAGE 7: Client Deposit Payment PASS (State: DEPOSIT_PAID)")

# 8. FREELANCER B STARTS WORK & UPLOADS FILES
resp_start = client.post(f"/api/v1/freelancer/bookings/{booking_id}/start", headers=headers_fB)
assert resp_start.status_code == 200

work_file_v1 = ("fashion_raw_v1.mp4", b"Raw fashion video cut v1", "video/mp4")
resp_up_v1 = client.post(
    f"/api/v1/bookings/{booking_id}/files",
    files={"file": work_file_v1},
    data={"category": "OTHER", "description": "Raw cut v1"},
    headers=headers_fB
)
assert resp_up_v1.status_code == 201
file_v1_id = resp_up_v1.json()["id"]

# Freelancer B Submits Delivery V1
sub_payload_v1 = {
    "title": "Fashion Event Cut V1",
    "message": "Initial edit preview submitted for review.",
    "file_ids": [file_v1_id],
    "delivery_type": "PREVIEW"
}
resp_sub_v1 = client.post(f"/api/v1/freelancer/bookings/{booking_id}/deliveries", json=sub_payload_v1, headers=headers_fB)
assert resp_sub_v1.status_code == 201
deliv_v1_id = resp_sub_v1.json()["id"]
print(f"STAGE 8: Work Start & Delivery V1 Submission PASS (Delivery V1 ID: {deliv_v1_id})")

# 9. ADMIN REQUESTS CHANGES
resp_change_req = client.post(
    f"/api/v1/admin/deliveries/{deliv_v1_id}/request-changes",
    json={"feedback": "Please color match the runway segment and increase audio gain."},
    headers=headers_admin
)
assert resp_change_req.status_code == 200
print("STAGE 9: Admin Review & Change Request PASS")

# 10. FREELANCER RESUBMITS V2
work_file_v2 = ("fashion_master_v2.mp4", b"Master fashion video cut v2", "video/mp4")
resp_up_v2 = client.post(
    f"/api/v1/bookings/{booking_id}/files",
    files={"file": work_file_v2},
    data={"category": "OTHER", "description": "Master cut v2"},
    headers=headers_fB
)
assert resp_up_v2.status_code == 201
file_v2_id = resp_up_v2.json()["id"]

sub_payload_v2 = {
    "title": "Fashion Event Master V2",
    "message": "Adjusted color profile and boosted audio as requested.",
    "file_ids": [file_v2_id],
    "delivery_type": "FINAL"
}
resp_sub_v2 = client.post(f"/api/v1/freelancer/bookings/{booking_id}/deliveries", json=sub_payload_v2, headers=headers_fB)
assert resp_sub_v2.status_code == 201
deliv_v2_id = resp_sub_v2.json()["id"]
print(f"STAGE 10: Freelancer Resubmission V2 PASS (Delivery V2 ID: {deliv_v2_id})")

# 11. ADMIN APPROVES DELIVERY V2
resp_app_v2 = client.post(f"/api/v1/admin/deliveries/{deliv_v2_id}/approve", headers=headers_admin)
assert resp_app_v2.status_code == 200
print("STAGE 11: Admin Approval of Delivery V2 PASS")

# 12. CLIENT VIEWS APPROVED DELIVERY & PAYS FINAL BALANCE
resp_c_app_deliv = client.get(f"/api/v1/client/bookings/{booking_id}/approved-deliveries", headers=headers_client)
assert resp_c_app_deliv.status_code == 200
assert len(resp_c_app_deliv.json()) == 1
assert resp_c_app_deliv.json()[0]["id"] == deliv_v2_id

resp_final_order = client.post(f"/api/v1/client/bookings/{booking_id}/payment/order", headers=headers_client)
assert resp_final_order.status_code == 201
final_order_data = resp_final_order.json()

final_verify_payload = {
    "razorpay_order_id": final_order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_final_audit_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_final_verify = client.post(f"/api/v1/client/bookings/{booking_id}/payment/verify", json=final_verify_payload, headers=headers_client)
assert resp_final_verify.status_code == 200
print("STAGE 12: Client Delivery View & Final Balance Payment PASS (State: FULLY_PAID)")

# 13. FREELANCER EARNINGS RELEASE & PAYOUT REQUEST
resp_earn_B = client.get("/api/v1/freelancer/earnings", headers=headers_fB)
assert resp_earn_B.status_code == 200
earn_B_summary = resp_earn_B.json()
assert float(earn_B_summary["available"]) == 108000.0  # 120,000 gross - 10% commission = 108,000

# Link payout bank account for Freelancer B
client.post("/api/v1/freelancer/earnings/payout-account", json={"provider_account_id": f"acc_fB_{rand_id}", "account_holder_name": f"Freelancer B {rand_id}"}, headers=headers_fB)

# Request payout
resp_payout_B = client.post("/api/v1/freelancer/payouts/request", json={"amount": 108000.0}, headers=headers_fB)
assert resp_payout_B.status_code in [200, 201]
payout_B_data = resp_payout_B.json()
assert payout_B_data["status"] == "PROCESSED"
print("STAGE 13: Freelancer Earnings Release & Payout Request PASS")

# 14. SECURITY & AUTHORIZATION CROSS-ROLE TESTS
print("\n--- SECURITY & AUTHORIZATION CROSS-ROLE VERIFICATION ---")

# Client cannot access Admin booking inbox
assert client.get("/api/v1/admin/bookings", headers=headers_client).status_code == 403

# Freelancer A (declined & non-assigned) cannot access Freelancer B's workspace files or delivery submit
assert client.get(f"/api/v1/freelancer/bookings/{booking_id}/deliveries", headers=headers_fA).status_code == 403

# Client cannot access raw unapproved submissions
assert client.get(f"/api/v1/bookings/{booking_id}/deliveries", headers=headers_client).status_code == 403

# Client cannot request payout
assert client.post("/api/v1/freelancer/payouts/request", json={"amount": 1000.0}, headers=headers_client).status_code == 403

print("STAGE 14: Role Security & Authorization Verification PASS")

db.close()
print("\n=========================================================================")
print(">>> COMPLETE PLATFORM END-TO-END AUDIT PASSED 100% CLEANLY! <<<")
print("=========================================================================")
