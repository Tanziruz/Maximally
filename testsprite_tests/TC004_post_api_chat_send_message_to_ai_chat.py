import requests

BASE_URL = "http://localhost:3001"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1NWVlMDA5OS0wNGU3LTQ2ZGYtODFlZC03ZTlhOTEzYTZmYzUiLCJlbWFpbCI6IlRhbnppcnV6MjVAZ21haWwuY29tIiwiaWF0IjoxNzY3MDA3Njg3LCJleHAiOjE3Njc2MTI0ODd9.PpmhOqjErdNprROET1LwviTjGE4oN0IWoo5cP-CvAos"
HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def test_post_api_chat_send_message_to_ai_chat():
    url = f"{BASE_URL}/api/chat"
    payload = {
        "message": "Hello AI, please help me create a workflow to send reminder emails."
    }

    try:
        response = requests.post(url, json=payload, headers=HEADERS, timeout=30)
        response.raise_for_status()
        data = response.json()

        assert isinstance(data, dict), "Response is not a JSON object."
        assert "success" in data, "'success' key missing in response."
        assert data["success"] is True, f"API call unsuccessful: {data}"

        assert "conversationId" in data, "'conversationId' missing in response."
        conversation_id = data["conversationId"]
        assert isinstance(conversation_id, str) and conversation_id.strip() != "", "'conversationId' is empty or not a string."

        assert "response" in data, "'response' key missing in response."
        ai_response = data["response"]
        assert isinstance(ai_response, str) and ai_response.strip() != "", "'response' is empty or not a string."

        # workflow object is optional
        if "workflow" in data:
            workflow = data["workflow"]
            assert isinstance(workflow, dict), "'workflow' should be an object if present."
            # Optionally more detailed schema validation can be added here

    except requests.exceptions.RequestException as e:
        assert False, f"Request failed: {e}"

test_post_api_chat_send_message_to_ai_chat()