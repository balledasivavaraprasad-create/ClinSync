"""ModelGateway: Unified, fault-tolerant model access with retries, fallbacks, and telemetry."""

import logging
import os
import time
import uuid
from typing import Type, TypeVar
from pydantic import BaseModel

from clinsync_ai.guardrails.prompt_guard import PromptGuard
from clinsync_ai.guardrails.schema_guard import OutputSchemaGuard
from clinsync_ai.observability.trace import TraceManager, global_trace_manager
from clinsync_ai.providers.base import ModelProvider, ModelResponse
from clinsync_ai.providers.errors import (
    ModelProviderError,
    ProviderAuthenticationError,
    StructuredOutputValidationError,
)
from clinsync_ai.providers.fake import FakeModelProvider
from clinsync_ai.providers.gemini import GeminiProvider
from clinsync_ai.providers.groq import GroqProvider

logger = logging.getLogger("clinsync.ai.gateway")
T = TypeVar("T", bound=BaseModel)


class ModelGateway:
    """Enterprise model gateway for ClinSync. Coordinates primary, fallback, retries, and traces."""

    def __init__(
        self,
        primary_provider: ModelProvider | None = None,
        fallback_provider: ModelProvider | None = None,
        trace_manager: TraceManager | None = None,
        prompt_guard: PromptGuard | None = None,
        max_retries: int = 2,
        initial_backoff_sec: float = 0.5,
    ):
        self.trace_manager = trace_manager or global_trace_manager
        self.prompt_guard = prompt_guard or PromptGuard()
        self.max_retries = max_retries
        self.initial_backoff_sec = initial_backoff_sec

        # Determine primary provider from env or arguments
        llm_choice = os.getenv("LLM_PROVIDER", "gemini").lower()
        if primary_provider is not None:
            self.primary = primary_provider
        elif llm_choice in ("mock", "fake") or not os.getenv("GEMINI_API_KEY"):
            self.primary = FakeModelProvider()
        else:
            self.primary = GeminiProvider()

        # Determine fallback provider from env or arguments
        fallback_choice = os.getenv("LLM_FALLBACK_PROVIDER", "none").lower()
        if fallback_provider is not None:
            self.fallback = fallback_provider
        elif primary_provider is not None:
            # When an explicit primary provider (e.g. test mock) is supplied without fallback, do not fall back to remote
            self.fallback = None
        elif fallback_choice == "groq":
            self.fallback = GroqProvider()
        else:
            self.fallback = None

    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        trace_id: str | None = None,
        step_name: str = "llm_generate_text",
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
    ) -> ModelResponse:
        """Generate text with input guardrails, bounded retries, and automatic fallback."""
        current_trace_id = trace_id or f"trace-{uuid.uuid4().hex[:12]}"

        # Step 1: Input prompt guardrail
        safety = self.prompt_guard.evaluate(prompt)
        if not safety.is_safe:
            err_msg = f"Input prompt rejected by guardrail: {safety.reason}"
            self.trace_manager.record_step(
                trace_id=current_trace_id,
                step_name=step_name,
                provider=self.primary.provider_name,
                model=model or self.primary.default_model,
                latency_ms=0.0,
                prompt=prompt,
                output="",
                success=False,
                error=err_msg,
            )
            raise ModelProviderError(err_msg, provider="gateway", is_retryable=False)

        # Step 2: Attempt with primary provider under bounded retry
        last_error = None
        for attempt in range(self.max_retries + 1):
            start = time.perf_counter()
            try:
                resp = self.primary.generate_text(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    model=model,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                self.trace_manager.record_step(
                    trace_id=current_trace_id,
                    step_name=step_name,
                    provider=resp.provider,
                    model=resp.model,
                    latency_ms=resp.latency_ms,
                    prompt=prompt,
                    output=resp.text,
                    prompt_tokens=resp.usage.prompt_tokens,
                    completion_tokens=resp.usage.completion_tokens,
                    success=True,
                    fallback_used=False,
                )
                return resp
            except Exception as exc:
                last_error = exc
                latency_ms = (time.perf_counter() - start) * 1000
                logger.warning(f"Primary provider attempt {attempt + 1} failed: {exc}")
                if isinstance(exc, ProviderAuthenticationError) or not getattr(exc, "is_retryable", True):
                    # Fail fast on non-retryable errors
                    break
                if attempt < self.max_retries:
                    time.sleep(self.initial_backoff_sec * (2 ** attempt))

        # Step 3: Trigger optional fallback if available and primary failed
        if self.fallback and self.fallback.is_available():
            logger.info(f"Triggering fallback provider {self.fallback.provider_name} for trace {current_trace_id}")
            start = time.perf_counter()
            try:
                resp = self.fallback.generate_text(
                    prompt=prompt,
                    system_instruction=system_instruction,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                self.trace_manager.record_step(
                    trace_id=current_trace_id,
                    step_name=step_name,
                    provider=resp.provider,
                    model=resp.model,
                    latency_ms=resp.latency_ms,
                    prompt=prompt,
                    output=resp.text,
                    prompt_tokens=resp.usage.prompt_tokens,
                    completion_tokens=resp.usage.completion_tokens,
                    success=True,
                    fallback_used=True,
                )
                return resp
            except Exception as fallback_exc:
                logger.error(f"Fallback provider {self.fallback.provider_name} also failed: {fallback_exc}")
                last_error = fallback_exc

        # If all options failed, record trace error and re-raise
        self.trace_manager.record_step(
            trace_id=current_trace_id,
            step_name=step_name,
            provider=self.primary.provider_name,
            model=model or self.primary.default_model,
            latency_ms=0.0,
            prompt=prompt,
            output="",
            success=False,
            error=str(last_error),
            fallback_used=bool(self.fallback),
        )
        if isinstance(last_error, ModelProviderError):
            raise last_error
        raise ModelProviderError(f"All provider attempts failed: {last_error}", provider="gateway") from last_error

    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: str | None = None,
        trace_id: str | None = None,
        step_name: str = "llm_generate_structured",
        model: str | None = None,
        temperature: float = 0.0,
    ) -> tuple[T, ModelResponse]:
        """Generate validated structured output with guardrails, retries, and fallback."""
        current_trace_id = trace_id or f"trace-{uuid.uuid4().hex[:12]}"

        # Step 1: Input guardrail
        safety = self.prompt_guard.evaluate(prompt)
        if not safety.is_safe:
            err_msg = f"Structured generation input rejected: {safety.reason}"
            self.trace_manager.record_step(
                trace_id=current_trace_id,
                step_name=step_name,
                provider=self.primary.provider_name,
                model=model or self.primary.default_model,
                latency_ms=0.0,
                prompt=prompt,
                output="",
                success=False,
                error=err_msg,
            )
            raise ModelProviderError(err_msg, provider="gateway", is_retryable=False)

        # Step 2: Primary provider attempts
        last_error = None
        for attempt in range(self.max_retries + 1):
            try:
                parsed, resp = self.primary.generate_structured(
                    prompt=prompt,
                    response_schema=response_schema,
                    system_instruction=system_instruction,
                    model=model,
                    temperature=temperature,
                )
                # Step 3: Run output guardrail
                validated, _ = OutputSchemaGuard.validate(resp.text, response_schema)
                self.trace_manager.record_step(
                    trace_id=current_trace_id,
                    step_name=step_name,
                    provider=resp.provider,
                    model=resp.model,
                    latency_ms=resp.latency_ms,
                    prompt=prompt,
                    output=resp.text,
                    prompt_tokens=resp.usage.prompt_tokens,
                    completion_tokens=resp.usage.completion_tokens,
                    success=True,
                    fallback_used=False,
                )
                return validated, resp
            except StructuredOutputValidationError as val_exc:
                last_error = val_exc
                # Schema validation error is not retryable without re-prompting
                break
            except Exception as exc:
                last_error = exc
                if isinstance(exc, ProviderAuthenticationError) or not getattr(exc, "is_retryable", True):
                    break
                if attempt < self.max_retries:
                    time.sleep(self.initial_backoff_sec * (2 ** attempt))

        # Step 4: Fallback provider attempt for structured generation
        if self.fallback and self.fallback.is_available():
            logger.info(f"Triggering fallback structured generation via {self.fallback.provider_name}")
            try:
                parsed, resp = self.fallback.generate_structured(
                    prompt=prompt,
                    response_schema=response_schema,
                    system_instruction=system_instruction,
                    temperature=temperature,
                )
                validated, _ = OutputSchemaGuard.validate(resp.text, response_schema)
                self.trace_manager.record_step(
                    trace_id=current_trace_id,
                    step_name=step_name,
                    provider=resp.provider,
                    model=resp.model,
                    latency_ms=resp.latency_ms,
                    prompt=prompt,
                    output=resp.text,
                    prompt_tokens=resp.usage.prompt_tokens,
                    completion_tokens=resp.usage.completion_tokens,
                    success=True,
                    fallback_used=True,
                )
                return validated, resp
            except Exception as fallback_exc:
                logger.error(f"Structured fallback provider {self.fallback.provider_name} failed: {fallback_exc}")
                last_error = fallback_exc

        self.trace_manager.record_step(
            trace_id=current_trace_id,
            step_name=step_name,
            provider=self.primary.provider_name,
            model=model or self.primary.default_model,
            latency_ms=0.0,
            prompt=prompt,
            output="",
            success=False,
            error=str(last_error),
            fallback_used=bool(self.fallback),
        )
        if isinstance(last_error, ModelProviderError):
            raise last_error
        raise ModelProviderError(f"Structured generation failed: {last_error}", provider="gateway") from last_error
