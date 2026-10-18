"""Tests for ModelGateway offline operations."""

import pytest
from conftest import SampleStructuredOutput
from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.routing.gateway import ModelGateway


def test_offline_text_generation(offline_gateway):
    """Assert gateway returns canned text with usage metrics and records trace."""
    response = offline_gateway.generate_text(
        prompt="Hello, I have a cold.",
        system_instruction="Be helpful.",
        trace_id="test-trace-001",
    )

    assert response.provider == "fake"
    assert response.text == "Standard offline clinical assistant response."
    assert response.latency_ms >= 0.0
    assert response.usage.prompt_tokens > 0
    assert response.usage.completion_tokens > 0

    # Verify trace recorded
    records = offline_gateway.trace_manager.get_recent_records()
    assert len(records) == 1
    assert records[0].trace_id == "test-trace-001"
    assert records[0].success is True


def test_offline_structured_generation(offline_gateway):
    """Assert gateway generates and validates structured output offline."""
    parsed, response = offline_gateway.generate_structured(
        prompt="Patient describes seasonal rhinitis.",
        response_schema=SampleStructuredOutput,
        trace_id="test-trace-002",
    )

    assert isinstance(parsed, SampleStructuredOutput)
    assert parsed.urgency_level == "LOW"
    assert "headache" in parsed.symptoms
    assert response.provider == "fake"
    assert response.usage.total_tokens > 0

    records = offline_gateway.trace_manager.get_recent_records()
    assert any(r.trace_id == "test-trace-002" and r.success is True for r in records)
