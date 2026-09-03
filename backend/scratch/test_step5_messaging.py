import os
import sys
import random

sys.path.insert(0, os.path.abspath("."))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import create_token
from app.models.message import Conversation, Message, ConversationType
from app.services.admin_messaging_service import AdminMessagingService

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

print(f"SETUP COMPLETE:")
print(f"  Client A ID: {cA_user.id}")
print(f"  Client B ID: {cB_user.id}")
print(f"  Admin ID: {a_user.id}")
print(f"  Freelancer A ID: {fA_user.id}")
print(f"  Freelancer B ID: {fB_user.id}")

# =========================================================================
# FLOW A: CLIENT A <-> ADMIN MESSAGING
# =========================================================================
print("\n--- FLOW A: CLIENT A <-> ADMIN MESSAGING ---")
convo_cA_admin = AdminMessagingService.get_or_create_client_admin_conversation(db, cA_user.id, admin_id=a_user.id)
c_admin_id = convo_cA_admin.id
print(f"1. Created CLIENT_ADMIN conversation ID: {c_admin_id}")

# Client A sends message to Admin
send_cA_payload = {"content": "Hello Admin Concierge! I have a question about my booking requirements."}
resp_send_cA = client.post(f"/api/v1/messages/conversations/{c_admin_id}/messages", json=send_cA_payload, headers=headers_cA)
assert resp_send_cA.status_code == 201, f"Client send failed: {resp_send_cA.text}"
msg1_id = resp_send_cA.json()["id"]
print(f"2. Client A sent message ID {msg1_id} to Admin Concierge.")

# Admin replies to Client A
send_admin_reply_payload = {"content": "Hello Client A! I am your platform concierge. How can I assist you today?"}
resp_send_admin1 = client.post(f"/api/v1/messages/conversations/{c_admin_id}/messages", json=send_admin_reply_payload, headers=headers_admin)
assert resp_send_admin1.status_code == 201, f"Admin reply failed: {resp_send_admin1.text}"
msg2_id = resp_send_admin1.json()["id"]
print(f"3. Admin replied with message ID {msg2_id}.")

# Client A fetches conversation logs
resp_get_cA = client.get(f"/api/v1/messages/conversations/{c_admin_id}", headers=headers_cA)
assert resp_get_cA.status_code == 200
cA_detail = resp_get_cA.json()
assert cA_detail["conversation_type"] == "CLIENT_ADMIN"
assert len(cA_detail["messages"]) >= 2
print(f"4. Client A retrieved conversation detail verified. Messages count: {len(cA_detail['messages'])}")

# =========================================================================
# FLOW B: FREELANCER A <-> ADMIN MESSAGING
# =========================================================================
print("\n--- FLOW B: FREELANCER A <-> ADMIN MESSAGING ---")
convo_fA_admin = AdminMessagingService.get_or_create_freelancer_admin_conversation(db, fA_user.id, admin_id=a_user.id)
f_admin_id = convo_fA_admin.id
print(f"1. Created FREELANCER_ADMIN conversation ID: {f_admin_id}")

# Freelancer A sends message to Admin
send_fA_payload = {"content": "Hi Support Team! What is the shoot schedule for my newly assigned booking?"}
resp_send_fA = client.post(f"/api/v1/messages/conversations/{f_admin_id}/messages", json=send_fA_payload, headers=headers_fA)
assert resp_send_fA.status_code == 201, f"Freelancer send failed: {resp_send_fA.text}"
msg3_id = resp_send_fA.json()["id"]
print(f"2. Freelancer A sent message ID {msg3_id} to Admin Support.")

# Admin replies to Freelancer A
send_admin_reply_fA = {"content": "Hi Freelancer A! The shoot is scheduled for next Tuesday at 10 AM."}
resp_send_admin2 = client.post(f"/api/v1/messages/conversations/{f_admin_id}/messages", json=send_admin_reply_fA, headers=headers_admin)
assert resp_send_admin2.status_code == 201
msg4_id = resp_send_admin2.json()["id"]
print(f"3. Admin replied with message ID {msg4_id}.")

# Freelancer A fetches conversation logs
resp_get_fA = client.get(f"/api/v1/messages/conversations/{f_admin_id}", headers=headers_fA)
assert resp_get_fA.status_code == 200
fA_detail = resp_get_fA.json()
assert fA_detail["conversation_type"] == "FREELANCER_ADMIN"
assert len(fA_detail["messages"]) >= 2
print(f"4. Freelancer A retrieved conversation detail verified. Messages count: {len(fA_detail['messages'])}")

