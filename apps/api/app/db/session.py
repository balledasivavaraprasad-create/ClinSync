"""Database engine and session management with SQLite pragmas."""

from sqlite3 import Connection as SQLite3Connection
from typing import Generator

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=(settings.LOG_LEVEL.upper() == "DEBUG"),
)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    """Enable foreign keys and WAL mode for SQLite connections."""
    if isinstance(dbapi_connection, SQLite3Connection):
        cursor = dbapi_connection.cursor()
        if settings.SQLITE_FOREIGN_KEYS:
            cursor.execute("PRAGMA foreign_keys=ON")
        if settings.SQLITE_WAL_MODE and ":memory:" not in settings.DATABASE_URL:
            # WAL mode is applicable to persistent files, not in-memory DBs
            try:
                cursor.execute("PRAGMA journal_mode=WAL")
            except Exception:
                pass
        cursor.close()


SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """Provide transactional database session dependency."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
