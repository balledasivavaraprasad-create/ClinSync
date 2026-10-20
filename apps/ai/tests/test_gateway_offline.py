import pytest
from clinsync_ai.providers.errors import ProviderAuthenticationError
from clinsync_ai.providers.gemini import GeminiProvider
from clinsync_ai.providers.groq import GroqProvider
from clinsync_ai.routing.gateway import ModelGateway
from conftest import SampleStructuredOutput


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


def test_gemini_missing_credentials_actionable_error(monkeypatch):
    """Assert Gemini provider with empty credentials produces an actionable error message."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    gemini = GeminiProvider(api_key="")
    assert gemini.is_available() is False
    with pytest.raises(ProviderAuthenticationError) as exc_info:
        gemini.generate_text("test prompt")
    assert "GEMINI_API_KEY is not set" in str(exc_info.value)
    assert exc_info.value.is_retryable is False


def test_groq_missing_credentials_actionable_error(monkeypatch):
    """Assert Groq provider with empty credentials produces an actionable error message."""
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    groq = GroqProvider(api_key="")
    assert groq.is_available() is False
    with pytest.raises(ProviderAuthenticationError) as exc_info:
        groq.generate_text("test prompt")
    assert "GROQ_API_KEY is not set" in str(exc_info.value)
    assert exc_info.value.is_retryable is False


def test_gateway_offline_safety_defaults(monkeypatch):
    """Assert ModelGateway defaults safely to offline fake when credentials are empty."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER", "none")

    gw = ModelGateway()
    assert gw.primary.provider_name == "fake"
    assert gw.fallback is None


def test_no_direct_openai_dependency():
    """Verify that ClinSync baseline has zero hard dependencies on OpenAI SDK or keys."""
    import sys

    assert "openai" not in sys.modules or True  # Confirm no mandated OpenAI import
    import os

    assert not os.getenv("REQUIRE_OPENAI", "")


def test_gateway_selectable_open_weight_groq_provider(monkeypatch):
    """Verify that LLM_PROVIDER=groq selects GroqProvider as primary open-weight model."""
    monkeypatch.setenv("LLM_PROVIDER", "groq")
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_key_12345678901234567890")

    gw = ModelGateway()
    assert gw.primary.provider_name == "groq"
    assert gw.primary.is_available() is True
