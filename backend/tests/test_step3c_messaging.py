import pytest
from decimal import Decimal
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_token
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment
from app.models.message import Conversation, Message, ConversationType, MessageType
from app.models.conversation_participant import ConversationParticipant
from app.models.notification import Notification
from app.services.admin_messaging_service import AdminMessagingService

client = TestClient(app)


def get_token_for_user(user: User) -> str:
    return create_token(subject=user.id, token_type="access", role=user.role.value if hasattr(user.role, "value") else str(user.role))


def create_fixture_user(db, role: UserRole, prefix: str) -> User:
    ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
    user = User(
        email=f"{prefix}_{ts}@testdomain.com",
        phone=f"+9188{ts:08d}"[:13],
        password_hash="hashed_test_password",
        full_name=f"User {prefix.title()} {ts}",
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_fixture_profile(db, user: User, title="Lead Cinematographer") -> FreelancerProfile:
    profile = FreelancerProfile(
        user_id=user.id,
        professional_title=title,
        primary_profession=FreelancerProfession.CINEMATOGRAPHER,
        bio="Test creator bio with rich equipment and portfolio.",
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        starting_price=Decimal("6000.00"),
        hourly_rate=Decimal("1500.00"),
        event_rate=Decimal("20000.00")
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def create_fixture_managed_booking(db, client_user: User, selected_profile: Optional[FreelancerProfile] = None) -> Booking:
    ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
    booking = Booking(
        booking_number=f"BK-MSG-{ts}",
        client_id=client_user.id,
        selected_freelancer_profile_id=selected_profile.id if selected_profile else None,
        freelancer_profile_id=None,
        is_admin_managed=True,
        source_type=BookingSourceType.SERVICE,
        title="Commercial Brand Video",
        booking_type="REMOTE",
        status=BookingStatus.REQUESTED,
        scheduled_date=date(2026, 12, 15),
        start_time=time(9, 30),
        end_time=time(17, 30),
        timezone="Asia/Kolkata",
        location_city="Bangalore",
        location_state="Karnataka",
        venue_name="Indiranagar Studio B",
        agreed_amount=Decimal("25000.00"),
        freelancer_payout_amount=Decimal("18000.00"),
        currency="INR",
        price=Decimal("25000.00"),
        deposit_amount=Decimal("7500.00"),
        deposit_paid_amount=Decimal("0.00"),
        remaining_balance=Decimal("17500.00"),
        total_paid=Decimal("0.00"),
        payment_completion_state="UNPAID"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


# =============================================================================
# TEST 1: Client booking conversation created -> CLIENT_ADMIN, Freelancer absent
# =============================================================================
def test_01_client_booking_conversation_creation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c1")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm1")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr1")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)

        convo = AdminMessagingService.get_or_create_client_admin_conversation(
            db=db,
            client_id=client_u.id,
            booking_id=booking.id,
            admin_id=admin_u.id
        )

        assert convo.id is not None
        assert convo.conversation_type == ConversationType.CLIENT_ADMIN.value
        assert convo.client_id == client_u.id
        assert convo.admin_id == admin_u.id
        assert convo.freelancer_id is None
        assert convo.booking_id == booking.id

        # Check participants
        participant_user_ids = [p.user_id for p in convo.participants]
        assert client_u.id in participant_user_ids
        assert admin_u.id in participant_user_ids
        assert creator_a.id not in participant_user_ids


# =============================================================================
# TEST 2: Create same conversation twice -> duplicate prevented, same ID returned
# =============================================================================
def test_02_duplicate_conversation_protection():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c2")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm2")
        booking = create_fixture_managed_booking(db, client_u)

        convo1 = AdminMessagingService.get_or_create_client_admin_conversation(
            db=db,
            client_id=client_u.id,
            booking_id=booking.id,
            admin_id=admin_u.id
        )
        convo2 = AdminMessagingService.get_or_create_client_admin_conversation(
            db=db,
            client_id=client_u.id,
            booking_id=booking.id,
            admin_id=admin_u.id
        )

        assert convo1.id == convo2.id

        # Verify DB only has 1 conversation row for this booking
        total_convos = db.query(Conversation).filter(Conversation.booking_id == booking.id).count()
        assert total_convos == 1


# =============================================================================
# TEST 3: Admin assignment creates FREELANCER_ADMIN conversation -> Client absent
# =============================================================================
def test_03_admin_assignment_creates_freelancer_admin_conversation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c3")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm3")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr3")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)

        client_u_id = client_u.id
        admin_u_id = admin_u.id
        creator_a_id = creator_a.id
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)

        # Admin assigns Freelancer A via Step 3B API
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 18000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_assign.status_code == 200

    # Fresh session verification
    with SessionLocal() as db2:
        convo = db2.query(Conversation).filter(
            Conversation.booking_id == booking_id,
            Conversation.conversation_type == ConversationType.FREELANCER_ADMIN.value
        ).first()

        assert convo is not None
        assert convo.freelancer_id == creator_a_id
        assert convo.admin_id == admin_u_id
        assert convo.client_id is None

        participant_user_ids = [p.user_id for p in convo.participants]
        assert creator_a_id in participant_user_ids
        assert admin_u_id in participant_user_ids
        assert client_u_id not in participant_user_ids


