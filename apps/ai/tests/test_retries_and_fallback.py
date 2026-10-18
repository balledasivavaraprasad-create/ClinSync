"""Tests for retry policies, timeout handling, and automatic fallback switching."""

import pytest
from conftest import SampleStructuredOutput
from clinsync_ai.providers.errors import ModelProviderError
from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.routing.gateway import ModelGateway


def test_automatic_fallback_on_primary_rate_limit(fake_structured_data, isolated_trace_manager):
    """Primary fails with 429; gateway cleanly fails over to fallback provider."""
    primary_flaky = FakeModelProvider(
        default_model="primary-gemini",
        simulate_error="rate_limit",
    )
    fallback_healthy = FakeModelProvider(
        default_model="fallback-groq",
        canned_text="Fallback response after primary rate limit.",
        canned_structured=fake_structured_data,
    )

    gateway = ModelGateway(
        primary_provider=primary_flaky,
        fallback_provider=fallback_healthy,
        trace_manager=isolated_trace_manager,
        max_retries=1,
        initial_backoff_sec=0.01,
    )

    response = gateway.generate_text(
        prompt="Describe patient symptoms.",
        trace_id="trace-fallback-test",
    )

    assert response.provider == "fake"
    assert response.model == "fallback-groq"
    assert "Fallback response" in response.text

    records = isolated_trace_manager.get_recent_records()
    assert len(records) == 1
    assert records[0].fallback_used is True
    assert records[0].success is True


def test_automatic_fallback_on_structured_generation(fake_structured_data, isolated_trace_manager):
    """Primary fails with timeout; structured generation switches to fallback provider."""
    primary_timeout = FakeModelProvider(
        default_model="primary-gemini",
        simulate_error="timeout",
    )
    fallback_healthy = FakeModelProvider(
        default_model="fallback-groq",
        canned_structured=fake_structured_data,
    )

    gateway = ModelGateway(
        primary_provider=primary_timeout,
        fallback_provider=fallback_healthy,
        trace_manager=isolated_trace_manager,
        max_retries=1,
        initial_backoff_sec=0.01,
    )

    parsed, response = gateway.generate_structured(
        prompt="Extract structured symptom data.",
        response_schema=SampleStructuredOutput,
        trace_id="trace-structured-fallback",
    )

    assert parsed.urgency_level == "LOW"
    assert response.model == "fallback-groq"

    records = isolated_trace_manager.get_recent_records()
    assert records[-1].fallback_used is True
    assert records[-1].success is True


def test_both_providers_fail_raises_normalized_error(isolated_trace_manager):
    """When both primary and fallback fail, gateway raises ModelProviderError without hanging."""
    primary_err = FakeModelProvider(simulate_error="unavailable")
    fallback_err = FakeModelProvider(simulate_error="unavailable")

    gateway = ModelGateway(
        primary_provider=primary_err,
        fallback_provider=fallback_err,
        trace_manager=isolated_trace_manager,
        max_retries=0,
    )

    with pytest.raises(ModelProviderError):
        gateway.generate_text(prompt="Hello", trace_id="trace-all-fail")

    records = isolated_trace_manager.get_recent_records()
    assert records[-1].success is False
    assert records[-1].error is not None
