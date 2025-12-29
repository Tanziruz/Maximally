import requests

BASE_URL = "http://localhost:3001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

def test_get_specific_workflow_by_id():
    # Step 1: Create a new workflow to ensure resource exists
    workflow_data = {
        "name": "Test Workflow TC007",
        "description": "Workflow created for testing get specific workflow by ID",
        "trigger": {"type": "manual"},
        "steps": []
    }

    workflow_id = None

    try:
        create_resp = requests.post(
            f"{BASE_URL}/api/workflows",
            headers=HEADERS,
            json=workflow_data,
            timeout=30
        )
        assert create_resp.status_code in (200, 201)
        create_json = create_resp.json()
        assert create_json.get("success") == True
        workflow = create_json.get("workflow")
        assert isinstance(workflow, dict)
        workflow_id = workflow.get("id")
        assert isinstance(workflow_id, str) and len(workflow_id) > 0

        # Step 2: Retrieve the workflow by ID (success case)
        get_resp = requests.get(
            f"{BASE_URL}/api/workflows/{workflow_id}",
            headers=HEADERS,
            timeout=30
        )
        assert get_resp.status_code == 200
        get_json = get_resp.json()
        assert get_json.get("success") == True
        retrieved_workflow = get_json.get("workflow")
        assert isinstance(retrieved_workflow, dict)
        assert retrieved_workflow.get("id") == workflow_id
        assert retrieved_workflow.get("name") == workflow_data["name"]

        # Step 3: Attempt to retrieve a non-existent workflow (error case)
        fake_id = "00000000-0000-0000-0000-000000000000"
        get_notfound_resp = requests.get(
            f"{BASE_URL}/api/workflows/{fake_id}",
            headers=HEADERS,
            timeout=30
        )
        # The API might return 404 or 200 with success false - handle both
        if get_notfound_resp.status_code == 404:
            # Expected not found HTTP status
            pass
        else:
            get_notfound_json = get_notfound_resp.json()
            assert get_notfound_resp.status_code in (400, 404, 200)
            # If success field exists, it should be False
            if "success" in get_notfound_json:
                assert get_notfound_json.get("success") == False

    finally:
        if workflow_id:
            # Cleanup - delete the test workflow
            try:
                del_resp = requests.delete(
                    f"{BASE_URL}/api/workflows/{workflow_id}",
                    headers=HEADERS,
                    timeout=30
                )
                # Consider 200 or 204 as success for delete
                assert del_resp.status_code in (200, 204)
                del_json = del_resp.json() if del_resp.status_code == 200 else {}
                if del_json:
                    assert del_json.get("success") == True
            except Exception:
                pass

test_get_specific_workflow_by_id()
