import os
import sys
import random
from datetime import date, timedelta
from decimal import Decimal

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import create_token
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.ledger import LedgerEntry

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
db.add_all([cA_user, cB_user, a_user, fA_user])
db.commit()

fA_profile = FreelancerProfile(
    user_id=fA_user.id,
    professional_title="Commercial Videographer",
    primary_profession=FreelancerProfession.VIDEOGRAPHER,
    city="Mumbai",
    is_profile_public=True
)
db.add(fA_profile)
db.commit()

cA_token = create_token(cA_user.id, "access", role="CLIENT")
cB_token = create_token(cB_user.id, "access", role="CLIENT")
admin_token = create_token(a_user.id, "access", role="ADMIN")
fA_token = create_token(fA_user.id, "access", role="FREELANCER")

headers_cA = {"Authorization": f"Bearer {cA_token}"}
headers_cB = {"Authorization": f"Bearer {cB_token}"}
headers_admin = {"Authorization": f"Bearer {admin_token}"}
headers_fA = {"Authorization": f"Bearer {fA_token}"}

print(f"SETUP COMPLETE:")
print(f"  Client A ID: {cA_user.id}")
print(f"  Client B ID: {cB_user.id}")
print(f"  Admin ID: {a_user.id}")
print(f"  Freelancer A Profile ID: {fA_profile.id}")

# =========================================================================
# TEST A: PAYMENT ELIGIBILITY FOR NON-CONFIRMED BOOKINGS
# =========================================================================
print("\n--- TEST A: PAYMENT ELIGIBILITY FOR NON-CONFIRMED BOOKINGS ---")
create_payload_A = {
    "selected_freelancer_profile_id": fA_profile.id,
    "scheduled_date": (date.today() + timedelta(days=20)).isoformat(),
    "venue_name": "Studio A, Mumbai",
    "requirement_description": "Commercial Videography Project",
    "budget": 50000.0,
    "booking_type": "REMOTE"
}
resp_b1 = client.post("/api/v1/client/bookings", json=create_payload_A, headers=headers_cA)
assert resp_b1.status_code == 201
b1_id = resp_b1.json()["id"]

# Status is REQUESTED -> Check eligibility
resp_elig1 = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig1.status_code == 200
elig1 = resp_elig1.json()
assert elig1["can_pay"] is False
assert "pending admin review" in elig1["blocking_reason"]
print("1. Eligibility blocked for REQUESTED booking.")

# Attempt order creation -> MUST fail (400 Bad Request)
resp_order_fail1 = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order_fail1.status_code == 400
print("2. Payment order creation BLOCKED for REQUESTED booking (400 Bad Request).")

# Admin assigns Freelancer -> Status becomes MATCHING_IN_PROGRESS
assign_payload = {
    "freelancer_profile_id": fA_profile.id,
    "offered_payout_amount": 40000.0,
    "admin_notes": "Assigned for commercial shoot."
}
resp_assign1 = client.post(f"/api/v1/admin/bookings/{b1_id}/assign", json=assign_payload, headers=headers_admin)
assert resp_assign1.status_code == 200
assign1_id = resp_assign1.json()["id"]

# Status is MATCHING_IN_PROGRESS -> Check eligibility
resp_elig2 = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig2.status_code == 200
elig2 = resp_elig2.json()
assert elig2["can_pay"] is False
assert "accepts assignment" in elig2["blocking_reason"]
print("3. Eligibility blocked for MATCHING_IN_PROGRESS booking.")

# Attempt order creation -> MUST fail (400 Bad Request)
resp_order_fail2 = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order_fail2.status_code == 400
print("4. Payment order creation BLOCKED for MATCHING_IN_PROGRESS booking (400 Bad Request).")

# =========================================================================
# TEST B: SUCCESSFUL ADVANCE DEPOSIT PAYMENT & LOCKED FREELANCER EARNING
# =========================================================================
print("\n--- TEST B: SUCCESSFUL ADVANCE DEPOSIT PAYMENT & LOCKED FREELANCER EARNING ---")

