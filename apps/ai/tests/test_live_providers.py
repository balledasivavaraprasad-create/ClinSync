"""Live integration tests for Gemini and Groq providers. Skips gracefully if credentials are absent."""

import os
import time
import pytest
from dotenv import load_dotenv
from pydantic import BaseModel

from clinsync_ai.providers.errors import ProviderRateLimitError, ProviderUnavailableError
from clinsync_ai.providers.gemini import GeminiProvider
from clinsync_ai.providers.groq import GroqProvider

load_dotenv()
RUN_LIVE = os.getenv("RUN_LIVE_TESTS", "false").lower() == "true"


class LiveTestSchema(BaseModel):
    greeting: str
    is_working: bool


@pytest.mark.skipif(
    not (RUN_LIVE and os.getenv("GEMINI_API_KEY")),
    reason="Live tests opt-in: set RUN_LIVE_TESTS=true and GEMINI_API_KEY",
)
def test_live_gemini_text_and_structured():
    """Live verification of Gemini provider with configured credentials."""
    provider = GeminiProvider()
    assert provider.is_available() is True

    try:
        # Test text generation with retry on transient 503/429
        text_res = None
        for attempt in range(3):
            try:
                text_res = provider.generate_text(
                    prompt="Say 'ClinSync online' and nothing else.",
                    temperature=0.0,
                )
                break
            except (ProviderUnavailableError, ProviderRateLimitError):
                if attempt == 2:
                    raise
                time.sleep(1.0)

        assert text_res is not None
        assert "ClinSync" in text_res.text or "online" in text_res.text.lower()
        assert text_res.latency_ms > 0
        assert text_res.usage.total_tokens > 0

        # Test structured generation
        parsed = None
        for attempt in range(3):
            try:
                parsed, struct_res = provider.generate_structured(
                    prompt="Return greeting 'Hello Doctor' and is_working true.",
                    response_schema=LiveTestSchema,
                )
                break
            except (ProviderUnavailableError, ProviderRateLimitError):
                if attempt == 2:
                    raise
                time.sleep(1.0)

        assert parsed is not None
        assert parsed.is_working is True
        assert "Hello" in parsed.greeting
    except (ProviderUnavailableError, ProviderRateLimitError) as exc:
        pytest.skip(f"Live Gemini service temporarily unavailable or rate-limited: {exc}")


@pytest.mark.skipif(
    not (RUN_LIVE and os.getenv("GROQ_API_KEY")),
    reason="Live tests opt-in: set RUN_LIVE_TESTS=true and GROQ_API_KEY",
)
def test_live_groq_fallback_text_and_structured():
    """Live verification of Groq fallback provider with configured credentials."""
    provider = GroqProvider()
    assert provider.is_available() is True

    try:
        # Test text generation with max_tokens within free limit
        text_res = provider.generate_text(
            prompt="Say 'Groq online' and nothing else.",
            temperature=0.0,
            max_tokens=256,
        )
        assert len(text_res.text.strip()) > 0
        assert text_res.latency_ms > 0

        # Test structured generation
        parsed, struct_res = provider.generate_structured(
            prompt="Return greeting 'Hello Fallback' and is_working true.",
            response_schema=LiveTestSchema,
        )
        assert parsed.is_working is True
        assert "Hello" in parsed.greeting
    except (ProviderUnavailableError, ProviderRateLimitError) as exc:
        pytest.skip(f"Live Groq service temporarily unavailable or rate-limited: {exc}")
