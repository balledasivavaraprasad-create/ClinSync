"""Base interface and typed response models for all ClinSync model providers."""

from abc import ABC, abstractmethod
from typing import Any, Type, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T", bound=BaseModel)


class TokenUsage(BaseModel):
    """Normalized token accounting for cost and telemetry tracking."""
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


ProviderUsage = TokenUsage



class ModelResponse(BaseModel):
    """Standardized response container across all LLM providers."""
    text: str
    provider: str
    model: str
    latency_ms: float = 0.0
    usage: TokenUsage = Field(default_factory=TokenUsage)
    finish_reason: str = "stop"
    raw_response: dict[str, Any] | None = None


class ModelProvider(ABC):
    """Abstract interface that every ClinSync LLM adapter must implement."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of provider adapter (e.g. 'gemini', 'groq', 'fake')."""
        pass

    @property
    @abstractmethod
    def default_model(self) -> str:
        """Default model identifier for this provider."""
        pass

    @abstractmethod
    def generate_text(
        self,
        prompt: str,
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.2,
        max_tokens: int = 1024,
        timeout: float = 30.0,
    ) -> ModelResponse:
        """Generate unstructured conversational or narrative text."""
        pass

    @abstractmethod
    def generate_structured(
        self,
        prompt: str,
        response_schema: Type[T],
        system_instruction: str | None = None,
        model: str | None = None,
        temperature: float = 0.0,
        timeout: float = 30.0,
    ) -> tuple[T, ModelResponse]:
        """Generate and strictly parse structured data into a validated Pydantic model."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider client has credentials and is configured."""
        pass
