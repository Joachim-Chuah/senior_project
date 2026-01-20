"""
Error handling utilities
"""

from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)


class TickerNotFoundError(Exception):
    """Raised when a ticker is not found"""
    pass


class ExternalAPIError(Exception):
    """Raised when an external API fails"""
    pass


class DataProcessingError(Exception):
    """Raised when data processing fails"""
    pass


def handle_api_error(error: Exception, ticker: str = None, operation: str = "operation") -> HTTPException:
    """
    Convert internal exceptions to appropriate HTTP exceptions

    Args:
        error: The original exception
        ticker: Optional ticker symbol for context
        operation: Description of the operation that failed

    Returns:
        HTTPException with appropriate status code and message
    """
    context = f" for {ticker}" if ticker else ""

    # Handle specific exception types
    if isinstance(error, TickerNotFoundError):
        logger.warning(f"Ticker not found{context}: {error}")
        return HTTPException(
            status_code=404,
            detail=f"Ticker{context} not found. Please verify the ticker symbol."
        )

    if isinstance(error, ExternalAPIError):
        logger.error(f"External API error during {operation}{context}: {error}")
        return HTTPException(
            status_code=503,
            detail=f"External data source temporarily unavailable. Please try again later."
        )

    if isinstance(error, DataProcessingError):
        logger.error(f"Data processing error during {operation}{context}: {error}")
        return HTTPException(
            status_code=500,
            detail=f"Error processing data. Please try again."
        )

    if isinstance(error, ValueError):
        logger.warning(f"Invalid input during {operation}{context}: {error}")
        return HTTPException(
            status_code=400,
            detail=str(error)
        )

    if isinstance(error, HTTPException):
        return error

    # Generic error - don't expose internal details
    logger.error(f"Unexpected error during {operation}{context}: {error}", exc_info=True)
    return HTTPException(
        status_code=500,
        detail=f"An unexpected error occurred. Please try again later."
    )


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """
    Safely divide two numbers, returning default if denominator is zero

    Args:
        numerator: Number to divide
        denominator: Number to divide by
        default: Value to return if denominator is zero

    Returns:
        Result of division or default value
    """
    if denominator == 0 or denominator is None:
        return default
    return numerator / denominator
