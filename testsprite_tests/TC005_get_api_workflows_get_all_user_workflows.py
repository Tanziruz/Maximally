import requests

BASE_URL = "http://localhost:3001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_get_all_user_workflows():
    try:
        # Send GET request to retrieve all workflows for the authenticated user
        response = requests.get(f"{BASE_URL}/api/workflows", headers=HEADERS, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        assert False, f"Request failed: {e}"

    data = response.json()

    # Validate that response includes success status and workflows array
    assert isinstance(data, dict), f"Response is not a JSON object: {data}"
    assert "success" in data, "'success' field missing in response"
    assert isinstance(data["success"], bool), "'success' field is not boolean"
    assert data["success"] is True, "API did not return success status"

    assert "workflows" in data, "'workflows' field missing in response"
    assert isinstance(data["workflows"], list), "'workflows' field is not an array"

    # Optionally validate workflow objects structure if workflows exist
    for workflow in data["workflows"]:
        assert isinstance(workflow, dict), "Each workflow should be an object"
        # Minimal fields validation
        assert "id" in workflow, "Workflow missing 'id'"
        assert "name" in workflow, "Workflow missing 'name'"
        assert "trigger" in workflow, "Workflow missing 'trigger'"
        assert "steps" in workflow, "Workflow missing 'steps'"

test_get_all_user_workflows()