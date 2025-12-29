import requests
import uuid
import time

BASE_URL = "http://localhost:3001"
REGISTER_ENDPOINT = "/api/auth/register"
HEADERS = {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos",
    "Content-Type": "application/json"
}
TIMEOUT = 30

def test_post_api_auth_register_user_registration():
    # Create unique email for registration to avoid conflicts
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    payload = {
        "name": "Test User",
        "email": unique_email,
        "password": "SecurePass123!"
    }
    
    # Register user
    response = requests.post(
        BASE_URL + REGISTER_ENDPOINT,
        headers=HEADERS,
        json=payload,
        timeout=TIMEOUT
    )
    assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
    resp_json = response.json()
    # Validate success status
    assert "success" in resp_json, "'success' field missing in response"
    assert resp_json["success"] is True, f"Expected success True, got {resp_json['success']}"
    # Validate user object
    assert "user" in resp_json and isinstance(resp_json["user"], dict), "'user' object missing or invalid"
    user = resp_json["user"]
    # Validate user fields
    assert "id" in user and isinstance(user["id"], str) and user["id"], "User id missing or invalid"
    assert user.get("name") == payload["name"], f"User name mismatch: expected {payload['name']}, got {user.get('name')}"
    assert user.get("email") == payload["email"], f"User email mismatch: expected {payload['email']}, got {user.get('email')}"
    # Validate token presence
    assert "token" in resp_json and isinstance(resp_json["token"], str) and resp_json["token"], "'token' missing or invalid"
    
    # Validate that password is not returned in plain text and is presumably hashed
    # Password should NOT be present in user object
    assert "password" not in user, "Password should not be returned in user object"
    assert "password_hash" not in user, "Password hash should not be returned in user object"
    
    # Additional indirect check for secure password storage - try login with correct password to verify success
    login_payload = {
        "email": payload["email"],
        "password": payload["password"]
    }
    login_resp = requests.post(
        BASE_URL + "/api/auth/login",
        headers=HEADERS,
        json=login_payload,
        timeout=TIMEOUT
    )
    assert login_resp.status_code == 200, f"Login status code expected 200, got {login_resp.status_code}"
    login_json = login_resp.json()
    assert login_json.get("success") is True, "Login success expected True"
    assert "token" in login_json and login_json["token"], "Login token missing or empty"

test_post_api_auth_register_user_registration()