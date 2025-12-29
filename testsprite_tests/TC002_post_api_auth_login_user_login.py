import requests

BASE_URL = "http://localhost:3001"
LOGIN_ENDPOINT = "/api/auth/login"
TIMEOUT = 30


def test_post_api_auth_login_user_login():
    headers = {
        "Content-Type": "application/json"
    }

    # Valid credentials (assuming a known valid user - replace with a valid test user)
    valid_payload = {
        "email": "Tanziruz25@gmail.com",
        "password": "CorrectPassword123!"
    }

    # Invalid credentials
    invalid_payload = {
        "email": "Tanziruz25@gmail.com",
        "password": "WrongPassword!"
    }

    # Test with valid credentials
    try:
        response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=valid_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        assert False, f"Valid login request failed: {e}"

    assert response.status_code == 200, f"Expected status 200 but got {response.status_code}"
    json_response = response.json()
    assert isinstance(json_response, dict), "Response is not a JSON object"
    assert "success" in json_response and isinstance(json_response["success"], bool), "Missing or invalid 'success' in response"
    assert json_response["success"] is True, "'success' is False for valid login"
    assert "user" in json_response and isinstance(json_response["user"], dict), "'user' object missing or invalid in response"
    assert "token" in json_response and isinstance(json_response["token"], str) and len(json_response["token"]) > 0, "JWT token missing or invalid in response"

    # Test with invalid credentials
    try:
        invalid_response = requests.post(
            f"{BASE_URL}{LOGIN_ENDPOINT}",
            json=invalid_payload,
            headers=headers,
            timeout=TIMEOUT,
        )
    except requests.RequestException as e:
        # It's acceptable to get an error for invalid credentials; handle below
        invalid_response = None
        error = e

    if invalid_response is not None:
        # Expecting a 4xx error status code for invalid login
        assert invalid_response.status_code in (400, 401, 403), f"Expected client error status for invalid login, got {invalid_response.status_code}"
        try:
            invalid_json = invalid_response.json()
            assert isinstance(invalid_json, dict), "Invalid login response is not JSON"
            assert "success" in invalid_json and invalid_json["success"] is False, "'success' should be False for invalid login"
            # There may be an error message or code to check
            assert any(k in invalid_json for k in ("error", "message", "errors")), "Error message missing in invalid login response"
        except ValueError:
            # Response is not JSON
            assert False, "Invalid login response is not valid JSON"
    else:
        # If exception occurred, ensure it's authentication error related
        assert "401" in str(error) or "403" in str(error), f"Unexpected error on invalid login: {error}"


test_post_api_auth_login_user_login()
