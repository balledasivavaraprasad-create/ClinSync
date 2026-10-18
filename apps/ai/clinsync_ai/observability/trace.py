"""Observability and telemetry tracking for ClinSync AI workflows."""

import logging
import os
import re
import time
from typing import Any
from pydantic import BaseModel, Field

logger = logging.getLogger("clinsync.ai.observability")


def redact_sensitive_text(text: str) -> str:
    """Mask common sensitive patterns (SSN, phone, full DOB, API keys)."""
    if not text:
        return ""
    # Mask API keys
    masked = re.sub(r"(AIza[0-9A-Za-z-_]{20,}|AQ\.[0-9A-Za-z-_]{20,}|gsk_[0-9A-Za-z]{20,}|sk-lf-[0-9a-f-]{20,})", "[REDACTED_KEY]", text)
    # Mask SSN
    masked = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[REDACTED_SSN]", masked)
    # Mask 10-digit phone
    masked = re.sub(r"\b\d{3}[-.]?\d{3}[-.]?\d{4}\b", "[REDACTED_PHONE]", masked)
    return masked


def _format_trace_id(tid: str) -> str:
    """Format trace ID into a valid 32-character lowercase hex string required by Langfuse."""
    import hashlib
    clean = re.sub(r"[^0-9a-fA-F]", "", tid).lower()
    if len(clean) == 32:
        return clean
    return hashlib.md5(tid.encode("utf-8")).hexdigest()


class TraceRecord(BaseModel):
    """Structured record of an individual AI invocation or workflow step."""
    trace_id: str
    step_name: str
    provider: str
    model: str
    latency_ms: float
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    success: bool = True
    error: str | None = None
    fallback_used: bool = False
    timestamp: float = Field(default_factory=time.time)
    metadata: dict[str, Any] = Field(default_factory=dict)


class TraceManager:
    """Manages telemetry events, Langfuse reporting, and local fallback logging."""

    def __init__(
        self,
        enabled: bool | None = None,
        public_key: str | None = None,
        secret_key: str | None = None,
        host: str | None = None,
    ):
        env_enabled = os.getenv("TRACE_ENABLED", "false").lower() in ("true", "1", "yes")
        self.enabled = enabled if enabled is not None else env_enabled
        self.public_key = public_key or os.getenv("LANGFUSE_PUBLIC_KEY") or os.getenv("TRACE_PUBLIC_KEY")
        self.secret_key = secret_key or os.getenv("LANGFUSE_SECRET_KEY") or os.getenv("TRACE_SECRET_KEY")
        self.host = host or os.getenv("LANGFUSE_BASE_URL") or os.getenv("TRACE_HOST", "https://us.cloud.langfuse.com")
        self._langfuse_client = None
        self._in_memory_records: list[TraceRecord] = []

        if self.enabled and self.public_key and self.secret_key:
            try:
                from langfuse import Langfuse
                self._langfuse_client = Langfuse(
                    public_key=self.public_key,
                    secret_key=self.secret_key,
                    host=self.host,
                )
            except Exception as exc:
                logger.warning(f"Could not initialize Langfuse client: {exc}. Operating in local mode.")

    @property
    def is_cloud_enabled(self) -> bool:
        return self._langfuse_client is not None

    def record_step(
        self,
        trace_id: str,
        step_name: str,
        provider: str,
        model: str,
        latency_ms: float,
        prompt: str,
        output: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        success: bool = True,
        error: str | None = None,
        fallback_used: bool = False,
        metadata: dict[str, Any] | None = None,
    ) -> TraceRecord:
        """Record an execution step to memory and emit to Langfuse if enabled."""
        record = TraceRecord(
            trace_id=trace_id,
            step_name=step_name,
            provider=provider,
            model=model,
            latency_ms=latency_ms,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            success=success,
            error=redact_sensitive_text(error) if error else None,
            fallback_used=fallback_used,
            metadata=metadata or {},
        )
        self._in_memory_records.append(record)

        # Log locally
        log_msg = (
            f"[TRACE] id={trace_id} step={step_name} provider={provider}:{model} "
            f"latency={latency_ms:.1f}ms tokens={record.total_tokens} success={success}"
        )
        if fallback_used:
            log_msg += " [FALLBACK_USED]"
        if error:
            log_msg += f" error={record.error}"
        logger.info(log_msg)

        # Emit to Langfuse if configured
        if self._langfuse_client:
            try:
                valid_trace_id = _format_trace_id(trace_id)
                if hasattr(self._langfuse_client, "start_observation"):
                    obs = self._langfuse_client.start_observation(
                        trace_context={"trace_id": valid_trace_id},
                        name=step_name,
                        as_type="generation",
                        model=model,
                        input=redact_sensitive_text(prompt),
                        output=redact_sensitive_text(output),
                        metadata={"provider": provider, "model": model, "fallback": fallback_used, **(metadata or {})},
                        usage_details={
                            "input": prompt_tokens,
                            "output": completion_tokens,
                            "total": prompt_tokens + completion_tokens,
                        },
                        level="ERROR" if not success else "DEFAULT",
                        status_message=record.error,
                    )
                    if hasattr(obs, "end"):
                        obs.end()
                elif hasattr(self._langfuse_client, "trace"):
                    self._langfuse_client.trace(
                        id=trace_id,
                        name=step_name,
                        metadata={"provider": provider, "model": model, "fallback": fallback_used, **(metadata or {})},
                    ).generation(
                        name=step_name,
                        model=model,
                        input=redact_sensitive_text(prompt),
                        output=redact_sensitive_text(output),
                        usage={
                            "input": prompt_tokens,
                            "output": completion_tokens,
                            "total": prompt_tokens + completion_tokens,
                        },
                        level="ERROR" if not success else "DEFAULT",
                        status_message=record.error,
                    )
            except Exception as exc:
                logger.debug(f"Langfuse dispatch error: {exc}")

        return record

    def flush(self) -> None:
        """Flush pending events to remote collector."""
        if self._langfuse_client and hasattr(self._langfuse_client, "flush"):
            try:
                self._langfuse_client.flush()
            except Exception:
                pass

    def get_recent_records(self, limit: int = 50) -> list[TraceRecord]:
        return self._in_memory_records[-limit:]

    def clear(self) -> None:
        self._in_memory_records.clear()


# Global singleton instance
global_trace_manager = TraceManager()
TraceEmitter = TraceManager


def get_trace_emitter() -> TraceManager:
    return global_trace_manager
