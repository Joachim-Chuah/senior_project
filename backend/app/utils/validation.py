"""
Validation utilities for API inputs
"""

import re
from fastapi import HTTPException


def validate_ticker(ticker: str) -> str:
    """
    Validate and normalize ticker symbol

    Args:
        ticker: Raw ticker symbol

    Returns:
        Normalized ticker symbol (uppercase, stripped)

    Raises:
        HTTPException: If ticker is invalid
    """
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker symbol is required")

    # Normalize
    normalized = ticker.upper().strip()

    # Validate length
    if len(normalized) < 1 or len(normalized) > 10:
        raise HTTPException(
            status_code=400,
            detail="Ticker symbol must be between 1 and 10 characters"
        )

    # Validate characters (letters, numbers, dots, hyphens)
    if not re.match(r'^[A-Z0-9.-]+$', normalized):
        raise HTTPException(
            status_code=400,
            detail="Ticker symbol can only contain letters, numbers, dots, and hyphens"
        )

    return normalized