# Freelancer ACCEPTS assignment -> Booking status becomes CONFIRMED
resp_acc1 = client.post(f"/api/v1/freelancer/assignments/{assign1_id}/accept", headers=headers_fA)
assert resp_acc1.status_code == 200
print("1. Freelancer A accepted assignment. Booking is now CONFIRMED.")

# Check eligibility -> MUST BE ELIGIBLE FOR DEPOSIT
resp_elig3 = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig3.status_code == 200
elig3 = resp_elig3.json()
assert elig3["can_pay"] is True
assert elig3["payment_stage"] == "DEPOSIT"
deposit_amount = elig3["remaining_amount"]
assert deposit_amount == 15000.0  # 30% of 50,000 = 15,000
print(f"2. Eligibility verified for CONFIRMED booking. Stage: {elig3['payment_stage']}, Advance Deposit: INR {deposit_amount}")

# Client initiates payment order
resp_order1 = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_cA)
assert resp_order1.status_code == 201
order1_data = resp_order1.json()
provider_order_id = order1_data["provider_order_id"]
print(f"3. Created payment order: {order1_data['payment_number']} (Razorpay Order ID: {provider_order_id})")

# Client verifies payment signature (using test bypass signature)
verify_payload = {
    "razorpay_order_id": provider_order_id,
    "razorpay_payment_id": f"pay_test_{rand_id}",
    "razorpay_signature": "mock_signature_bypass_for_pytest"
}
resp_verify1 = client.post(f"/api/v1/client/bookings/{b1_id}/payment/verify", json=verify_payload, headers=headers_cA)
assert resp_verify1.status_code == 200
p1_verified = resp_verify1.json()
assert p1_verified["status"] == "CAPTURED"
assert p1_verified["payment_type"] == "DEPOSIT"
print("4. Payment verified and captured successfully.")

# Verify MySQL Database Records
db.commit()
db_b1 = db.query(Booking).filter(Booking.id == b1_id).first()
assert db_b1.payment_completion_state == "DEPOSIT_PAID"
assert float(db_b1.deposit_paid_amount) == 15000.0
assert float(db_b1.remaining_balance) == 35000.0

db_p1 = db.query(Payment).filter(Payment.booking_id == b1_id, Payment.status == "CAPTURED").first()
assert db_p1 is not None
assert db_p1.payment_type == "DEPOSIT"
assert float(db_p1.gross_amount) == 15000.0

# Verify LedgerEntry for Freelancer A: MUST be status = PENDING (LOCKED!)
ledger_entries = db.query(LedgerEntry).filter(LedgerEntry.booking_id == b1_id).all()
freelancer_credit_entry = [e for e in ledger_entries if e.entry_type == "ADVANCE_CREDIT"][0]
assert freelancer_credit_entry.status == "PENDING"
print(f"5. MySQL Ledger entry verified: type={freelancer_credit_entry.entry_type}, amount=INR {freelancer_credit_entry.amount}, status={freelancer_credit_entry.status} (LOCKED).")

# Freelancer checks earnings API
resp_earnings_fA = client.get("/api/v1/freelancer/earnings", headers=headers_fA)
assert resp_earnings_fA.status_code == 200
earnings_fA = resp_earnings_fA.json()
assert float(earnings_fA["pending"]) > 0
assert float(earnings_fA["available"]) == 0.0
print(f"6. Freelancer earnings API verified: Pending = INR {earnings_fA['pending']}, Available = INR {earnings_fA['available']}")

# Freelancer attempts payout request -> MUST FAIL (400 Bad Request)
resp_payout_fail = client.post("/api/v1/freelancer/payouts/request", json={"amount": 5000.0}, headers=headers_fA)
assert resp_payout_fail.status_code == 400
print("7. FREELANCER PAYOUT ATTEMPT BLOCKED: Cannot withdraw pending advance earnings (400 Bad Request).")

