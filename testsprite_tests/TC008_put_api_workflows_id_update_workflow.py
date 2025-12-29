import requests

BASE_URL = "http://localhost:3001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}
TIMEOUT = 30

def test_put_api_workflows_id_update_workflow():
    workflow_id = None
    # First create a new workflow to update
    create_payload = {
        "name": "Initial Workflow",
        "description": "Initial workflow description",
        "trigger": {"type": "manual"},
        "steps": [
            {"id": "step1", "name": "Step One", "action": "http_request", "config": {"url": "https://example.com"}}
        ]
    }
    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/workflows",
            json=create_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200
        create_data = create_resp.json()
        assert create_data.get("success") is True
        workflow = create_data.get("workflow")
        assert workflow is not None
        workflow_id = workflow.get("id")
        assert workflow_id is not None

        # Prepare update payload with optional fields
        update_payload = {
            "name": "Updated Workflow Name",
            "description": "Updated description for the workflow",
            "trigger": {"type": "schedule", "cron": "0 12 * * *"},
            "steps": [
                {"id": "step1", "name": "Step One Modified", "action": "http_request", "config": {"url": "https://updated.example.com"}},
                {"id": "step2", "name": "Step Two", "action": "email", "config": {"to": "user@example.com", "subject": "Test"}}
            ],
            "enabled": False
        }

        update_resp = requests.put(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            json=update_payload,
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert update_resp.status_code == 200
        update_data = update_resp.json()
        assert update_data.get("success") is True
        updated_workflow = update_data.get("workflow")
        assert updated_workflow is not None
        # Validate updated fields
        assert isinstance(updated_workflow.get("name"), str)
        assert updated_workflow.get("name") == update_payload["name"]

        assert isinstance(updated_workflow.get("description"), str)
        assert updated_workflow.get("description") == update_payload["description"]

        assert isinstance(updated_workflow.get("trigger"), dict)
        assert updated_workflow.get("trigger") == update_payload["trigger"]

        assert isinstance(updated_workflow.get("steps"), list)
        assert updated_workflow.get("steps") == update_payload["steps"]

        assert isinstance(updated_workflow.get("enabled"), bool)
        assert updated_workflow.get("enabled") == update_payload["enabled"]

    finally:
        # Cleanup - delete the workflow if it was created
        if workflow_id:
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/workflows/{workflow_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
                # Accept 200 or 204 as success for delete
                assert del_resp.status_code in (200, 204)
                try:
                    del_data = del_resp.json()
                    # Some delete endpoints might return success boolean, verify if available
                    if isinstance(del_data, dict):
                        assert del_data.get("success") is True
                except Exception:
                    pass
            except Exception:
                pass

test_put_api_workflows_id_update_workflow()