# =========================================================================
# FLOW C: SECURITY - DIRECT CLIENT <-> FREELANCER CHAT PROHIBITED
# =========================================================================
print("\n--- FLOW C: SECURITY - DIRECT CLIENT <-> FREELANCER CHAT PROHIBITED ---")

# Client A tries to create direct conversation with Freelancer A
create_direct_payload = {"client_id": cA_user.id, "freelancer_id": fA_user.id}
resp_direct_cA = client.post("/api/v1/messages/conversations", json=create_direct_payload, headers=headers_cA)
assert resp_direct_cA.status_code == 403, f"Expected 403 Forbidden on direct chat creation! Got {resp_direct_cA.status_code}"
print("1. Client direct chat creation attempt BLOCKED (403 Forbidden).")

# Freelancer A tries to create direct conversation with Client A
resp_direct_fA = client.post("/api/v1/messages/conversations", json=create_direct_payload, headers=headers_fA)
assert resp_direct_fA.status_code == 403, f"Expected 403 Forbidden on direct chat creation! Got {resp_direct_fA.status_code}"
print("2. Freelancer direct chat creation attempt BLOCKED (403 Forbidden).")

# =========================================================================
# FLOW D: SECURITY - CROSS-USER & CROSS-ROLE ISOLATION
# =========================================================================
print("\n--- FLOW D: SECURITY - CROSS-USER & CROSS-ROLE ISOLATION ---")

# Client B attempts to fetch Client A's conversation
resp_cB_hack_detail = client.get(f"/api/v1/messages/conversations/{c_admin_id}", headers=headers_cB)
assert resp_cB_hack_detail.status_code == 403, f"Expected 403! Got {resp_cB_hack_detail.status_code}"
print("1. Client B blocked from Client A's conversation detail (403 Forbidden).")

# Client B attempts to post message to Client A's conversation
resp_cB_hack_send = client.post(f"/api/v1/messages/conversations/{c_admin_id}/messages", json={"content": "Hack!"}, headers=headers_cB)
assert resp_cB_hack_send.status_code == 403, f"Expected 403! Got {resp_cB_hack_send.status_code}"
print("2. Client B blocked from posting to Client A's conversation (403 Forbidden).")

# Freelancer B attempts to fetch Freelancer A's conversation
resp_fB_hack_detail = client.get(f"/api/v1/messages/conversations/{f_admin_id}", headers=headers_fB)
assert resp_fB_hack_detail.status_code == 403, f"Expected 403! Got {resp_fB_hack_detail.status_code}"
print("3. Freelancer B blocked from Freelancer A's conversation detail (403 Forbidden).")

# Client A attempts to fetch Freelancer A's conversation
resp_cA_hack_fA = client.get(f"/api/v1/messages/conversations/{f_admin_id}", headers=headers_cA)
assert resp_cA_hack_fA.status_code == 403, f"Expected 403! Got {resp_cA_hack_fA.status_code}"
print("4. Client A blocked from Freelancer A's conversation (403 Forbidden).")

# Freelancer A attempts to fetch Client A's conversation
resp_fA_hack_cA = client.get(f"/api/v1/messages/conversations/{c_admin_id}", headers=headers_fA)
assert resp_fA_hack_cA.status_code == 403, f"Expected 403! Got {resp_fA_hack_cA.status_code}"
print("5. Freelancer A blocked from Client A's conversation (403 Forbidden).")

# =========================================================================
# FLOW E: DUPLICATE CONVERSATION & MYSQL PERSISTENCE PROTECTION
# =========================================================================
print("\n--- FLOW E: DUPLICATE PROTECTION & MYSQL PERSISTENCE ---")
convo_dup = AdminMessagingService.get_or_create_client_admin_conversation(db, cA_user.id, admin_id=a_user.id)
assert convo_dup.id == c_admin_id, f"Expected exact same conversation ID {c_admin_id}! Got {convo_dup.id}"
print("1. Duplicate conversation check PASSED (Exact same ID returned).")

db.commit()
db_messages = db.query(Message).filter(Message.conversation_id == c_admin_id).all()
assert len(db_messages) >= 3, f"Expected persisted messages in MySQL! Found {len(db_messages)}"
print(f"2. MySQL direct check PASSED: {len(db_messages)} messages persisted in database.")

db.close()
print("\n>>> ALL STEP 5 ADMIN-MEDIATED COMMUNICATION TESTS PASSED CLEANLY! <<<")
