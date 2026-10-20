"""Gemini Model Provider adapter for ClinSync using Google GenAI SDK."""

import os
import time
from typing import Type, TypeVar

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


class GeminiProvider(ModelProvider):
    """Primary generative adapter for conversational intake, extraction, and doctor summaries."""

    def __init__(self, api_key: str | None = None, default_model: str = "gemini-3.8-flash"):
        self._provider_name = "gemini"
        self._api_key = api_key or os.getenv("GEMINI_API_KEY", "").strip()
        self._default_model = default_model or os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
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
                "GEMINI_API_KEY is not set. Configure it in .env or environment.",
                provider=self.provider_name,
            )
        if self._client is None:
            try:
                from google import genai

                self._client = genai.Client(api_key=self._api_key)
            except Exception as exc:
                raise ModelProviderError(
                    f"Failed to initialize Google GenAI client: {exc}",
                    provider=self.provider_name,
                ) from exc
        return self._client

    def _map_error(self, exc: Exception) -> ModelProviderError:
        err_msg = str(exc).lower()
        if (
            "api_key" in err_msg
            or "unauthenticated" in err_msg
            or "401" in err_msg
            or "403" in err_msg
        ):
            return ProviderAuthenticationError(
                f"Gemini authentication failed: {exc}", provider=self.provider_name
            )
        elif (
            "quota" in err_msg
            or "rate limit" in err_msg
            or "429" in err_msg
            or "resource_exhausted" in err_msg
        ):
            return ProviderRateLimitError(
                f"Gemini rate limit exceeded: {exc}", provider=self.provider_name
            )
        elif "timeout" in err_msg or "deadline" in err_msg or "timed out" in err_msg:
            return ProviderTimeoutError(
                f"Gemini request timed out: {exc}", provider=self.provider_name
            )
        elif (
            "unavailable" in err_msg
            or "503" in err_msg
            or "500" in err_msg
            or "internal" in err_msg
        ):
            return ProviderUnavailableError(
                f"Gemini service unavailable: {exc}", provider=self.provider_name
            )
        return ModelProviderError(f"Gemini call failed: {exc}", provider=self.provider_name)

    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout: float = 30.0,
    ) -> ModelResponse:
        client = self._get_client()
        target_model = model or self._default_model
        start_time = time.perf_counter()

        try:
            from google.genai import types

            config = types.GenerateContentConfig(
                temperature=temperature,
                max_output_tokens=max_tokens,
                system_instruction=system_instruction if system_instruction else None,
            )
            response = client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=config,
            )
            latency_ms = (time.perf_counter() - start_time) * 1000

            text_out = response.text or ""
            usage = TokenUsage()
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage.prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                usage.completion_tokens = (
                    getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                )
                usage.total_tokens = getattr(response.usage_metadata, "total_token_count", 0) or 0

            return ModelResponse(
                text=text_out,
                provider=self.provider_name,
                model=target_model,
                latency_ms=latency_ms,
                usage=usage,
                finish_reason="stop",
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
        client = self._get_client()
        target_model = model or self._default_model
        start_time = time.perf_counter()

        try:
            from google.genai import types

            config = types.GenerateContentConfig(
                temperature=temperature,
                system_instruction=system_instruction if system_instruction else None,
                response_mime_type="application/json",
                response_schema=response_schema,
            )
            response = client.models.generate_content(
                model=target_model,
                contents=prompt,
                config=config,
            )
            latency_ms = (time.perf_counter() - start_time) * 1000

            raw_text = response.text or "{}"
            usage = TokenUsage()
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                usage.prompt_tokens = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                usage.completion_tokens = (
                    getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                )
                usage.total_tokens = getattr(response.usage_metadata, "total_token_count", 0) or 0

            # Validate against Pydantic schema
            try:
                parsed = response_schema.model_validate_json(raw_text)
            except ValidationError as val_err:
                raise StructuredOutputValidationError(
                    f"Gemini output failed schema validation: {val_err}",
                    provider=self.provider_name,
                    raw_output=raw_text,
                    validation_errors=val_err.errors(),
                ) from val_err

            model_resp = ModelResponse(
                text=raw_text,
                provider=self.provider_name,
                model=target_model,
                latency_ms=latency_ms,
                usage=usage,
                finish_reason="stop",
            )
            return parsed, model_resp
        except StructuredOutputValidationError:
            raise
        except Exception as exc:
            raise self._map_error(exc) from exc
