"""Unit tests for error envelopes and exception handling."""

from app.core.errors import (
    ClinSyncAppException,
    ErrorCode,
    FieldError,
    clinsync_app_exception_handler,
    generic_exception_handler,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient


def test_clinsync_app_exception_structure():
    """Verify custom exception preserves status code, error code, and field errors."""
    field_err = FieldError(field="candidate_id", message="Candidate ID not found")
    exc = ClinSyncAppException(
        status_code=404,
        code=ErrorCode.NOT_FOUND,
        message="Patient record does not exist",
        field_errors=[field_err],
    )
    assert exc.status_code == 404
    assert exc.code == ErrorCode.NOT_FOUND
    assert exc.message == "Patient record does not exist"
    assert exc.field_errors is not None
    assert len(exc.field_errors) == 1
    assert exc.field_errors[0].field == "candidate_id"


def test_error_handlers_with_test_app():
    """Verify exception handlers return valid JSON matching ErrorDetail schema."""
    test_app = FastAPI()
    test_app.add_exception_handler(ClinSyncAppException, clinsync_app_exception_handler)
    test_app.add_exception_handler(Exception, generic_exception_handler)

    @test_app.get("/trigger-app-error")
    def trigger_app_error():
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.ACCESS_DENIED,
            message="Unauthorized hospital access",
        )

    @test_app.get("/trigger-crash")
    def trigger_crash():
        raise RuntimeError("Secret internal failure that must not leak")

    client = TestClient(test_app, raise_server_exceptions=False)

    # Test custom app exception
    resp = client.get("/trigger-app-error", headers={"X-Request-ID": "req_custom_123"})
    assert resp.status_code == 403
    data = resp.json()
    assert data["code"] == "ACCESS_DENIED"
    assert data["message"] == "Unauthorized hospital access"
    assert data["request_id"] == "req_custom_123"

    # Test generic exception redaction
    crash_resp = client.get("/trigger-crash", headers={"X-Request-ID": "req_crash_456"})
    assert crash_resp.status_code == 500
    crash_data = crash_resp.json()
    assert crash_data["code"] == "INTERNAL_ERROR"
    assert "Secret internal failure" not in crash_data["message"]
    assert crash_data["request_id"] == "req_crash_456"