# =============================================================================
# TEST 4: Client lists only Client/Admin conversations
# =============================================================================
def test_04_client_list_only_client_admin_conversations():
    with SessionLocal() as db:
        client_a = create_fixture_user(db, UserRole.CLIENT, "c4_a")
        client_b = create_fixture_user(db, UserRole.CLIENT, "c4_b")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm4")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr4")

        # Convo 1: Client A <-> Admin
        convo_a = AdminMessagingService.get_or_create_client_admin_conversation(db, client_a.id, admin_id=admin_u.id)
        # Convo 2: Client B <-> Admin
        convo_b = AdminMessagingService.get_or_create_client_admin_conversation(db, client_b.id, admin_id=admin_u.id)
        # Convo 3: Freelancer A <-> Admin
        convo_f = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, admin_id=admin_u.id)

        client_a_token = get_token_for_user(client_a)
        res = client.get(
            "/api/v1/client/messages/conversations",
            headers={"Authorization": f"Bearer {client_a_token}"}
        )
        assert res.status_code == 200
        items = res.json()
        item_ids = [it["id"] for it in items]

        assert convo_a.id in item_ids
        assert convo_b.id not in item_ids
        assert convo_f.id not in item_ids
        for it in items:
            assert it["conversation_type"] == "CLIENT_ADMIN"
            assert it["recipient_role"] == "ADMIN"


# =============================================================================
# TEST 5: Freelancer lists only Freelancer/Admin conversations
# =============================================================================
def test_05_freelancer_list_only_freelancer_admin_conversations():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c5")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm5")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr5_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr5_b")

        convo_c = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, admin_id=admin_u.id)
        convo_fa = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, admin_id=admin_u.id)
        convo_fb = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_b.id, admin_id=admin_u.id)

        creator_a_token = get_token_for_user(creator_a)
        res = client.get(
            "/api/v1/freelancer/messages/conversations",
            headers={"Authorization": f"Bearer {creator_a_token}"}
        )
        assert res.status_code == 200
        items = res.json()
        item_ids = [it["id"] for it in items]

        assert convo_fa.id in item_ids
        assert convo_c.id not in item_ids
        assert convo_fb.id not in item_ids
        for it in items:
            assert it["conversation_type"] == "FREELANCER_ADMIN"
            assert it["recipient_role"] == "ADMIN"


