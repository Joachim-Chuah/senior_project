"""
SQLAlchemy engine/session setup and DB health helpers.
"""

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.utils.config import get_settings

settings = get_settings()


def _normalize_database_url(database_url: str) -> str:
    # Ensure PostgreSQL URLs use the installed psycopg (v3) driver.
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    return database_url


def _build_connect_args(database_url: str) -> dict[str, object]:
    if database_url.startswith("sqlite"):
        return {"check_same_thread": False}
    return {}


database_url = _normalize_database_url(settings.DATABASE_URL)

engine = create_engine(
    database_url,
    connect_args=_build_connect_args(database_url),
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_database_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
