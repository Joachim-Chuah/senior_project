"""
SQLAlchemy declarative base for ORM models.
"""

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """Base class used by all SQLAlchemy models."""

