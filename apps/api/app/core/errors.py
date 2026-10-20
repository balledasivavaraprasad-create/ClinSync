"""Custom application exceptions, error codes, and standardized error responses."""

from enum import Enum
from typing import Optional

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException as StarletteHTTPException


class ErrorCode(str, Enum):
    """Canonical error codes matching openapi.json ErrorDetail schema."""

    IDENTITY_NOT_CONFIRMED = "IDENTITY_NOT_CONFIRMED"
    ACCESS_DENIED = "ACCESS_DENIED"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    DOCUMENT_PARSE_FAILED = "DOCUMENT_PARSE_FAILED"
    EXTRACTION_UNCERTAIN = "EXTRACTION_UNCERTAIN"
    POLICY_REVIEW_REQUIRED = "POLICY_REVIEW_REQUIRED"
    SLOT_UNAVAILABLE = "SLOT_UNAVAILABLE"
    IDEMPOTENCY_CONFLICT = "IDEMPOTENCY_CONFLICT"
    MODEL_TIMEOUT = "MODEL_TIMEOUT"
    MODEL_OUTPUT_INVALID = "MODEL_OUTPUT_INVALID"
    NOT_FOUND = "NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"


class FieldError(BaseModel):
    """Validation error on an individual field."""

    field: str
    message: str


class ErrorDetail(BaseModel):
    """Standardized error envelope conforming to API contracts."""

    code: ErrorCode
    message: str
    request_id: str
    field_errors: Optional[list[FieldError]] = None


class ClinSyncAppException(Exception):
    """Base exception for application business rule violations."""

    def __init__(
        self,
        status_code: int,
        code: ErrorCode,
        message: str,
        field_errors: Optional[list[FieldError]] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field_errors = field_errors


def get_request_id(request: Request) -> str:
    """Retrieve request_id from state or header with fallback."""
    return getattr(request.state, "request_id", request.headers.get("X-Request-ID", "req_unknown"))


async def clinsync_app_exception_handler(
    request: Request, exc: ClinSyncAppException
) -> JSONResponse:
    """Handle custom application exceptions."""
    payload = ErrorDetail(
        code=exc.code,
        message=exc.message,
        request_id=get_request_id(request),
        field_errors=exc.field_errors,
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump(exclude_none=True))


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert FastAPI/Pydantic validation errors into standard ErrorDetail."""
    field_errors: list[FieldError] = []
    for err in exc.errors():
        field_path = ".".join(str(loc) for loc in err["loc"] if loc != "body")
        field_errors.append(
            FieldError(
                field=field_path or "root",
                message=err.get("msg", "Invalid value"),
            )
        )

    payload = ErrorDetail(
        code=ErrorCode.VALIDATION_ERROR,
        message="Request payload validation failed",
        request_id=get_request_id(request),
        field_errors=field_errors,
    )
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=payload.model_dump(exclude_none=True),
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle Starlette / FastAPI HTTPExceptions."""
    if exc.status_code == 404:
        code = ErrorCode.NOT_FOUND
    elif exc.status_code == 403:
        code = ErrorCode.ACCESS_DENIED
    elif exc.status_code in (400, 422):
        code = ErrorCode.VALIDATION_ERROR
    else:
        code = ErrorCode.INTERNAL_ERROR
    payload = ErrorDetail(
        code=code,
        message=str(exc.detail),
        request_id=get_request_id(request),
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump(exclude_none=True))


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all unhandled exception handler ensuring no stack traces leak."""
    payload = ErrorDetail(
        code=ErrorCode.INTERNAL_ERROR,
        message="An unexpected server error occurred. Please try again later.",
        request_id=get_request_id(request),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=payload.model_dump(exclude_none=True),
    )
