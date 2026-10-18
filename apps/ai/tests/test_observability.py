"""Tests for observability, telemetry traces, and sensitive data redaction."""

from clinsync_ai.observability.trace import (
    TraceManager,
    redact_sensitive_text,
)


def test_redact_sensitive_text():
    raw_text = (
        "Patient SSN is 123-45-6789, phone is 555-123-4567. "
        "Server used api key gsk_123456789012345678901234567890123456789012345678 and AIzaSyDdummyKey1234567890123456789012"
    )
    redacted = redact_sensitive_text(raw_text)

    assert "123-45-6789" not in redacted
    assert "[REDACTED_SSN]" in redacted
    assert "555-123-4567" not in redacted
    assert "[REDACTED_PHONE]" in redacted
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
