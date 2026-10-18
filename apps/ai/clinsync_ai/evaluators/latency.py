"""Latency evaluation for response timing compliance."""

from pydantic import BaseModel


class LatencyEvaluationResult(BaseModel):
    passed: bool
    observed_latency_ms: float
    threshold_latency_ms: float
    details: str


def assert_acceptable_latency(
    observed_latency_ms: float,
    threshold_latency_ms: float = 3000.0,
) -> LatencyEvaluationResult:
    """Assert that LLM generation latency is within acceptable threshold."""
    passed = observed_latency_ms <= threshold_latency_ms
    details = (
        f"Latency {observed_latency_ms:.1f}ms within threshold {threshold_latency_ms:.1f}ms."
        if passed
        else f"Latency SLA breached: {observed_latency_ms:.1f}ms exceeds {threshold_latency_ms:.1f}ms."
    )
    return LatencyEvaluationResult(
        passed=passed,
        observed_latency_ms=observed_latency_ms,
        threshold_latency_ms=threshold_latency_ms,
        details=details,
    )