# =========================================================================
# TEST C: DUPLICATE ADVANCE PAYMENT PREVENTION
# =========================================================================
print("\n--- TEST C: DUPLICATE ADVANCE PAYMENT PREVENTION ---")

# Client attempts to pay advance deposit again for b1
resp_elig_dup = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cA)
assert resp_elig_dup.status_code == 200
elig_dup = resp_elig_dup.json()
# Stage should transition to FINAL_BALANCE with preview blocking
assert elig_dup["payment_stage"] == "FINAL_BALANCE"
assert elig_dup["can_pay"] is False
assert "preview draft" in elig_dup["blocking_reason"]
print("1. Duplicate advance deposit payment BLOCKED (Stage transitioned to FINAL_BALANCE with preview check).")

# =========================================================================
# TEST D: SECURITY & AUTHORIZATION CHECKS
# =========================================================================
print("\n--- TEST D: SECURITY & AUTHORIZATION CHECKS ---")

# Client B attempts payment eligibility for Client A's booking
resp_cB_pay = client.get(f"/api/v1/client/bookings/{b1_id}/payment/eligibility", headers=headers_cB)
assert resp_cB_pay.status_code == 403
print("1. Client B blocked from Client A's booking payment eligibility (403 Forbidden).")

# Freelancer A attempts payment order endpoint
resp_fA_order = client.post(f"/api/v1/client/bookings/{b1_id}/payment/order", headers=headers_fA)
assert resp_fA_order.status_code == 403
print("2. Freelancer A blocked from initiating Client payment order (403 Forbidden).")

# =========================================================================
# TEST E: FAILED PAYMENT HANDLING
# =========================================================================
print("\n--- TEST E: FAILED PAYMENT HANDLING ---")

# Create Booking 2 with unique date
create_payload_B = dict(create_payload_A)
create_payload_B["scheduled_date"] = (date.today() + timedelta(days=25)).isoformat()
resp_b2 = client.post("/api/v1/client/bookings", json=create_payload_B, headers=headers_cA)
b2_id = resp_b2.json()["id"]

# Assign & Accept
resp_assign2 = client.post(f"/api/v1/admin/bookings/{b2_id}/assign", json=assign_payload, headers=headers_admin)
assign2_id = resp_assign2.json()["id"]
client.post(f"/api/v1/freelancer/assignments/{assign2_id}/accept", headers=headers_fA)

# Initiate order
resp_order2 = client.post(f"/api/v1/client/bookings/{b2_id}/payment/order", headers=headers_cA)
order2_data = resp_order2.json()

# Send invalid signature
bad_verify_payload = {
    "razorpay_order_id": order2_data["provider_order_id"],
    "razorpay_payment_id": f"pay_bad_{rand_id}",
    "razorpay_signature": "invalid_bad_signature_string"
}
resp_bad_verify = client.post(f"/api/v1/client/bookings/{b2_id}/payment/verify", json=bad_verify_payload, headers=headers_cA)
assert resp_bad_verify.status_code == 400
print("1. Invalid payment signature rejected with 400 Bad Request.")

# Check MySQL database record: Payment marked FAILED
db.commit()
db_p2_failed = db.query(Payment).filter(Payment.booking_id == b2_id, Payment.status == "FAILED").first()
assert db_p2_failed is not None
assert db_p2_failed.failure_code == "BAD_SIGNATURE"

db_b2 = db.query(Booking).filter(Booking.id == b2_id).first()
assert db_b2.payment_completion_state == "UNPAID"
print("2. MySQL Payment record correctly marked FAILED; Booking state remains UNPAID.")

db.close()
print("\n>>> ALL STEP 6 CLIENT DEPOSIT / ADVANCE PAYMENT WORKFLOW TESTS PASSED CLEANLY! <<<")
