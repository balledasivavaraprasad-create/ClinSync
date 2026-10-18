"""Request ID dependency."""

import uuid

from fastapi import Request


def get_current_request_id(request: Request) -> str:
    """Extract or generate request_id for the current request."""
    if hasattr(request.state, "request_id"):
        return request.state.request_id
    header_id = request.headers.get("X-Request-ID")
    req_id = header_id if header_id else f"req_{uuid.uuid4().hex[:12]}"
    request.state.request_id = req_id
    return req_id
