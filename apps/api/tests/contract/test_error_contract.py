"""Contract tests validating API error shapes against packages/contracts/openapi.json."""

import json
from pathlib import Path

from fastapi.testclient import TestClient

OPENAPI_PATH = Path(__file__).resolve().parents[4] / "packages" / "contracts" / "openapi.json"


def test_error_detail_schema_compliance(client: TestClient):
    """Verify that a 404 error from the API strictly matches the ErrorDetail schema."""
    with open(OPENAPI_PATH, "r", encoding="utf-8") as f:
        spec = json.load(f)

    error_schema = spec["components"]["schemas"]["ErrorDetail"]
    required_fields = set(error_schema["required"])
    allowed_codes = set(error_schema["properties"]["code"]["enum"])

    # Query non-existent route to trigger error handler
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
    payload = response.json()

    # Check required fields
    for field in required_fields:
        assert field in payload, f"Missing required error field: {field}"

    # Check enum values
    assert payload["code"] in allowed_codes, f"Invalid error code: {payload['code']}"
    assert isinstance(payload["message"], str)
    assert isinstance(payload["request_id"], str)
