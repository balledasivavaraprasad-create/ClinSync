"""Deterministic Fake Model Provider for offline testing, evals, and CI."""

import json
from typing import Any, Type, TypeVar

from pydantic import BaseModel

from clinsync_ai.providers.base import ModelProvider, ModelResponse, TokenUsage
from clinsync_ai.providers.errors import (
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    StructuredOutputValidationError,
)

T = TypeVar("T", bound=BaseModel)


class FakeModelProvider(ModelProvider):
    """Configurable offline provider that returns predictable responses without network calls."""

    def __init__(
        self,
        default_model: str = "fake-model-v1",
        canned_text: str = "This is a deterministic offline response.",
        canned_structured: dict[str, Any] | BaseModel | None = None,
        simulate_error: str | None = None,
        simulated_latency_ms: float = 12.0,
    ):
        self._provider_name = "fake"
        self._default_model = default_model
        self.canned_text = canned_text
        self.canned_structured = canned_structured
        self.simulate_error = simulate_error
        self.simulated_latency_ms = simulated_latency_ms
        self.call_history: list[dict[str, Any]] = []

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def default_model(self) -> str:
        return self._default_model

    def is_available(self) -> bool:
        return True

    def _check_simulated_error(self) -> None:
        if not self.simulate_error:
            return
        err = self.simulate_error.lower()
        if "rate_limit" in err or "429" in err:
            raise ProviderRateLimitError(
                "Simulated 429 rate limit exceeded", provider=self.provider_name
            )
        elif "timeout" in err or "408" in err:
            raise ProviderTimeoutError(
                "Simulated inference timeout", provider=self.provider_name, timeout_seconds=5.0
            )
        elif "auth" in err or "401" in err:
            raise ProviderAuthenticationError(
                "Simulated invalid credentials", provider=self.provider_name
            )
        elif "unavailable" in err or "503" in err:
            raise ProviderUnavailableError(
                "Simulated service outage", provider=self.provider_name, status_code=503
            )

    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout: float = 30.0,
    ) -> ModelResponse:
        self.call_history.append(
            {
                "type": "text",
                "prompt": prompt,
                "system_instruction": system_instruction,
                "model": model or self._default_model,
            }
        )
        self._check_simulated_error()

        usage = TokenUsage(
            prompt_tokens=max(1, len(prompt.split())),
            completion_tokens=max(1, len(self.canned_text.split())),
            total_tokens=max(2, len(prompt.split()) + len(self.canned_text.split())),
        )
        return ModelResponse(
            text=self.canned_text,
            provider=self.provider_name,
            model=model or self._default_model,
            latency_ms=self.simulated_latency_ms,
            usage=usage,
            finish_reason="stop",
        )

    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        timeout: float = 30.0,
    ) -> tuple[T, ModelResponse]:
        self.call_history.append(
            {
                "type": "structured",
                "prompt": prompt,
                "response_schema": response_schema.__name__,
                "system_instruction": system_instruction,
                "model": model or self._default_model,
            }
        )
        self._check_simulated_error()

        raw_str = ""
        try:
            if isinstance(self.canned_structured, response_schema):
                parsed = self.canned_structured
                raw_str = parsed.model_dump_json()
            elif isinstance(self.canned_structured, BaseModel):
                data = self.canned_structured.model_dump()
                parsed = response_schema.model_validate(data)
                raw_str = parsed.model_dump_json()
            elif isinstance(self.canned_structured, dict):
                raw_str = json.dumps(self.canned_structured)
                parsed = response_schema.model_validate(self.canned_structured)
            else:
                # Attempt to parse canned text as json if available, else construct default
                try:
                    data = json.loads(self.canned_text)
                    raw_str = self.canned_text
                    parsed = response_schema.model_validate(data)
                except Exception:
                    # Provide default instance if schema permits empty fields
                    parsed = response_schema.model_validate({})
                    raw_str = parsed.model_dump_json()
        except Exception as exc:
            raise StructuredOutputValidationError(
                f"Failed to validate fake model output against {response_schema.__name__}: {exc}",
                provider=self.provider_name,
                raw_output=raw_str or self.canned_text,
            ) from exc

        usage = TokenUsage(
            prompt_tokens=max(1, len(prompt.split())),
            completion_tokens=max(1, len(raw_str.split())),
            total_tokens=max(2, len(prompt.split()) + len(raw_str.split())),
        )
        response = ModelResponse(
            text=raw_str,
            provider=self.provider_name,
            model=model or self._default_model,
            latency_ms=self.simulated_latency_ms,
            usage=usage,
            finish_reason="stop",
        )
        return parsed, response
