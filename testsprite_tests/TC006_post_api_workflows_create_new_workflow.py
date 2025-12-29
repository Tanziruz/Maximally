import requests

BASE_URL = "http://localhost:3001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"

def test_post_api_workflows_create_new_workflow():
    url = f"{BASE_URL}/api/workflows"
    headers = {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }

    payload = {
        "name": "Test Workflow",
        "description": "This is a test workflow created by automated test.",
        "trigger": {
            "type": "manual"
        },
        "steps": [
            {
                "id": "step1",
                "type": "httpRequest",
                "configuration": {
                    "method": "GET",
                    "url": "https://jsonplaceholder.typicode.com/todos/1"
                }
            },
            {
                "id": "step2",
                "type": "email",
                "configuration": {
                    "to": "test@example.com",
                    "subject": "Test Workflow Email",
                    "body": "This is a test email sent by the workflow."
                }
            }
        ]
    }

    response = None
    workflow_id = None
    try:
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        assert response.status_code == 200, f"Unexpected status code: {response.status_code}"
        resp_json = response.json()
        assert isinstance(resp_json, dict), "Response is not a JSON object"
        assert resp_json.get("success") is True, f"Expected success true but got {resp_json.get('success')}"
        workflow = resp_json.get("workflow")
        assert isinstance(workflow, dict), "Workflow object missing or not a dict"
        # Check fields of the returned workflow object
        assert "id" in workflow and isinstance(workflow["id"], str) and workflow["id"], "Workflow ID is missing or invalid"
        assert workflow.get("name") == payload["name"], "Workflow name mismatch"
        assert workflow.get("description") == payload["description"], "Workflow description mismatch"
        assert isinstance(workflow.get("trigger"), dict), "Workflow trigger missing or invalid"
        assert isinstance(workflow.get("steps"), list), "Workflow steps missing or invalid"
        workflow_id = workflow["id"]
    finally:
        if workflow_id:
            del_url = f"{BASE_URL}/api/workflows/{workflow_id}"
            try:
                del_resp = requests.delete(del_url, headers=headers, timeout=30)
                assert del_resp.status_code == 200 or del_resp.status_code == 204, f"Failed to delete workflow, status code: {del_resp.status_code}"
                del_resp_json = del_resp.json()
                assert del_resp_json.get("success") is True, "Delete workflow response success false"
            except Exception:
                # Ignore exceptions during cleanup
                pass

test_post_api_workflows_create_new_workflow()
