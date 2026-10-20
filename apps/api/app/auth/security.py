"""Authentication and cryptographic token operations using RFC 7519 HMAC-SHA256 (HS256).

Conforms strictly to established project conventions and standard libraries
(hmac, hashlib, base64, json, time) without external cryptographic dependencies.
"""

import base64
import hashlib
import hmac
import json
import time
from datetime import timedelta
from typing import Any, Optional

from app.core.config import get_settings
from app.core.errors import ClinSyncAppException, ErrorCode


def _b64encode_urlsafe(data: bytes) -> str:
    """Encode bytes to unpadded base64url string."""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64decode_urlsafe(data: str) -> bytes:
    """Decode unpadded or padded base64url string to bytes."""
    rem = len(data) % 4
    if rem > 0:
        data += "=" * (4 - rem)
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def create_access_token(
    payload: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    secret_key: Optional[str] = None,
) -> str:
    """Create a signed RFC 7519 HS256 JWT token.

    Args:
        payload: Claims dictionary including 'sub', 'role', etc.
        expires_delta: Optional custom expiration window.
        secret_key: Optional secret override.

    Returns:
        Compact dot-separated JWT string: header.payload.signature
    """
    settings = get_settings()
    key = (secret_key or settings.JWT_SECRET).encode("utf-8")
    now = int(time.time())

    # Clone payload to prevent mutating caller dict
    claims = dict(payload)
    if "iat" not in claims:
        claims["iat"] = now
    if "exp" not in claims:
        if expires_delta:
            claims["exp"] = now + int(expires_delta.total_seconds())
        else:
            claims["exp"] = now + (settings.JWT_EXPIRES_MINUTES * 60)

    header = {"alg": "HS256", "typ": "JWT"}

    header_bytes = json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    payload_bytes = json.dumps(claims, separators=(",", ":"), sort_keys=True).encode("utf-8")

    header_b64 = _b64encode_urlsafe(header_bytes)
    payload_b64 = _b64encode_urlsafe(payload_bytes)

    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
    signature = hmac.new(key, signing_input, hashlib.sha256).digest()
    signature_b64 = _b64encode_urlsafe(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


def verify_access_token(
    token: str,
    secret_key: Optional[str] = None,
) -> dict[str, Any]:
    """Verify cryptographic signature and expiration of an HS256 JWT.

    Args:
        token: Compact dot-separated JWT string.
        secret_key: Optional secret override.

    Returns:
        Decoded claims dictionary.

    Raises:
        ClinSyncAppException(401, ACCESS_DENIED) if token is invalid or expired.
    """
    if not token or not isinstance(token, str):
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Authentication credentials were not provided or token is empty.",
        )

    clean_token = token.strip()
    if clean_token.startswith("conf_"):
        clean_token = clean_token[5:]

    parts = clean_token.split(".")
    if len(parts) != 3:
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Malformed authentication token structure.",
        )

    header_b64, payload_b64, signature_b64 = parts

    settings = get_settings()
    key = (secret_key or settings.JWT_SECRET).encode("utf-8")
    signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

    expected_sig = hmac.new(key, signing_input, hashlib.sha256).digest()
    expected_sig_b64 = _b64encode_urlsafe(expected_sig)

    # Constant-time comparison to prevent timing attacks
    if not hmac.compare_digest(signature_b64, expected_sig_b64):
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Invalid authentication token signature.",
        )

    try:
        payload_bytes = _b64decode_urlsafe(payload_b64)
        claims = json.loads(payload_bytes.decode("utf-8"))
    except Exception as exc:
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message=f"Unable to parse token payload: {exc}",
        ) from exc

    now = int(time.time())
    exp = claims.get("exp")
    if exp is not None and now > int(exp):
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Authentication token has expired.",
        )

    return claims


def create_doctor_token(
    doctor_id: str,
    name: str = "",
    department: str = "Cardiology",
    expires_minutes: Optional[int] = None,
) -> str:
    """Generate a valid doctor authentication token."""
    delta = timedelta(minutes=expires_minutes) if expires_minutes else None
    return create_access_token(
        payload={
            "sub": doctor_id,
            "role": "doctor",
            "name": name or doctor_id,
            "department": department,
        },
        expires_delta=delta,
    )


def create_staff_token(
    staff_id: str,
    name: str = "Front Desk Staff",
    expires_minutes: Optional[int] = None,
) -> str:
    """Generate a valid hospital staff authentication token."""
    delta = timedelta(minutes=expires_minutes) if expires_minutes else None
    return create_access_token(
        payload={
            "sub": staff_id,
            "role": "staff",
            "name": name,
        },
        expires_delta=delta,
    )


def create_patient_token(
    patient_id: str,
    session_id: Optional[str] = None,
    expires_minutes: Optional[int] = None,
) -> str:
    """Generate a scoped patient session token."""
    settings = get_settings()
    exp_mins = expires_minutes or settings.PATIENT_SESSION_EXPIRES_MINUTES
    if not session_id:
        digest = hashlib.sha256(patient_id.encode("utf-8")).hexdigest()[:16]
        session_id = f"sess_{digest}"
    return create_access_token(
        payload={
            "sub": patient_id,
            "role": "patient",
            "session_id": session_id,
        },
        expires_delta=timedelta(minutes=exp_mins),
    )