# =============================================================================
# TEST 6: Admin lists both channels
# =============================================================================
def test_06_admin_lists_both_channels():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c6")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm6")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr6")

        convo_c = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, admin_id=admin_u.id)
        convo_f = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, admin_id=admin_u.id)

        admin_token = get_token_for_user(admin_u)
        res = client.get(
            "/api/v1/admin/messages/conversations",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200
        items = res.json()
        item_ids = [it["id"] for it in items]

        assert convo_c.id in item_ids
        assert convo_f.id in item_ids

        # Check explicit recipient indicators
        c_item = next(it for it in items if it["id"] == convo_c.id)
        assert c_item["conversation_type"] == "CLIENT_ADMIN"
        assert c_item["recipient_role"] == "CLIENT"

        f_item = next(it for it in items if it["id"] == convo_f.id)
        assert f_item["conversation_type"] == "FREELANCER_ADMIN"
        assert f_item["recipient_role"] == "FREELANCER"


# =============================================================================
# TEST 7: Client sends message to Admin -> Admin receives, Freelancer cannot see
# =============================================================================
def test_07_client_sends_message_to_admin():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c7")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm7")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr7")
        booking = create_fixture_managed_booking(db, client_u)

        convo = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, booking_id=booking.id, admin_id=admin_u.id)
        convo_id = convo.id

        client_token = get_token_for_user(client_u)
        res_send = client.post(
            f"/api/v1/messages/conversations/{convo_id}/messages",
            json={"content": "Can we push the start time to 10:30 AM?"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_send.status_code == 201
        msg = res_send.json()
        assert msg["content"] == "Can we push the start time to 10:30 AM?"
        assert msg["sender_id"] == client_u.id

        # Admin reads
        admin_token = get_token_for_user(admin_u)
        res_admin = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_admin.status_code == 200
        msgs = res_admin.json()["messages"]
        assert any(m["content"] == "Can we push the start time to 10:30 AM?" for m in msgs)

        # Freelancer tries reading -> 403 Forbidden
        creator_token = get_token_for_user(creator_a)
        res_freelancer = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_freelancer.status_code == 403


# =============================================================================
# TEST 8: Admin sends message to Client -> Client receives, Freelancer cannot see
# =============================================================================
def test_08_admin_sends_message_to_client():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c8")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm8")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr8")
        booking = create_fixture_managed_booking(db, client_u)

        convo = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, booking_id=booking.id, admin_id=admin_u.id)
        convo_id = convo.id

        admin_token = get_token_for_user(admin_u)
        res_send = client.post(
            f"/api/v1/messages/conversations/{convo_id}/messages",
            json={"content": "Yes, 10:30 AM is approved with the studio."},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_send.status_code == 201

        # Client reads
        client_token = get_token_for_user(client_u)
        res_client = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_client.status_code == 200
        msgs = res_client.json()["messages"]
        assert any(m["content"] == "Yes, 10:30 AM is approved with the studio." for m in msgs)

        # Freelancer reads -> 403
        creator_token = get_token_for_user(creator_a)
        res_fl = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_fl.status_code == 403


# =============================================================================
# TEST 9: Freelancer sends message to Admin -> Admin receives, Client cannot see
# =============================================================================
def test_09_freelancer_sends_message_to_admin():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c9")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm9")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr9")
        booking = create_fixture_managed_booking(db, client_u)

        convo_f = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, booking_id=booking.id, admin_id=admin_u.id)
        convo_id = convo_f.id

        creator_token = get_token_for_user(creator_a)
        res_send = client.post(
            f"/api/v1/messages/conversations/{convo_id}/messages",
            json={"content": "I will bring dual wireless mics and backup lighting kit."},
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_send.status_code == 201

        # Admin reads
        admin_token = get_token_for_user(admin_u)
        res_admin = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_admin.status_code == 200
        msgs = res_admin.json()["messages"]
        assert any(m["content"] == "I will bring dual wireless mics and backup lighting kit." for m in msgs)

        # Client reads -> 403 Forbidden
        client_token = get_token_for_user(client_u)
        res_client = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_client.status_code == 403


# =============================================================================
# TEST 10: Admin sends message to Freelancer -> Freelancer receives, Client cannot see
# =============================================================================
def test_10_admin_sends_message_to_freelancer():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c10")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm10")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr10")
        booking = create_fixture_managed_booking(db, client_u)

        convo_f = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, booking_id=booking.id, admin_id=admin_u.id)
        convo_id = convo_f.id

        admin_token = get_token_for_user(admin_u)
        res_send = client.post(
            f"/api/v1/messages/conversations/{convo_id}/messages",
            json={"content": "Great, please ensure 4K 10-bit S-Log3 delivery format."},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_send.status_code == 201

        # Freelancer reads
        creator_token = get_token_for_user(creator_a)
        res_fl = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_fl.status_code == 200
        msgs = res_fl.json()["messages"]
        assert any(m["content"] == "Great, please ensure 4K 10-bit S-Log3 delivery format." for m in msgs)

        # Client reads -> 403
        client_token = get_token_for_user(client_u)
        res_cl = client.get(
            f"/api/v1/messages/conversations/{convo_id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_cl.status_code == 403


# =============================================================================
# TEST 11: Client tries accessing FREELANCER_ADMIN conversation -> 403
# =============================================================================
def test_11_client_cannot_access_freelancer_admin_conversation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c11")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm11")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr11")

        convo_f = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, admin_id=admin_u.id)

        client_token = get_token_for_user(client_u)
        res = client.get(
            f"/api/v1/messages/conversations/{convo_f.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res.status_code == 403


# =============================================================================
# TEST 12: Freelancer tries accessing CLIENT_ADMIN conversation -> 403
# =============================================================================
def test_12_freelancer_cannot_access_client_admin_conversation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c12")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm12")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr12")

        convo_c = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, admin_id=admin_u.id)

        creator_token = get_token_for_user(creator_a)
        res = client.get(
            f"/api/v1/messages/conversations/{convo_c.id}",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res.status_code == 403


# =============================================================================
# TEST 13: Another Client tries accessing Client A conversation -> 403
# =============================================================================
def test_13_other_client_cannot_access_client_conversation():
    with SessionLocal() as db:
        client_a = create_fixture_user(db, UserRole.CLIENT, "c13_a")
        client_b = create_fixture_user(db, UserRole.CLIENT, "c13_b")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm13")

        convo_a = AdminMessagingService.get_or_create_client_admin_conversation(db, client_a.id, admin_id=admin_u.id)

        client_b_token = get_token_for_user(client_b)
        res = client.get(
            f"/api/v1/messages/conversations/{convo_a.id}",
            headers={"Authorization": f"Bearer {client_b_token}"}
        )
        assert res.status_code == 403


# =============================================================================
# TEST 14: Another Freelancer tries accessing Freelancer A conversation -> 403
# =============================================================================
def test_14_other_freelancer_cannot_access_freelancer_conversation():
    with SessionLocal() as db:
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr14_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr14_b")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm14")

        convo_a = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, creator_a.id, admin_id=admin_u.id)

        creator_b_token = get_token_for_user(creator_b)
        res = client.get(
            f"/api/v1/messages/conversations/{convo_a.id}",
            headers={"Authorization": f"Bearer {creator_b_token}"}
        )
        assert res.status_code == 403


