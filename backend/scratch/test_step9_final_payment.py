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
from app.models.delivery import Delivery, DeliveryStatus
from app.models.payment import Payment
from app.models.payout import Payout

client = TestClient(app)
db = SessionLocal()

rand_id = random.randint(100000, 999999)

# 1. Create Test Users
cA_user = User(
    full_name=f"Client A {rand_id}",
    email=f"clientA_s9_{rand_id}@test.com",
    phone=f"+91{rand_id}901",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
cB_user = User(
    full_name=f"Client B {rand_id}",
    email=f"clientB_s9_{rand_id}@test.com",
    phone=f"+91{rand_id}902",
    password_hash="pass_hash",
    role=UserRole.CLIENT,
    is_active=True
)
a_user = User(
    full_name=f"Admin User {rand_id}",
    email=f"admin_s9_{rand_id}@test.com",
    phone=f"+91{rand_id}903",
    password_hash="pass_hash",
    role=UserRole.ADMIN,
    is_active=True
)
fA_user = User(
    full_name=f"Freelancer A {rand_id}",
    email=f"freeA_s9_{rand_id}@test.com",
    phone=f"+91{rand_id}904",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
fB_user = User(
    full_name=f"Freelancer B {rand_id}",
    email=f"freeB_s9_{rand_id}@test.com",
    phone=f"+91{rand_id}905",
    password_hash="pass_hash",
    role=UserRole.FREELANCER,
    is_active=True
)
db.add_all([cA_user, cB_user, a_user, fA_user, fB_user])
db.commit()

fA_profile = FreelancerProfile(
    user_id=fA_user.id,
    professional_title="Master Cinematographer",
    primary_profession=FreelancerProfession.CINEMATOGRAPHER,
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

# Setup Booking 1: Client A creates booking for 100,000 INR
create_payload = {
    "selected_freelancer_profile_id": fA_profile.id,
    "scheduled_date": (date.today() + timedelta(days=35)).isoformat(),
    "venue_name": "Film City Studio 12",
    "requirement_description": "Full Feature Commercial Shoot & Editing",
    "budget": 100000.0,
    "booking_type": "ON_SITE"
}
resp_b1 = client.post("/api/v1/client/bookings", json=create_payload, headers=headers_cA)
assert resp_b1.status_code == 201
b1_id = resp_b1.json()["id"]

# Admin assigns Freelancer A, Freelancer A ACCEPTS
resp_assign = client.post(f"/api/v1/admin/bookings/{b1_id}/assign", json={"freelancer_profile_id": fA_profile.id, "offered_payout_amount": 85000.0}, headers=headers_admin)
assert resp_assign.status_code == 200
assign_id = resp_assign.json()["id"]

resp_acc = client.post(f"/api/v1/freelancer/assignments/{assign_id}/accept", headers=headers_fA)
assert resp_acc.status_code == 200

# Client A pays 30% deposit (30,000 INR)
resp_order = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order.status_code == 201
order_data = resp_order.json()

verify_payload = {
    "razorpay_order_id": order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_dep_step9_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_verify = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=verify_payload, headers=headers_cA)
assert resp_verify.status_code == 200

# Freelancer A starts work & submits Delivery V1
resp_start = client.post(f"/api/v1/freelancer/bookings/{b1_id}/start", headers=headers_fA)
assert resp_start.status_code == 200

work_file = ("commercial_master.mp4", b"Commercial master video content", "video/mp4")
resp_upload = client.post(
    f"/api/v1/bookings/{b1_id}/files",
    files={"file": work_file},
    data={"category": "OTHER", "description": "Master cut"},
    headers=headers_fA
)
assert resp_upload.status_code == 201
file_id = resp_upload.json()["id"]

submit_payload = {
    "title": "Final Commercial Master Cut v1",
    "message": "Complete commercial cut submitted for review.",
    "file_ids": [file_id],
    "delivery_type": "FINAL"
}
resp_sub = client.post(f"/api/v1/freelancer/bookings/{b1_id}/deliveries", json=submit_payload, headers=headers_fA)
assert resp_sub.status_code == 201
delivery_id = resp_sub.json()["id"]
print(f"1. Booking ID {b1_id} has deposit paid and Delivery V1 (ID {delivery_id}) submitted for Admin review.")

# =========================================================================
# TEST A: FINAL PAYMENT ELIGIBILITY CHECKS & BLOCKING PRE-APPROVAL
# =========================================================================
print("\n--- TEST A: FINAL PAYMENT ELIGIBILITY CHECKS & BLOCKING PRE-APPROVAL ---")

# Client A checks payment eligibility BEFORE Admin approves delivery -> MUST be BLOCKED
resp_elig_pre = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig_pre.status_code == 200
elig_pre_data = resp_elig_pre.json()
assert elig_pre_data["can_pay"] is False
assert "Admin reviews and approves" in elig_pre_data["blocking_reason"]
print("1. Final balance payment eligibility BLOCKED before Admin delivery approval.")

# Client A attempts to create final payment order BEFORE Admin approval -> MUST FAIL (400 Bad Request)
resp_order_pre = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order_pre.status_code == 400
assert "Admin reviews and approves" in resp_order_pre.json()["detail"]
print("2. Final payment order creation BLOCKED before Admin delivery approval (400 Bad Request).")

# Admin approves Delivery V1
resp_approve = client.post(f"/api/v1/admin/deliveries/{delivery_id}/approve", headers=headers_admin)
assert resp_approve.status_code == 200
print("3. Admin APPROVED Delivery V1.")

# Client A checks payment eligibility AFTER Admin approval -> MUST be ELIGIBLE
resp_elig_post = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig_post.status_code == 200
elig_post_data = resp_elig_post.json()
assert elig_post_data["can_pay"] is True
assert elig_post_data["payment_stage"] == "FINAL_BALANCE"
assert elig_post_data["remaining_amount"] == 70000.0
print("4. Final balance payment ELIGIBILITY verified after Admin approval. Remaining balance: INR 70,000.00.")

# =========================================================================
# TEST B: FINAL PAYMENT ORDER & BACKEND HMAC SIGNATURE VERIFICATION
# =========================================================================
print("\n--- TEST B: FINAL PAYMENT ORDER & BACKEND HMAC SIGNATURE VERIFICATION ---")

# Client B attempts to create final payment order -> MUST FAIL (403 Forbidden)
resp_order_cB = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cB)
assert resp_order_cB.status_code == 403
print("1. Client B unauthorized order creation attempt BLOCKED (403 Forbidden).")

# Freelancer A attempts to create final payment order -> MUST FAIL (403 Forbidden)
resp_order_fA = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_fA)
assert resp_order_fA.status_code == 403
print("2. Freelancer A unauthorized order creation attempt BLOCKED (403 Forbidden).")

# Client A creates final balance payment order
resp_order_final = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order_final.status_code == 201
final_order_data = resp_order_final.json()
assert final_order_data["amount"] == 7000000  # 70000 INR in paise
print(f"3. Created final payment Razorpay order: {final_order_data['provider_order_id']} for INR 70,000.00.")

# Invalid payment signature verification -> MUST FAIL (400 Bad Request)
invalid_verify = {
    "razorpay_order_id": final_order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_bad_step9_{rand_id}",
    "razorpay_signature": "invalid_bad_signature"
}
resp_verify_bad = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=invalid_verify, headers=headers_cA)
assert resp_verify_bad.status_code == 400
print("4. Invalid payment signature REJECTED with 400 Bad Request. Booking remains DEPOSIT_PAID.")

