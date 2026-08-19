import urllib.request
import json
import sys

url = "http://localhost:8000/api/v1/auth/register"
data = {
    "full_name": "Test Persistence Client",
    "email": "testpersistence@test.com",
    "phone": "+919999999999",
    "login_id": "testpersist",
    "password": "TestPersist@123",
    "role": "CLIENT"
}
req = urllib.request.Request(
    url, 
    data=json.dumps(data).encode("utf-8"), 
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req) as res:
        res_data = json.loads(res.read().decode("utf-8"))
        print(f"INSERT_SUCCESS: Created user {res_data['user']['login_id']} with ID {res_data['user']['id']}")
except Exception as e:
    # If the user already exists, that is also fine (it means insertion previously worked or exists)
    if "400" in str(e) or "409" in str(e) or "Conflict" in str(e):
        print("INSERT_SUCCESS: User already exists")
    else:
        print(f"INSERT_FAILED: {e}")
        sys.exit(1)

# Now test login / read
login_url = "http://localhost:8000/api/v1/auth/login"
login_data = {
    "identifier": "testpersist",
    "password": "TestPersist@123"
}
login_req = urllib.request.Request(
    login_url,
    data=json.dumps(login_data).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(login_req) as res:
        res_data = json.loads(res.read().decode("utf-8"))
        print(f"READ_SUCCESS: Logged in and read role {res_data['user']['role']}")
except Exception as e:
    print(f"READ_FAILED: {e}")
    sys.exit(1)