# =============================================================================
# TEST 15: Client attempts new direct conversation with Freelancer -> 403
# =============================================================================
def test_15_client_direct_chat_creation_blocked():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c15")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr15")
        profile_a = create_fixture_profile(db, creator_a)

        client_token = get_token_for_user(client_u)
        res = client.post(
            "/api/v1/messages/conversations",
            json={"freelancer_id": profile_a.id},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res.status_code == 403
        assert "disabled" in res.json()["detail"].lower() or "direct" in res.json()["detail"].lower()


# =============================================================================
# TEST 16: Freelancer attempts new direct conversation with Client -> 403
# =============================================================================
def test_16_freelancer_direct_chat_creation_blocked():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c16")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr16")

        creator_token = get_token_for_user(creator_a)
        res = client.post(
            "/api/v1/messages/conversations",
            json={"client_id": client_u.id},
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res.status_code == 403
        assert "disabled" in res.json()["detail"].lower() or "direct" in res.json()["detail"].lower()


# =============================================================================
# TEST 17: Existing DIRECT_LEGACY conversation still loads
# =============================================================================
def test_17_legacy_direct_conversation_loads():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c17")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr17")

        legacy_convo = Conversation(
            conversation_type=ConversationType.DIRECT_LEGACY.value,
            client_id=client_u.id,
            freelancer_id=creator_a.id,
            admin_id=None
        )
        db.add(legacy_convo)
        db.flush()

        # Legacy message
        msg = Message(
            conversation_id=legacy_convo.id,
            sender_id=client_u.id,
            content="Historical pre-migration chat message.",
            message_type=MessageType.TEXT
        )
        db.add(msg)
        db.commit()
        db.refresh(legacy_convo)

        client_token = get_token_for_user(client_u)
        res = client.get(
            f"/api/v1/messages/conversations/{legacy_convo.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == legacy_convo.id
        assert data["conversation_type"] == "DIRECT_LEGACY"
        assert len(data["messages"]) == 1
        assert data["messages"][0]["content"] == "Historical pre-migration chat message."


# =============================================================================
# TEST 18: Attempt to send into DIRECT_LEGACY conversation -> blocked/read-only
# =============================================================================
def test_18_send_to_legacy_conversation_blocked():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c18")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr18")

        legacy_convo = Conversation(
            conversation_type=ConversationType.DIRECT_LEGACY.value,
            client_id=client_u.id,
            freelancer_id=creator_a.id
        )
        db.add(legacy_convo)
        db.commit()
        db.refresh(legacy_convo)

        client_token = get_token_for_user(client_u)
        res_client_send = client.post(
            f"/api/v1/messages/conversations/{legacy_convo.id}/messages",
            json={"content": "New direct message attempt."},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_client_send.status_code == 403

        creator_token = get_token_for_user(creator_a)
        res_fl_send = client.post(
            f"/api/v1/messages/conversations/{legacy_convo.id}/messages",
            json={"content": "Freelancer direct reply attempt."},
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_fl_send.status_code == 403


# =============================================================================
# TEST 19: Unread count isolation works
# =============================================================================
def test_19_unread_count_isolation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c19")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm19")

        convo = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, admin_id=admin_u.id)
        convo_id = convo.id

        # Admin sends 2 messages to Client
        admin_token = get_token_for_user(admin_u)
        client.post(f"/api/v1/messages/conversations/{convo_id}/messages", json={"content": "Msg 1"}, headers={"Authorization": f"Bearer {admin_token}"})
        client.post(f"/api/v1/messages/conversations/{convo_id}/messages", json={"content": "Msg 2"}, headers={"Authorization": f"Bearer {admin_token}"})

        # Client unread count should be 2 (plus initial system message = 3 total messages)
        client_token = get_token_for_user(client_u)
        res_unread = client.get(
            f"/api/v1/messages/conversations/{convo_id}/unread",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_unread.status_code == 200
        assert res_unread.json()["unread_count"] >= 2

        # Admin unread count in this same conversation should be 0
        res_admin_unread = client.get(
            f"/api/v1/messages/conversations/{convo_id}/unread",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_admin_unread.status_code == 200
        assert res_admin_unread.json()["unread_count"] == 0


# =============================================================================
# TEST 20: Mark-read affects correct participant only
# =============================================================================
def test_20_mark_read_participant_isolation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c20")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm20")

        convo = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, admin_id=admin_u.id)
        convo_id = convo.id

        # Client sends a message
        client_token = get_token_for_user(client_u)
        client.post(f"/api/v1/messages/conversations/{convo_id}/messages", json={"content": "Hello Admin"}, headers={"Authorization": f"Bearer {client_token}"})

        admin_token = get_token_for_user(admin_u)
        # Admin marks as read
        res_read = client.post(
            f"/api/v1/messages/conversations/{convo_id}/read",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_read.status_code == 200

    with SessionLocal() as db2:
        part_admin = db2.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == convo_id,
            ConversationParticipant.user_id == admin_u.id
        ).first()
        part_client = db2.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == convo_id,
            ConversationParticipant.user_id == client_u.id
        ).first()

        assert part_admin.last_read_message_id is not None
        # Client marker remains independent
        assert part_client is not None


