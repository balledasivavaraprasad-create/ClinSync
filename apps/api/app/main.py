"""FastAPI application factory, lifespan, and middleware setup."""

import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import api_v1_router
from app.core.config import Settings, get_settings
from app.core.errors import (
    ClinSyncAppException,
    clinsync_app_exception_handler,
    generic_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.core.logging import logger, setup_logging
from app.core.rate_limit import RateLimitMiddleware
from app.db.base import Base
from app.db.session import engine


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Assigns or propagates X-Request-ID and logs latency without leaking payloads."""

    async def dispatch(self, request: Request, call_next):
        req_id = request.headers.get("X-Request-ID") or f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = req_id
        start_time = time.perf_counter()

        response = await call_next(request)

        duration_ms = (time.perf_counter() - start_time) * 1000.0
        response.headers["X-Request-ID"] = req_id
        logger.info(
            f"{request.method} {request.url.path} -> "
            f"{response.status_code} ({duration_ms:.2f}ms) [req_id={req_id}]"
        )
        return response


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager."""
    settings = get_settings()
    setup_logging(settings.LOG_LEVEL)
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.VERSION} [{settings.APP_ENV}]")

    # In development and test environments, ensure tables are created
    # For production environments, Alembic migrations remain authoritative
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized.")

    yield

    logger.info("Shutting down ClinSync API.")


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create and configure FastAPI application instance."""
    if settings is None:
        settings = get_settings()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description=(
            "ClinSync transactional clinical persistence, scheduling, and clinician handoff API"
        ),
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )
    app.state.settings = settings

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Request ID and logging middleware
    app.add_middleware(RequestContextMiddleware)

    # API Rate Limiter middleware
    app.add_middleware(RateLimitMiddleware)

    # Exception Handlers
    app.add_exception_handler(ClinSyncAppException, clinsync_app_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Router aggregation
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    return app


app = create_app()