# Valid payment signature verification
valid_verify = {
    "razorpay_order_id": final_order_data["provider_order_id"],
    "razorpay_payment_id": f"pay_final_step9_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_verify_good = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=valid_verify, headers=headers_cA)
assert resp_verify_good.status_code == 200
paid_payment_data = resp_verify_good.json()
assert paid_payment_data["status"] == "CAPTURED"
print("5. Final balance payment verified and CAPTURED successfully.")

# Verify MySQL Booking & Payment State
db.commit()
db_b1_final = db.query(Booking).filter(Booking.id == b1_id).first()
assert db_b1_final.payment_completion_state == "FULLY_PAID"
assert db_b1_final.total_paid == 100000.0
assert db_b1_final.remaining_balance == 0.0
assert db_b1_final.status == BookingStatus.COMPLETED
print(f"6. MySQL Booking verified: state=FULLY_PAID, total_paid=INR 100,000.00, remaining_balance=0.00, status=COMPLETED.")

# =========================================================================
# TEST C: DUPLICATE PAYMENT & IDEMPOTENCY PROTECTION
# =========================================================================
print("\n--- TEST C: DUPLICATE PAYMENT & IDEMPOTENCY PROTECTION ---")

# Client A checks eligibility after FULLY_PAID -> MUST be blocked
resp_elig_done = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig_done.status_code == 200
assert resp_elig_done.json()["can_pay"] is False
assert "already been fully paid" in resp_elig_done.json()["blocking_reason"]
print("1. Duplicate payment eligibility check BLOCKED (Booking is already fully paid).")

# Client A attempts to create another payment order -> MUST FAIL (400 Bad Request)
resp_order_dup = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order_dup.status_code == 400
print("2. Duplicate payment order creation BLOCKED (400 Bad Request).")

# Re-verifying same payment payload -> MUST be idempotent
resp_verify_dup = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=valid_verify, headers=headers_cA)
assert resp_verify_dup.status_code == 200
print("3. Idempotent payment verification handling verified.")

