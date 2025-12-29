import requests
import uuid

BASE_URL = "http://localhost:3001"
AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"
HEADERS = {
    "Authorization": f"Bearer {AUTH_TOKEN}",
    "Content-Type": "application/json"
}
TIMEOUT = 30


def test_delete_workflow_by_id():
    # Create a new workflow to ensure we have a workflow to delete
    create_payload = {
        "name": "Test Delete Workflow " + str(uuid.uuid4()),
        "description": "Workflow created for deletion test",
        "trigger": {"type": "manual"},
        "steps": []
    }

    workflow_id = None

    try:
        # Create workflow
        resp_create = requests.post(
            f"{BASE_URL}/api/workflows",
            headers=HEADERS,
            json=create_payload,
            timeout=TIMEOUT
        )
        assert resp_create.status_code == 200 or resp_create.status_code == 201
        json_create = resp_create.json()
        assert json_create.get("success") is True
        workflow = json_create.get("workflow")
        assert workflow and "id" in workflow
        workflow_id = workflow["id"]

        # Delete the workflow by ID
        resp_delete = requests.delete(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_delete.status_code == 200
        json_delete = resp_delete.json()
        assert json_delete.get("success") is True

        # Verify the workflow is removed by fetching all workflows and ensuring it is not present
        resp_get_all = requests.get(
            f"{BASE_URL}/api/workflows",
            headers=HEADERS,
            timeout=TIMEOUT
        )
        assert resp_get_all.status_code == 200
        json_get_all = resp_get_all.json()
        assert json_get_all.get("success") is True
        workflows = json_get_all.get("workflows") or []
        assert all(wf.get("id") != workflow_id for wf in workflows)

    finally:
        # Cleanup: If workflow still exists (deletion might have failed), attempt delete again to clean
        if workflow_id:
            try:
                requests.delete(
                    f"{BASE_URL}/api/workflows/{workflow_id}",
                    headers=HEADERS,
                    timeout=TIMEOUT
                )
            except Exception:
                pass


test_delete_workflow_by_id()