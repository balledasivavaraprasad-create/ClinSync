"""Pytest configuration and shared fixtures for clinsync-ai."""

import sys
from pathlib import Path

import pytest
from pydantic import BaseModel

# Ensure apps/ai and repository root are on python path
repo_root = Path(__file__).resolve().parent.parent.parent.parent
apps_ai_root = Path(__file__).resolve().parent.parent

if str(apps_ai_root) not in sys.path:
    sys.path.insert(0, str(apps_ai_root))
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from clinsync_ai.observability.trace import TraceManager
from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.routing.gateway import ModelGateway


class SampleStructuredOutput(BaseModel):
    summary: str
    symptoms: list[str]
    urgency_level: str
    requires_doctor_review: bool


@pytest.fixture
def fake_structured_data() -> SampleStructuredOutput:
    return SampleStructuredOutput(
        summary="Patient has mild headache and congestion for 2 days.",
        symptoms=["headache", "nasal congestion"],
        urgency_level="LOW",
        requires_doctor_review=True,
    )


@pytest.fixture
def fake_provider(fake_structured_data) -> FakeModelProvider:
    return FakeModelProvider(
        default_model="fake-gemini-v1",
        canned_text="Standard offline clinical assistant response.",
        canned_structured=fake_structured_data,
    )


@pytest.fixture
def isolated_trace_manager() -> TraceManager:
    return TraceManager(enabled=False)


@pytest.fixture
def offline_gateway(fake_provider, isolated_trace_manager) -> ModelGateway:
    return ModelGateway(
        primary_provider=fake_provider,
        fallback_provider=None,
        trace_manager=isolated_trace_manager,
        max_retries=1,
        initial_backoff_sec=0.01,
    )
