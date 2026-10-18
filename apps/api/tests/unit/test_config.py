"""Unit tests for configuration and environment settings."""

from app.core.config import Settings


def test_settings_default_values():
    """Verify default configuration attributes."""
    settings = Settings(
        _env_file=None,
        APP_ENV="development",
        DATABASE_URL="sqlite:///./test.db",
    )
    assert settings.PROJECT_NAME == "ClinSync API"
    assert settings.VERSION == "0.1.0"
    assert settings.API_V1_STR == "/api/v1"
    assert settings.SQLITE_FOREIGN_KEYS is True
    assert settings.SQLITE_WAL_MODE is True
    assert settings.LLM_PROVIDER == "gemini"
    assert settings.LLM_FALLBACK_PROVIDER == "none"


def test_settings_override():
    """Verify environment/keyword overrides work as expected."""
    custom_settings = Settings(
        APP_ENV="test",
        LOG_LEVEL="DEBUG",
        DATABASE_URL="sqlite:///./custom.db",
        GEMINI_MODEL="gemini-2.0-flash",
    )
    assert custom_settings.APP_ENV == "test"
    assert custom_settings.LOG_LEVEL == "DEBUG"
    assert custom_settings.DATABASE_URL == "sqlite:///./custom.db"
    assert custom_settings.GEMINI_MODEL == "gemini-2.0-flash"
