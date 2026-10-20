"""Tests for observability, telemetry traces, and sensitive data redaction."""

from clinsync_ai.observability.trace import (
    TraceManager,
    redact_sensitive_text,
    verify_trace_redaction,
)


def test_redact_sensitive_text():
    raw_text = (
        "Patient SSN is 123-45-6789, phone is 555-123-4567, email is patient.doe@hospital.org. "
        "DOB: 1980-05-12, MRN: MRN-8849201. "
        "Authorization: Bearer my-secret-jwt-token-12345. "
        "Server used api key gsk_123456789012345678901234567890123456789012345678 and AIzaSyDdummyKey1234567890123456789012"
    )
    redacted = redact_sensitive_text(raw_text)

    assert "123-45-6789" not in redacted
    assert "[REDACTED_SSN]" in redacted
    assert "555-123-4567" not in redacted
    assert "[REDACTED_PHONE]" in redacted
    assert "patient.doe@hospital.org" not in redacted
    assert "[REDACTED_EMAIL]" in redacted
    assert "1980-05-12" not in redacted
    assert "[REDACTED_DOB]" in redacted
    assert "MRN-8849201" not in redacted
    assert "[REDACTED_MRN]" in redacted
    assert "my-secret-jwt-token-12345" not in redacted
    assert "[REDACTED_TOKEN]" in redacted
    assert "gsk_" not in redacted
    assert "AIza" not in redacted
    assert "[REDACTED_KEY]" in redacted


def test_trace_manager_local_ring_buffer():
    tm = TraceManager(enabled=False)
    tm.record_step(
        trace_id="trace-001",
        step_name="test_step",
        provider="fake",
        model="fake-model",
        latency_ms=15.5,
        prompt="Safe prompt",
        output="Safe output",
        prompt_tokens=10,
        completion_tokens=5,
        success=True,
    )

    records = tm.get_recent_records()
    assert len(records) == 1
    rec = records[0]
    assert rec.trace_id == "trace-001"
    assert rec.latency_ms == 15.5
    assert rec.total_tokens == 15
    assert rec.success is True

    tm.clear()
    assert len(tm.get_recent_records()) == 0


def test_verify_trace_redaction_audit():
    """Assert trace auditing flags unredacted PII and passes clean traces."""
    tm = TraceManager(enabled=False)
    tm.record_step(
        trace_id="trace-audit-001",
        step_name="intake_turn",
        provider="fake",
        model="fake-gemini",
        latency_ms=12.0,
        prompt="Patient reported SSN 123-45-6789 and email john@hospital.org",
        output="Extracted facts for DOB: 1975-02-14",
        error="Failed while contacting key AIzaSyDdummyKey1234567890123456789012",
        metadata={"patient_email": "john@hospital.org"},
    )
    records = tm.get_recent_records()
    passed, violations = verify_trace_redaction(records)
    assert passed is True
    assert len(violations) == 0


def test_langfuse_client_dispatch_receives_only_redacted_payloads():
    """Verify that Langfuse client receives 100% redacted inputs, outputs, and metadata."""
    from unittest.mock import MagicMock

    tm = TraceManager(enabled=True)
    mock_langfuse = MagicMock()
    tm._langfuse_client = mock_langfuse

    tm.record_step(
        trace_id="trace-langfuse-audit",
        step_name="patient_intake_speech",
        provider="gemini",
        model="gemini-2.5-flash",
        latency_ms=250.0,
        prompt=(
            "Patient SSN is 987-65-4321 and email is secret@patient.org with "
            "key AIzaSyDdummyKey1234567890123456789012"
        ),
        output="Patient confirmed allergy to penicillin and phone 555-987-6543",
        error="Bearer eyJhbGciOiJIUzI1NiJ9.secret failed",
        metadata={
            "patient_contact": "secret@patient.org",
            "nested_info": {"ssn": "987-65-4321"},
            "phone_list": ["555-987-6543"],
        },
    )

    mock_langfuse.start_observation.assert_called_once()
    _, kwargs = mock_langfuse.start_observation.call_args

    # Check input/output
    assert "987-65-4321" not in kwargs["input"]
    assert "[REDACTED_SSN]" in kwargs["input"]
    assert "secret@patient.org" not in kwargs["input"]
    assert "[REDACTED_EMAIL]" in kwargs["input"]
    assert "AIza" not in kwargs["input"]
    assert "[REDACTED_KEY]" in kwargs["input"]

    assert "555-987-6543" not in kwargs["output"]
    assert "[REDACTED_PHONE]" in kwargs["output"]

    assert "Bearer eyJhbGciOiJIUzI1NiJ9.secret" not in kwargs["status_message"]
    assert "[REDACTED_TOKEN]" in kwargs["status_message"]

    # Check metadata
    meta = kwargs["metadata"]
    assert meta["patient_contact"] == "[REDACTED_EMAIL]"
    assert meta["nested_info"]["ssn"] == "[REDACTED_SSN]"
    assert meta["phone_list"] == ["[REDACTED_PHONE]"]
