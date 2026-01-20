"""
API routes for fusion sentiment analysis
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List
import logging

from app.services.fusion_service import FusionService
from app.models.sentiment import SentimentSpike
from app.utils.validation import validate_ticker, validate_sentiment_score
from app.utils.errors import handle_api_error

logger = logging.getLogger(__name__)
router = APIRouter()

fusion_service = FusionService()


@router.get("/timeseries/{ticker}")
async def get_sentiment_timeseries(
    ticker: str,
    limit: int = Query(100, ge=1, le=1000)
):
    """
    Get sentiment timeseries data

    Args:
        ticker: Stock ticker symbol
        limit: Maximum number of data points
    """
    try:
        ticker = validate_ticker(ticker)
        timeseries = fusion_service.get_sentiment_timeseries(ticker, limit)
        return {
            "ticker": ticker,
            "data": timeseries
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching timeseries for {ticker}: {e}")
        raise handle_api_error(e, ticker, "fetching sentiment timeseries")


@router.get("/regime/{ticker}")
async def get_sentiment_regime(
    ticker: str,
    lookback: int = Query(20, ge=5, le=100)
):
    """
    Get current sentiment regime

    Args:
        ticker: Stock ticker symbol
        lookback: Number of periods to analyze
    """
    try:
        ticker = validate_ticker(ticker)
        regime = fusion_service.get_sentiment_regime(ticker, lookback)
        return {
            "ticker": ticker,
            **regime
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating regime for {ticker}: {e}")
        raise handle_api_error(e, ticker, "calculating sentiment regime")


@router.get("/spikes/{ticker}")
async def detect_sentiment_spikes(
    ticker: str,
    z_threshold: float = Query(2.0, ge=1.0, le=5.0)
):
    """
    Detect sentiment spikes

    Args:
        ticker: Stock ticker symbol
        z_threshold: Z-score threshold for spike detection
    """
    try:
        ticker = validate_ticker(ticker)
        spikes = fusion_service.detect_sentiment_spikes(ticker, z_threshold)
        return {"spikes": spikes}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error detecting spikes for {ticker}: {e}")
        raise handle_api_error(e, ticker, "detecting sentiment spikes")


@router.post("/update/{ticker}")
async def update_sentiment_data(
    ticker: str,
    reddit_score: float,
    gdelt_score: float,
    alpha: float = Query(0.5, ge=0.0, le=1.0)
):
    """
    Add new sentiment data point

    Args:
        ticker: Stock ticker symbol
        reddit_score: Reddit sentiment [-1, 1]
        gdelt_score: GDELT sentiment [-1, 1]
        alpha: Weight for GDELT in fusion
    """
    try:
        from datetime import datetime, timezone

        ticker = validate_ticker(ticker)
        validate_sentiment_score(reddit_score, "Reddit score")
        validate_sentiment_score(gdelt_score, "GDELT score")

        data = fusion_service.add_sentiment_data(
            ticker,
            datetime.now(timezone.utc),
            reddit_score,
            gdelt_score,
            alpha
        )

        return {
            "ticker": ticker,
            "fusion_score": data.fusion_sentiment,
            "timestamp": data.timestamp
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating sentiment data for {ticker}: {e}")
        raise handle_api_error(e, ticker, "updating sentiment data")