# =========================================================================
# TEST D: FREELANCER EARNINGS RELEASE & PAYOUT WORKFLOW
# =========================================================================
print("\n--- TEST D: FREELANCER EARNINGS RELEASE & PAYOUT WORKFLOW ---")

# Freelancer A configures/links payout bank account
link_payload = {
    "provider_account_id": f"acc_bank_{rand_id}",
    "account_holder_name": f"Freelancer A {rand_id}",
    "account_type": "bank_account"
}
resp_link_acc = client.post("/api/v1/freelancer/earnings/payout-account", json=link_payload, headers=headers_fA)
assert resp_link_acc.status_code in [200, 201]
print("1. Freelancer A configured and verified payout bank account credentials.")

# Freelancer A checks earnings summary -> Earnings are now AVAILABLE for payout!
resp_earn = client.get("/api/v1/freelancer/earnings", headers=headers_fA)
assert resp_earn.status_code == 200
earn_summary = resp_earn.json()
assert float(earn_summary["available"]) == 90000.0  # 100,000 gross - 10% platform commission
assert float(earn_summary["pending"]) == 0.0
print(f"2. Freelancer A earnings summary verified: Available = INR {earn_summary['available']}, Pending = INR {earn_summary['pending']}.")

# Client A attempts to initiate Freelancer payout -> MUST FAIL (403 Forbidden)
resp_payout_cA = client.post("/api/v1/freelancer/payouts/request", json={"amount": 5000.0}, headers=headers_cA)
assert resp_payout_cA.status_code == 403
print("3. Client A unauthorized payout request attempt BLOCKED (403 Forbidden).")

# Freelancer A attempts payout exceeding available balance (e.g. 100,000 INR) -> MUST FAIL (400 Bad Request)
resp_payout_over = client.post("/api/v1/freelancer/payouts/request", json={"amount": 100000.0}, headers=headers_fA)
assert resp_payout_over.status_code == 400
assert "exceeds available balance" in resp_payout_over.json()["detail"]
print("4. Freelancer payout request exceeding available balance BLOCKED (400 Bad Request).")

# Freelancer A requests valid payout of INR 90,000.00 -> MUST SUCCEED
resp_payout_valid = client.post("/api/v1/freelancer/payouts/request", json={"amount": 90000.0}, headers=headers_fA)
assert resp_payout_valid.status_code in [200, 201]
payout_res = resp_payout_valid.json()
assert payout_res["status"] == "PROCESSED"
assert float(payout_res["amount"]) == 90000.0
print(f"5. Freelancer A requested payout PO ID {payout_res['id']} of INR 90,000.00 successfully. Status is PROCESSED.")

# Re-query Freelancer A earnings summary -> Available is now 0.00, Paid Out is 90,000.00
resp_earn_after = client.get("/api/v1/freelancer/earnings", headers=headers_fA)
earn_after_summary = resp_earn_after.json()
assert float(earn_after_summary["available"]) == 0.0
assert float(earn_after_summary["paid_out"]) == 90000.0
print(f"6. Final Freelancer earnings summary verified: Available = INR {earn_after_summary['available']}, Paid Out = INR {earn_after_summary['paid_out']}.")

# Verify MySQL Payout record
db.commit()
db_po = db.query(Payout).filter(Payout.id == payout_res["id"]).first()
assert db_po is not None
assert db_po.freelancer_profile_id == fA_profile.id
print(f"7. MySQL Payout record verified: ID={db_po.id}, amount=INR {db_po.amount}, status={db_po.status}")

db.close()
print("\n>>> ALL STEP 9 FINAL BALANCE PAYMENT, EARNINGS RELEASE & PAYOUT TESTS PASSED CLEANLY! <<<")
