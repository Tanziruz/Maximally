import requests

BASE_URL = "http://localhost:3001"
AUTH_HEADER = {"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"}
TIMEOUT = 30

def test_get_authenticated_user():
    url = f"{BASE_URL}/api/auth/me"

    # Test with valid token
    try:
        response = requests.get(url, headers=AUTH_HEADER, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected status 200, got {response.status_code}"
        json_resp = response.json()
        assert isinstance(json_resp, dict), "Response is not a JSON object"
        assert "success" in json_resp, "Response missing 'success' field"
        if json_resp.get("success"):
            user = json_resp.get("user")
            assert user is not None and isinstance(user, dict), "User object missing or invalid"
            assert "email" in user, "User object missing 'email' field"
            assert isinstance(user["email"], str) and len(user["email"]) > 0, "User email missing or invalid"
        else:
            assert False, "API returned success:false unexpectedly"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Test missing token
    try:
        response = requests.get(url, timeout=TIMEOUT)
        assert response.status_code == 401 or response.status_code == 403, f"Expected 401/403 status for missing token, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    # Test invalid token
    invalid_headers = {"Authorization": "Bearer invalidtoken123"}
    try:
        response = requests.get(url, headers=invalid_headers, timeout=TIMEOUT)
        assert response.status_code == 401 or response.status_code == 403, f"Expected 401/403 status for invalid token, got {response.status_code}"
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

test_get_authenticated_user()
