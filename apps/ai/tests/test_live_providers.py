"""Live integration tests for Gemini and Groq providers. Skips gracefully if credentials are absent."""

import os
import pytest
from dotenv import load_dotenv
from pydantic import BaseModel

from clinsync_ai.providers.gemini import GeminiProvider
from clinsync_ai.providers.groq import GroqProvider
from clinsync_ai.routing.gateway import ModelGateway

load_dotenv()


class LiveTestSchema(BaseModel):
    greeting: str
    is_working: bool


@pytest.mark.skipif(not os.getenv("GEMINI_API_KEY"), reason="Live GEMINI_API_KEY not configured")
def test_live_gemini_text_and_structured():
    """Live verification of Gemini provider with configured credentials."""
    provider = GeminiProvider()
    assert provider.is_available() is True

    # Test text generation
    text_res = provider.generate_text(
        prompt="Say 'ClinSync online' and nothing else.",
        temperature=0.0,
    )
    assert "ClinSync" in text_res.text or "online" in text_res.text.lower()
    assert text_res.latency_ms > 0
    assert text_res.usage.total_tokens > 0

    # Test structured generation
    parsed, struct_res = provider.generate_structured(
        prompt="Return greeting 'Hello Doctor' and is_working true.",
        response_schema=LiveTestSchema,
    )
    assert parsed.is_working is True
    assert "Hello" in parsed.greeting


@pytest.mark.skipif(not os.getenv("GROQ_API_KEY"), reason="Live GROQ_API_KEY not configured")
def test_live_groq_fallback_text_and_structured():
    """Live verification of Groq fallback provider with configured credentials."""
    provider = GroqProvider()
    assert provider.is_available() is True

    # Test text generation
    text_res = provider.generate_text(
        prompt="Say 'Groq online' and nothing else.",
        temperature=0.0,
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
