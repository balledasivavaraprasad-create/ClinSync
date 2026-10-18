"""Integration tests for the /api/v1/health endpoint."""

from fastapi.testclient import TestClient


def test_health_check_endpoint(client: TestClient):
    """Verify that /api/v1/health returns HTTP 200 with healthy database connection."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200

    payload = response.json()
    assert "data" in payload
    assert "request_id" in payload

    data = payload["data"]
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["version"] == "0.1.0"
    assert "timestamp" in data

    # Check request ID propagation
    assert len(payload["request_id"]) > 0
    assert response.headers.get("X-Request-ID") == payload["request_id"]


def test_health_check_custom_request_id(client: TestClient):
    """Verify that X-Request-ID header is propagated into the response."""
    custom_id = "req_custom_trace_999"
    response = client.get("/api/v1/health", headers={"X-Request-ID": custom_id})
    assert response.status_code == 200

    payload = response.json()
    assert payload["request_id"] == custom_id
    assert response.headers.get("X-Request-ID") == custom_id
