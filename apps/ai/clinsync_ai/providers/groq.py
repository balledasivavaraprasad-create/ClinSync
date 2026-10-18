"""Optional Groq fallback provider for text-only generation in ClinSync."""

import json
import os
import time
from typing import Any, Type, TypeVar
from pydantic import BaseModel, ValidationError

from clinsync_ai.providers.base import ModelProvider, ModelResponse, TokenUsage
from clinsync_ai.providers.errors import (
    ModelProviderError,
    ProviderAuthenticationError,
    ProviderRateLimitError,
    ProviderTimeoutError,
    ProviderUnavailableError,
    StructuredOutputValidationError,
)

T = TypeVar("T", bound=BaseModel)


class GroqProvider(ModelProvider):
    """Fallback text-generation provider used during transient Gemini outages."""

    def __init__(self, api_key: str | None = None, default_model: str = "qwen/qwen3.8-27b"):
        self._provider_name = "groq"
        self._api_key = api_key or os.getenv("GROQ_API_KEY", "").strip()
        self._default_model = default_model or os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")
        self._client = None

    @property
    def provider_name(self) -> str:
        return self._provider_name

    @property
    def default_model(self) -> str:
        return self._default_model

    def is_available(self) -> bool:
        return bool(self._api_key)

    def _get_client(self):
        if not self._api_key:
            raise ProviderAuthenticationError(
                "GROQ_API_KEY is not set. Configure it in .env or environment.",
                provider=self.provider_name,
            )
        if self._client is None:
            try:
                from groq import Groq
                self._client = Groq(api_key=self._api_key)
            except Exception as exc:
                raise ModelProviderError(
                    f"Failed to initialize Groq client: {exc}",
                    provider=self.provider_name,
                ) from exc
        return self._client

    def _map_error(self, exc: Exception) -> ModelProviderError:
        err_msg = str(exc).lower()
        if "api_key" in err_msg or "unauthorized" in err_msg or "401" in err_msg or "403" in err_msg:
            return ProviderAuthenticationError(f"Groq authentication failed: {exc}", provider=self.provider_name)
        elif "rate limit" in err_msg or "429" in err_msg:
            return ProviderRateLimitError(f"Groq rate limit exceeded: {exc}", provider=self.provider_name)
        elif "timeout" in err_msg or "deadline" in err_msg or "timed out" in err_msg:
            return ProviderTimeoutError(f"Groq request timed out: {exc}", provider=self.provider_name)
        elif "unavailable" in err_msg or "503" in err_msg or "500" in err_msg:
            return ProviderUnavailableError(f"Groq service unavailable: {exc}", provider=self.provider_name)
        return ModelProviderError(f"Groq call failed: {exc}", provider=self.provider_name)

    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 512,
        timeout: float = 30.0,
    ) -> ModelResponse:
        client = self._get_client()
        target_model = model or self._default_model
        start_time = time.perf_counter()

        messages = []
        if system_instruction:
            messages.append({"role": "system", "content": system_instruction})
        messages.append({"role": "user", "content": prompt})

        try:
            chat_completion = client.chat.completions.create(
                messages=messages,
                model=target_model,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=timeout,
            )
            latency_ms = (time.perf_counter() - start_time) * 1000

            text_out = chat_completion.choices[0].message.content or ""
            usage = TokenUsage()
            if hasattr(chat_completion, "usage") and chat_completion.usage:
                usage.prompt_tokens = getattr(chat_completion.usage, "prompt_tokens", 0) or 0
                usage.completion_tokens = getattr(chat_completion.usage, "completion_tokens", 0) or 0
                usage.total_tokens = getattr(chat_completion.usage, "total_tokens", 0) or 0

            return ModelResponse(
                text=text_out,
                provider=self.provider_name,
                model=target_model,
                latency_ms=latency_ms,
                usage=usage,
                finish_reason=chat_completion.choices[0].finish_reason or "stop",
            )
        except Exception as exc:
            raise self._map_error(exc) from exc

    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        timeout: float = 30.0,
    ) -> tuple[T, ModelResponse]:
        schema_json = json.dumps(response_schema.model_json_schema(), indent=2)
        augmented_system = (
            (system_instruction + "\n\n" if system_instruction else "")
            + f"Output strictly valid JSON matching this schema:\n{schema_json}\n"
            + "Do not include markdown fences, preambles, or explanations."
        )

        client = self._get_client()
        target_model = model or self._default_model
        start_time = time.perf_counter()

        messages = [
            {"role": "system", "content": augmented_system},
            {"role": "user", "content": prompt},
        ]

        try:
            chat_completion = client.chat.completions.create(
                messages=messages,
                model=target_model,
                temperature=temperature,
                response_format={"type": "json_object"},
                timeout=timeout,
            )
            latency_ms = (time.perf_counter() - start_time) * 1000
            raw_text = chat_completion.choices[0].message.content or "{}"

            try:
                parsed = response_schema.model_validate_json(raw_text)
            except ValidationError as val_err:
                raise StructuredOutputValidationError(
                    f"Groq output failed schema validation: {val_err}",
                    provider=self.provider_name,
                    raw_output=raw_text,
                    validation_errors=val_err.errors(),
                ) from val_err

            usage = TokenUsage()
            if hasattr(chat_completion, "usage") and chat_completion.usage:
                usage.prompt_tokens = getattr(chat_completion.usage, "prompt_tokens", 0) or 0
                usage.completion_tokens = getattr(chat_completion.usage, "completion_tokens", 0) or 0
                usage.total_tokens = getattr(chat_completion.usage, "total_tokens", 0) or 0

            resp = ModelResponse(
                text=raw_text,
                provider=self.provider_name,
                model=target_model,
                latency_ms=latency_ms,
                usage=usage,
                finish_reason="stop",
            )
            return parsed, resp
        except StructuredOutputValidationError:
            raise
        except Exception as exc:
            raise self._map_error(exc) from exc
