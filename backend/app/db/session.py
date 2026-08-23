"""PULSE — Database Session Dependency"""

from typing import Generator

from sqlalchemy.orm import Session

from app.db.database import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency — yields DB session per request, auto-closes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()