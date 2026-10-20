"""FastAPI authentication and authorization dependencies for role-based access control (RBAC).

Enforces token verification, role permissions, and cross-patient isolation.
Rejects missing, invalid, expired, and insufficiently privileged tokens.
"""

from typing import Any, Callable, Optional

from fastapi import Depends, Header, Request

from app.auth.security import verify_access_token
from app.core.errors import ClinSyncAppException, ErrorCode


def get_optional_auth(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
) -> Optional[dict[str, Any]]:
    """Extract and cryptographically verify Bearer token or Session token if present.

    Returns None if no token provided.
    Raises 401 ACCESS_DENIED if token is present but invalid, malformed, or expired.
    """
    token: Optional[str] = None

    if authorization and authorization.strip():
        parts = authorization.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
        elif len(parts) == 1:
            token = parts[0]
        else:
            raise ClinSyncAppException(
                status_code=401,
                code=ErrorCode.ACCESS_DENIED,
                message="Malformed Authorization header format. Expected 'Bearer <token>'.",
            )
    elif x_session_token and x_session_token.strip():
        token = x_session_token.strip()

    if not token:
        return None

    claims = verify_access_token(token)
    request.state.auth = claims
    return claims


def get_current_auth(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_session_token: Optional[str] = Header(None, alias="X-Session-Token"),
) -> dict[str, Any]:
    """Extract and cryptographically verify Bearer token or Session token.

    Requires valid credentials. Raises 401 if missing, invalid, or expired.
    """
    claims = get_optional_auth(
        request=request,
        authorization=authorization,
        x_session_token=x_session_token,
    )
    if not claims:
        raise ClinSyncAppException(
            status_code=401,
            code=ErrorCode.ACCESS_DENIED,
            message="Authentication credentials were not provided.",
        )
    return claims


def require_role(allowed_roles: list[str]) -> Callable[..., dict[str, Any]]:
    """Dependency factory checking that caller's token possesses an authorized role."""

    def role_checker(auth: dict[str, Any] = Depends(get_current_auth)) -> dict[str, Any]:
        role = auth.get("role", "")
        if role not in allowed_roles:
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.ACCESS_DENIED,
                message=(
                    f"Insufficient permissions: role '{role}' is not authorized for this resource."
                ),
            )
        return auth

    return role_checker


# Commonly used role dependencies
require_doctor = require_role(["doctor", "admin"])
require_staff = require_role(["staff", "admin"])
require_staff_or_doctor = require_role(["doctor", "staff", "admin"])


def require_doctor_scoping(
    doctor_id: str,
    auth: dict[str, Any] = Depends(require_staff_or_doctor),
) -> dict[str, Any]:
    """Ensure doctor caller is authorized for the requested doctor_id queue or action."""
    caller_id = auth.get("sub", "")
    caller_role = auth.get("role", "")

    # Admins/staff can inspect queues for coordination; individual doctors inspect their own
    if caller_role not in ("admin", "staff") and caller_id != doctor_id:
        raise ClinSyncAppException(
            status_code=403,
            code=ErrorCode.ACCESS_DENIED,
            message=(
                f"Access denied: Doctor '{caller_id}' is not authorized to "
                f"access queue for '{doctor_id}'."
            ),
        )
    return auth


def require_patient_access(
    patient_id: str,
    auth: dict[str, Any] = Depends(get_current_auth),
) -> dict[str, Any]:
    """Ensure clinical context access is strictly scoped to the authorized patient or clinician.

    - Doctors and staff may access patient records for care delivery.
    - Patient tokens can ONLY access their own record (matching 'sub' == patient_id).
    - Cross-patient access attempts are rejected with 403 ACCESS_DENIED.
    """
    caller_role = auth.get("role", "")
    caller_id = auth.get("sub", "")

    # Clinicians and hospital staff have legitimate operational access
    if caller_role in ("doctor", "staff", "admin"):
        return auth

    # Patient role is strictly scoped to their own patient_id
    if caller_role == "patient":
        if caller_id != patient_id:
            raise ClinSyncAppException(
                status_code=403,
                code=ErrorCode.ACCESS_DENIED,
                message="Access denied: Cannot access clinical context of another patient.",
            )
        return auth

    # Any other unrecognized role
    raise ClinSyncAppException(
        status_code=403,
        code=ErrorCode.ACCESS_DENIED,
        message=f"Access denied: role '{caller_role}' is not authorized to view patient records.",
    )