# =============================================================================
# TEST 21: Assignment creates NO Client/Freelancer direct conversation
# =============================================================================
def test_21_assignment_creates_no_direct_conversation():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c21")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm21")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr21")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)

        booking_id = booking.id
        profile_a_id = profile_a.id

        # Pre-count direct conversations
        direct_before = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.DIRECT_LEGACY.value
        ).count()

        admin_token = get_token_for_user(admin_u)
        client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 18000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

    with SessionLocal() as db2:
        direct_after = db2.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.DIRECT_LEGACY.value
        ).count()
        assert direct_after == direct_before

        # Exactly 1 FREELANCER_ADMIN conversation created for booking
        f_convos = db2.query(Conversation).filter(
            Conversation.booking_id == booking_id,
            Conversation.conversation_type == ConversationType.FREELANCER_ADMIN.value
        ).all()
        assert len(f_convos) == 1
        assert f_convos[0].client_id is None


# =============================================================================
# TEST 22: Privacy filtering -> No private contact fields in serialized context
# =============================================================================
def test_22_privacy_filtering_in_serialized_context():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c22")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm22")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr22")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)

        convo_c = AdminMessagingService.get_or_create_client_admin_conversation(db, client_u.id, booking_id=booking.id, admin_id=admin_u.id)

        client_token = get_token_for_user(client_u)
        res = client.get(
            f"/api/v1/messages/conversations/{convo_c.id}",
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res.status_code == 200
        data = res.json()
        context = data.get("context") or {}

        # Assert no private phone or email exposed in context
        assert "phone" not in context
        assert "email" not in context
        assert "whatsapp" not in context
        assert context.get("assigned_creator_display_name") == creator_a.full_name
