"""
API routes for sentiment data
"""

from fastapi import APIRouter, HTTPException, Query
import asyncio
import logging
from typing import List

from app.services.stocktwits_service import StockTwitsService
from app.services.rss_service import fetch_news
from app.models.sentiment import SentimentSignal, SentimentSummary
from app.utils.validation import validate_ticker
from app.utils.errors import handle_api_error

logger = logging.getLogger(__name__)
router = APIRouter()

stocktwits_service = StockTwitsService()

DEFAULT_TICKERS = ["AAPL", "TSLA", "NVDA", "MSFT", "AMZN", "META", "GOOGL", "SPY"]


@router.get("/overview", response_model=List[SentimentSummary])
async def get_sentiment_overview(
    tickers: str = Query(default=",".join(DEFAULT_TICKERS))
):
    """
    Fetch lightweight sentiment summaries for multiple tickers concurrently.
    Pass ?tickers=AAPL,TSLA,... or omit to use defaults.
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:12]

    async def fetch_one(t: str) -> SentimentSummary:
        try:
            signal = await stocktwits_service.get_sentiment(t)
            return SentimentSummary(
                ticker=signal.ticker,
                company_name=signal.company_name,
                signal=signal.signal,
                score=signal.score,
                bullish_count=signal.bullish_count,
                bearish_count=signal.bearish_count,
                total_posts=signal.total_posts,
            )
        except Exception as e:
            logger.warning(f"Sentiment overview failed for {t}: {e}")
            return SentimentSummary(
                ticker=t,
                company_name=t,
                signal="neutral",
                score=0.0,
                bullish_count=0,
                bearish_count=0,
                total_posts=0,
                error=str(e),
            )

    results = await asyncio.gather(*[fetch_one(t) for t in ticker_list])
    return list(results)


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


@router.get("/news")
async def get_news(limit: int = Query(default=30, le=60)):
    """Fetch latest financial news from free RSS feeds (Yahoo Finance, MarketWatch, Reuters)."""
    import asyncio
    loop = asyncio.get_event_loop()
    items = await loop.run_in_executor(None, lambda: fetch_news(limit))
    return items
