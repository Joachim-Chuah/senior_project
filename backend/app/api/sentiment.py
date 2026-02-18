"""
API routes for sentiment data
"""

from fastapi import APIRouter, HTTPException
import logging

from app.services.stocktwits_service import StockTwitsService
from app.models.sentiment import SentimentSignal
from app.utils.validation import validate_ticker
from app.utils.errors import handle_api_error

logger = logging.getLogger(__name__)
router = APIRouter()

stocktwits_service = StockTwitsService()


@router.get("/signal/{ticker}", response_model=SentimentSignal)
async def get_sentiment_signal(ticker: str):
    """
    Get real-time sentiment signal from StockTwits

    Returns:
        SentimentSignal with bull/bear breakdown and supporting posts
    """
    try:
        ticker = validate_ticker(ticker)
        signal = await stocktwits_service.get_sentiment(ticker)
        return signal

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching sentiment signal for {ticker}: {e}")
        raise handle_api_error(e, ticker, "fetching sentiment signal")
