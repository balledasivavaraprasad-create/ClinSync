"""Normalized error types for ClinSync Model Providers."""

class ModelProviderError(Exception):
    """Base exception for all model provider errors."""
    def __init__(self, message: str, provider: str = "unknown", status_code: int | None = None, is_retryable: bool = False):
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.status_code = status_code
        self.is_retryable = is_retryable

    def __str__(self) -> str:
        return f"[{self.provider.upper()}] {self.message} (status={self.status_code}, retryable={self.is_retryable})"


class ProviderAuthenticationError(ModelProviderError):
    """Raised when authentication credentials fail (HTTP 401/403). Not retryable."""
    def __init__(self, message: str, provider: str = "unknown"):
        super().__init__(message=message, provider=provider, status_code=401, is_retryable=False)


class ProviderRateLimitError(ModelProviderError):
    """Raised when provider rate limits or quotas are exceeded (HTTP 429). Retryable with backoff."""
    def __init__(self, message: str, provider: str = "unknown", retry_after_seconds: float | None = None):
        super().__init__(message=message, provider=provider, status_code=429, is_retryable=True)
        self.retry_after_seconds = retry_after_seconds


class ProviderTimeoutError(ModelProviderError):
    """Raised when an inference call exceeds bounded latency threshold. Retryable."""
    def __init__(self, message: str, provider: str = "unknown", timeout_seconds: float | None = None):
        super().__init__(message=message, provider=provider, status_code=408, is_retryable=True)
        self.timeout_seconds = timeout_seconds


class ProviderUnavailableError(ModelProviderError):
    """Raised when provider endpoint is down or returning server errors (HTTP 500/502/503). Retryable."""
    def __init__(self, message: str, provider: str = "unknown", status_code: int = 503):
        super().__init__(message=message, provider=provider, status_code=status_code, is_retryable=True)


class StructuredOutputValidationError(ModelProviderError):
    """Raised when raw model output fails validation against expected Pydantic schema. Not retryable without prompt adjustment."""
    def __init__(self, message: str, provider: str = "unknown", raw_output: str | None = None, validation_errors: list[dict] | None = None):
        super().__init__(message=message, provider=provider, status_code=422, is_retryable=False)
        self.raw_output = raw_output
        self.validation_errors = validation_errors or []
