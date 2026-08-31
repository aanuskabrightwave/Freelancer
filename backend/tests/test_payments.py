import pytest
import os
from datetime import datetime
from decimal import Decimal
from app.models.user import User, UserRole
from app.models.service import Service, ServiceType, ServiceStatus
from app.models.service_package import ServicePackage, PackageType
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.core.security import create_token
from tests.test_bookings import create_test_freelancer, create_test_client


def test_payment_and_payout_ledger_pipeline(client, db):
    os.environ["PAYOUT_HOLD_DAYS"] = "0"
    # 1. Create users
    free_user, free_prof = create_test_freelancer(db, "free_pay@example.com")
    client_user = create_test_client(db, "client_pay@example.com")
    intruder_user = create_test_client(db, "intruder_pay@example.com")

    free_token = create_token(free_user.id, "access", role="FREELANCER")
    client_token = create_token(client_user.id, "access", role="CLIENT")
    intruder_token = create_token(intruder_user.id, "access", role="CLIENT")

    free_headers = {"Authorization": f"Bearer {free_token}"}
    client_headers = {"Authorization": f"Bearer {client_token}"}
    intruder_headers = {"Authorization": f"Bearer {intruder_token}"}

    # 2. Setup service listing
    service = Service(
        freelancer_profile_id=free_prof.id,
        title="Cinematic Editing package",
        slug="cinematic-editing",
        short_description="Highlights edits",
        description="Premium narrative color grading",
        service_type=ServiceType.REMOTE,
        status=ServiceStatus.PUBLISHED,
        category_id=1
    )
    db.add(service)
    db.commit()
    db.refresh(service)

    package = ServicePackage(
        service_id=service.id,
        package_type=PackageType.BASIC,
        name="Basic Pack",
        description="Rough cut edits",
        price=10000.00,
        revisions=2,
        delivery_time_days=5
    )
    db.add(package)
    db.commit()
    db.refresh(package)

    # 3. Create Booking
    booking = Booking(
        booking_number="CM-2026-888123",
        client_id=client_user.id,
        freelancer_profile_id=free_prof.id,
        source_type=BookingSourceType.SERVICE,
        service_id=service.id,
        service_package_id=package.id,
        title=service.title,
        description=service.short_description,
        booking_type="REMOTE",
        status=BookingStatus.CONFIRMED,
        scheduled_date=datetime.now().date(),
        booking_date=datetime.now(),
        timezone="Asia/Kolkata",
        agreed_amount=package.price,
        price=package.price,
        deposit_amount=package.price
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # 4. Security Check: intruder client cannot create payment order for this booking
    bad_order_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/payment/order",
        headers=intruder_headers
    )
    assert bad_order_res.status_code == 403

    # 5. Freelancer cannot start job before client pays
    start_unpaid_res = client.put(
        f"/api/v1/bookings/{booking.id}/status",
        json={"status": "IN_PROGRESS"},
        headers=free_headers
    )
    assert start_unpaid_res.status_code == 400
    assert "payment" in start_unpaid_res.json()["detail"].lower()

    # 6. Create Payment Order (authorative amount from database)
    order_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/payment/order",
        headers=client_headers
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["amount"] == 1000000  # 10000.00 converted to paise (smallest unit)
    assert order_data["currency"] == "INR"
    assert "razorpay_key_id" in order_data
    provider_order_id = order_data["provider_order_id"]

    # 7. Verify signature after checkout (Signature Failure case)
    bad_verify_payload = {
        "razorpay_order_id": provider_order_id,
        "razorpay_payment_id": "pay_failed_123",
        "razorpay_signature": "invalid_signature_bits"
    }
    verify_bad_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/payment/verify",
        json=bad_verify_payload,
        headers=client_headers
    )
    assert verify_bad_res.status_code == 400

    # Verify signature success (Mock bypass signature verification)
    good_verify_payload = {
        "razorpay_order_id": provider_order_id,
        "razorpay_payment_id": "pay_captured_123",
        "razorpay_signature": "mock_signature_bypass_for_pytest"
    }
    verify_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/payment/verify",
        json=good_verify_payload,
        headers=client_headers
    )
    assert verify_res.status_code == 200, f"Status: {verify_res.status_code}, Body: {verify_res.text}"
    assert verify_res.json()["status"] == "CAPTURED"
    payment_id = verify_res.json()["id"]

    # 8. Freelancer can now start job after client paid
    start_paid_res = client.put(
        f"/api/v1/bookings/{booking.id}/status",
        json={"status": "IN_PROGRESS"},
        headers=free_headers
    )
    assert start_paid_res.status_code == 200
    assert start_paid_res.json()["status"] == "IN_PROGRESS"

    # 9. Verify Ledger state: pending earnings for freelancer
    earnings_summary_res = client.get(
        "/api/v1/freelancer/earnings",
        headers=free_headers
    )
    assert earnings_summary_res.status_code == 200
    summary_data = earnings_summary_res.json()
    assert summary_data["total_earned"] == "9000.00"  # 10,000 gross - 10% commission fee = 9,000 net
    assert summary_data["pending"] == "9000.00"
    assert summary_data["available"] == "0.00"  # booking not yet completed!

    # 10. Complete booking to mature balance holds
    # Freelancer completes job
    client.put(
        f"/api/v1/bookings/{booking.id}/status",
        json={"status": "DELIVERY_PENDING"},
        headers=free_headers
    )
    # Client approves work & completes booking
    complete_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/complete",
        headers=client_headers
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["status"] == "COMPLETED"

    # Process holds maturation manually (background service runner)
    from app.services.payout_service import PayoutService
    PayoutService.process_available_payouts(db)

    # Check available balance
    earnings_summary_res2 = client.get(
        "/api/v1/freelancer/earnings",
        headers=free_headers
    )
    summary_data2 = earnings_summary_res2.json()
    assert summary_data2["pending"] == "0.00"
    assert summary_data2["available"] == "9000.00"

    # 11. Connect Payout bank details
    payout_account_payload = {
        "provider_account_id": "acc_beneficiary_free123",
        "account_holder_name": "Jane Freelancer",
        "account_type": "bank_account"
    }
    link_res = client.post(
        "/api/v1/freelancer/earnings/payout-account",
        json=payout_account_payload,
        headers=free_headers
    )
    assert link_res.status_code == 201
    assert link_res.json()["status"] == "VERIFIED"

    # 12. Request payout (trigger payout)
    payout_req = {"amount": 9000.00}
    payout_res = client.post(
        "/api/v1/freelancer/payouts/request",
        json=payout_req,
        headers=free_headers
    )
    assert payout_res.status_code == 201
    assert payout_res.json()["status"] == "PROCESSED"
    assert payout_res.json()["amount"] == "9000.00"

    # available balance should now be deducted to zero
    earnings_summary_res3 = client.get(
        "/api/v1/freelancer/earnings",
        headers=free_headers
    )
    assert earnings_summary_res3.json()["available"] == "0.00"
    assert earnings_summary_res3.json()["paid_out"] == "9000.00"

    # 13. Client requests refund (review)
    refund_payload = {"reason": "Cancelled shoot before any drafts delivery"}
    refund_req_res = client.post(
        f"/api/v1/client/bookings/{booking.id}/refund-request",
        json=refund_payload,
        headers=client_headers
    )
    assert refund_req_res.status_code == 201
    assert refund_req_res.json()["status"] == "REQUESTED"

    # 14. Ingest Razorpay Webhook event captured (idempotency check)
    webhook_payload_captured = {
        "id": "evt_captured_9999",
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_captured_123",
                    "order_id": provider_order_id,
                    "status": "captured"
                }
            }
        }
    }
    # Webhook signature header included
    webhook_headers = {"X-Razorpay-Signature": "mock_webhook_signature_bypass"}
    webhook_res = client.post(
        "/api/v1/webhooks/razorpay",
        json=webhook_payload_captured,
        headers=webhook_headers
    )
    assert webhook_res.status_code == 200
    assert webhook_res.json()["status"] == "success"

    # Re-send same webhook (Idempotency test: should ignore duplicate)
    webhook_res2 = client.post(
        "/api/v1/webhooks/razorpay",
        json=webhook_payload_captured,
        headers=webhook_headers
    )
    assert webhook_res2.status_code == 200
