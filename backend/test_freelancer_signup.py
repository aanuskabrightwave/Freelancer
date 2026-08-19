import urllib.request
import json
import sys

# 1. Register Freelancer
register_url = "http://localhost:8000/api/v1/auth/register"
register_data = {
    "full_name": "Test Freelancer User",
    "email": "testfreelancer@test.com",
    "phone": "+918888888888",
    "login_id": "testfree",
    "password": "TestFreelancer@123",
    "role": "FREELANCER"
}
req = urllib.request.Request(
    register_url, 
    data=json.dumps(register_data).encode("utf-8"), 
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(req) as res:
        res_data = json.loads(res.read().decode("utf-8"))
        print(f"REGISTER_SUCCESS: Created user {res_data['user']['login_id']} with ID {res_data['user']['id']}")
except Exception as e:
    if "400" in str(e) or "409" in str(e) or "Conflict" in str(e):
        print("REGISTER_SUCCESS: User already exists")
    else:
        print(f"REGISTER_FAILED: {e}")
        sys.exit(1)

# 2. Login to get Access Token
login_url = "http://localhost:8000/api/v1/auth/login"
login_data = {
    "identifier": "testfree",
    "password": "TestFreelancer@123"
}
login_req = urllib.request.Request(
    login_url,
    data=json.dumps(login_data).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
try:
    with urllib.request.urlopen(login_req) as res:
        res_data = json.loads(res.read().decode("utf-8"))
        access_token = res_data["access_token"]
        print("LOGIN_SUCCESS: Obtained access token")
except Exception as e:
    print(f"LOGIN_FAILED: {e}")
    sys.exit(1)

# 3. Create Freelancer Profile
profile_url = "http://localhost:8000/api/v1/freelancer/profile"
profile_payload = {
    "professional_title": "Expert Drone Operator",
    "primary_profession": "DRONE_OPERATOR",
    "bio": "Experienced drone pilot with a history of shooting commercials, cinematic videos, and landscape photography for marketplace testing purposes.",
    "experience_years": 8,
    "city": "Bengaluru",
    "state": "Karnataka",
    "country": "India"
}
profile_req = urllib.request.Request(
    profile_url,
    data=json.dumps(profile_payload).encode("utf-8"),
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {access_token}"
    }
)
try:
    with urllib.request.urlopen(profile_req) as res:
        res_data = json.loads(res.read().decode("utf-8"))
        print(f"PROFILE_CREATE_SUCCESS: Created profile ID {res_data['id']} for user {res_data['user_id']}")
except Exception as e:
    if "400" in str(e) or "409" in str(e) or "Conflict" in str(e):
        print("PROFILE_CREATE_SUCCESS: Profile already exists")
    else:
        print(f"PROFILE_CREATE_FAILED: {e}")
        sys.exit(1)
