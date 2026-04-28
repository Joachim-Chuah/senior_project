"""
API routes for sentiment data
"""

from fastapi import APIRouter, HTTPException, Query
import asyncio
import logging
import time
from typing import List

from pydantic import BaseModel

from app.services.stocktwits_service import StockTwitsService
from app.services.finbert_service import FinBERTService
from app.services.rss_service import fetch_news
from app.services.fmp_service import FMPService
from app.models.sentiment import SentimentSignal, SentimentSummary
from app.utils.validation import validate_ticker
from app.utils.errors import handle_api_error
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

stocktwits_service = StockTwitsService()
_fmp = FMPService(api_key=get_settings().FMP_API_KEY)
_finbert = FinBERTService()


class ClassifyRequest(BaseModel):
    texts: List[str]


@router.post("/classify")
async def classify_texts(body: ClassifyRequest):
    """Classify post texts via FinBERT. Returns Bullish/Bearish/Neutral per text."""
    loop = asyncio.get_event_loop()
    labels = await loop.run_in_executor(None, lambda: _finbert.classify_texts(body.texts))
    return {"labels": labels}

FALLBACK_TICKERS = ["TSLA", "NVDA", "AAPL", "PLTR", "AMD", "AMZN", "META", "MSFT", "SPY", "GOOGL"]

# Cache trending tickers for 10 minutes
_trending_cache: dict = {"tickers": None, "expires_at": 0.0}


def _get_trending_tickers() -> List[str]:
    if _trending_cache["tickers"] and time.time() < _trending_cache["expires_at"]:
        return _trending_cache["tickers"]
    tickers = stocktwits_service.get_trending_tickers(limit=10)
    if tickers:
        _trending_cache["tickers"] = tickers
        _trending_cache["expires_at"] = time.time() + 600
        return tickers
    return FALLBACK_TICKERS


@router.get("/overview", response_model=List[SentimentSummary])
async def get_sentiment_overview(
    tickers: str = Query(default="")
):
    """
    Fetch lightweight sentiment summaries for the top 10 trending tickers on StockTwits.
    Pass ?tickers=AAPL,TSLA,... to override, or omit to use live trending data.
    """
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(",") if t.strip()][:12]
    else:
        loop = asyncio.get_event_loop()
        ticker_list = await loop.run_in_executor(None, _get_trending_tickers)

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


@router.get("/search")
async def search_tickers(query: str = Query(default="", min_length=1)):
    """Search for ticker symbols via FMP — returns symbol, name, exchange."""
    if not query.strip():
        return []
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, lambda: _fmp.search_symbols(query.strip()))
    return results
