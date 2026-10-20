"""Pytest fixtures for unit, integration, and contract tests."""

import os
import tempfile
from typing import Generator

import pytest
from app.core.config import Settings
from app.db.base import Base
from app.dependencies.db import get_db
from app.main import create_app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


@pytest.fixture(scope="session")
def test_db_path() -> Generator[str, None, None]:
    """Provide a temporary SQLite database file for testing WAL and foreign keys."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    yield db_path
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass


@pytest.fixture(scope="session")
def test_settings(test_db_path: str) -> Settings:
    """Return test application settings with temporary SQLite DB."""
    return Settings(
        APP_ENV="test",
        LOG_LEVEL="WARNING",
        DATABASE_URL=f"sqlite:///{test_db_path}",
        SQLITE_WAL_MODE=True,
        SQLITE_FOREIGN_KEYS=True,
        RATE_LIMIT_ENABLED=False,
    )


@pytest.fixture(scope="session")
def test_engine(test_settings: Settings) -> Generator[Engine, None, None]:
    """Create test engine with SQLite foreign keys and WAL enabled."""
    engine = create_engine(
        test_settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def db_session(test_engine: Engine) -> Generator[Session, None, None]:
    """Provide clean isolated session per test with automatic table cleanup."""
    session_factory = sessionmaker(bind=test_engine, autocommit=False, autoflush=False)
    session = session_factory()

    try:
        yield session
    finally:
        session.close()
        # Clean all records between tests
        with test_engine.connect() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())
            conn.commit()


@pytest.fixture
def client(test_settings: Settings, db_session: Session) -> Generator[TestClient, None, None]:
    """TestClient configured with overridden database session."""
    app = create_app(test_settings)

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
