"""In-memory sliding-window API rate limiter middleware.

Enforces separate request limits for high-cost AI operations and general CRUD routes:
- AI operations (/brief, /documents, /routing, /answers): 10 req/min (configurable)
- General CRUD operations: 60 req/min (configurable)
- Exceeding limit returns HTTP 429 with 'Retry-After' and 'X-RateLimit-*' headers.

Trusted Proxy Handling:
- Respects X-Forwarded-For only when the immediate peer is in TRUSTED_PROXIES.

Architectural Limitations:
1. Process-local storage: Counters live in Python process memory. In multi-worker
   deployments (e.g., uvicorn workers > 1), limits apply per worker unless backed by
   an external distributed store like Redis.
2. Volatility: Restarting the server clears in-memory rate-limit buckets.
3. For single-instance clinic appliances and hackathon demonstration, this in-memory
   implementation provides robust, zero-dependency protection against API exhaustion.
"""

import threading
import time
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse, Response

from app.core.config import get_settings
from app.core.errors import ErrorCode, get_request_id


class SlidingWindowRateLimiter:
    """Thread-safe sliding-window in-memory rate limiter."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        # Map of key -> list of float timestamps
        self._buckets: dict[str, list[float]] = {}

    def is_allowed(
        self,
        key: str,
        limit: int,
        window_seconds: int,
        now: Optional[float] = None,
    ) -> tuple[bool, int, int]:
        """Check if request is allowed under sliding window.

        Args:
            key: Rate limit bucket key (e.g. '192.168.1.1:ai').
            limit: Maximum requests allowed in window.
            window_seconds: Sliding window duration in seconds.
            now: Current timestamp (optional, defaults to time.time()).

        Returns:
            Tuple of (is_allowed: bool, remaining: int, retry_after: int)
        """
        current_time = now if now is not None else time.time()
        window_start = current_time - window_seconds

        with self._lock:
            timestamps = self._buckets.get(key, [])
            # Evict timestamps outside current sliding window
            valid_timestamps = [t for t in timestamps if t > window_start]

            if len(valid_timestamps) >= limit:
                # Earliest timestamp in window dictates retry-after
                earliest = valid_timestamps[0]
                retry_after = max(1, int(window_seconds - (current_time - earliest)) + 1)
                self._buckets[key] = valid_timestamps
                return False, 0, retry_after

            # Allow request and append timestamp
            valid_timestamps.append(current_time)
            self._buckets[key] = valid_timestamps
            remaining = max(0, limit - len(valid_timestamps))
            return True, remaining, 0

    def reset(self) -> None:
        """Clear all rate limit buckets (used in test teardown)."""
        with self._lock:
            self._buckets.clear()


# Global limiter instance
limiter = SlidingWindowRateLimiter()


def resolve_client_ip(request: Request, trusted_proxies: list[str]) -> str:
    """Extract client IP safely respecting trusted proxy boundaries."""
    client_host = request.client.host if request.client else "127.0.0.1"

    # Only inspect X-Forwarded-For if client peer is a designated trusted proxy
    if client_host in trusted_proxies:
        x_forwarded_for = request.headers.get("X-Forwarded-For")
        if x_forwarded_for:
            # Parse leftmost untrusted IP
            ips = [ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()]
            if ips:
                return ips[0]

    return client_host


def classify_route_tier(path: str) -> Optional[str]:
    """Determine whether request belongs to 'ai', 'crud', or is 'exempt'."""
    # Exempt health checks and API documentation
    if any(path.endswith(p) or path == p for p in ("/health", "/docs", "/redoc", "/openapi.json")):
        return None

    # High-cost AI and extraction routes
    ai_indicators = ("/brief", "/documents", "/routing/review", "/answers")
    if any(indicator in path for indicator in ai_indicators):
        return "ai"

    # Default to standard CRUD tier
    return "crud"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Starlette middleware that enforces sliding-window rate limits."""

    async def dispatch(self, request: Request, call_next) -> Response:
        settings = getattr(request.app.state, "settings", None) or get_settings()

        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        path = request.url.path
        tier = classify_route_tier(path)

        # Skip rate limiting for exempt paths
        if tier is None:
            return await call_next(request)

        # Determine limits based on tier
        if tier == "ai":
            limit = settings.RATE_LIMIT_AI_PER_MINUTE
        else:
            limit = settings.RATE_LIMIT_CRUD_PER_MINUTE

        window_seconds = settings.RATE_LIMIT_WINDOW_SECONDS
        client_ip = resolve_client_ip(request, settings.TRUSTED_PROXIES)
        bucket_key = f"{client_ip}:{tier}"

        allowed, remaining, retry_after = limiter.is_allowed(
            key=bucket_key,
            limit=limit,
            window_seconds=window_seconds,
        )

        if not allowed:
            req_id = get_request_id(request)
            content = {
                "code": ErrorCode.RATE_LIMIT_EXCEEDED.value,
                "message": (
                    f"Rate limit exceeded: maximum {limit} requests per {window_seconds}s "
                    f"for {tier.upper()} operations. Please wait {retry_after}s before retrying."
                ),
                "request_id": req_id,
            }
            return JSONResponse(
                status_code=429,
                content=content,
                headers={
                    "Retry-After": str(retry_after),
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(retry_after),
                },
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
