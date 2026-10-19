"""Application configuration using Pydantic Settings."""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for ClinSync backend service."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_ENV: Literal["development", "test", "production"] = "development"
    PROJECT_NAME: str = "ClinSync API"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    LOG_LEVEL: str = "INFO"

    # Database
    DATABASE_URL: str = "sqlite:///./clinsync_demo.db"
    SQLITE_WAL_MODE: bool = True
    SQLITE_FOREIGN_KEYS: bool = True

    # Security & Demo Defaults
    DEFAULT_HOSPITAL_ID: str = "HOSP-DEMO-01"
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ]

    # Document Storage & Safe Ingestion
    STORAGE_DIR: str = "storage/documents"
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB
    ALLOWED_MIME_TYPES: list[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
    ]

    # AI Model Providers (Configured server-side)
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"

    LLM_FALLBACK_PROVIDER: str = "none"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = ""

    # Speech / Voice Synthesis (Optional)
    ELEVENLABS_API_KEY: str = ""

    # Tracing
    TRACE_ENABLED: bool = False
    TRACE_PUBLIC_KEY: str = ""
    TRACE_SECRET_KEY: str = ""
    TRACE_HOST: str = ""


@lru_cache()
def get_settings() -> Settings:
    """Return cached Settings instance."""
    return Settings()
