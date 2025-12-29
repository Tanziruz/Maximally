import requests

BASE_URL = "http://localhost:3001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_post_api_workflows_id_execute_manually_execute_workflow():
    workflow_id = None
    try:
        # Step 1: Create a new workflow to ensure we have a valid workflow ID
        create_payload = {
            "name": "Test Workflow for Manual Execution",
            "description": "Workflow created for test case TC010",
            "trigger": {"type": "manual"},
            "steps": [
                {
                    "name": "Sample Step",
                    "type": "http_request",
                    "config": {
                        "method": "GET",
                        "url": "https://httpbin.org/get"
                    }
                }
            ]
        }
        create_resp = requests.post(
            f"{BASE_URL}/api/workflows",
            json=create_payload,
            headers=HEADERS,
            timeout=30
        )
        assert create_resp.status_code == 200, f"Expected status code 200, got {create_resp.status_code}"
        create_data = create_resp.json()
        assert create_data.get("success") is True, f"Expected success True, got {create_data.get('success')}"
        workflow = create_data.get("workflow")
        assert workflow is not None, "Workflow object is None"
        workflow_id = workflow.get("id")
        assert isinstance(workflow_id, str) and len(workflow_id) > 0, "Invalid workflow id"

        # Step 2: Manually execute the workflow by its ID
        exec_resp = requests.post(
            f"{BASE_URL}/api/workflows/{workflow_id}/execute",
            headers=HEADERS,
            timeout=30
        )
        assert exec_resp.status_code == 200, f"Expected status code 200, got {exec_resp.status_code}"
        exec_data = exec_resp.json()
        # Verify success status
        assert exec_data.get("success") is True, f"Expected success True, got {exec_data.get('success')}"
        # Verify execution object
        execution = exec_data.get("execution")
        assert execution is not None and isinstance(execution, dict), "Execution is None or not a dict"
        # Verify execution has required keys (status, step_results, etc.)
        assert "status" in execution, "Execution missing 'status' key"
        assert "step_results" in execution, "Execution missing 'step_results' key"

    finally:
        # Clean up: Delete the workflow if created
        if workflow_id:
            requests.delete(
                f"{BASE_URL}/api/workflows/{workflow_id}",
                headers=HEADERS,
                timeout=30
            )

test_post_api_workflows_id_execute_manually_execute_workflow()
