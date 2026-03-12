"""
Market Overview API Router
GET /api/market/overview
"""

from fastapi import APIRouter
from datetime import datetime, timezone
import logging

from app.models.market import MarketOverview, MarketQuote, MarketMover, NewsItem
from app.services.fmp_service import FMPService
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
_fmp = FMPService(api_key=settings.FMP_API_KEY)

INDEX_SYMBOLS = ["SPY", "AAPL", "MSFT", "NVDA"]


def _parse_mover(raw: dict) -> MarketMover:
    return MarketMover(
        ticker=raw.get("symbol", ""),
        name=raw.get("name", raw.get("symbol", "")),
        price=float(raw.get("price", 0) or 0),
        change=float(raw.get("change", 0) or 0),
        changesPercentage=float(raw.get("changesPercentage", 0) or 0),
        volume=float(raw.get("volume", 0) or 0),
    )


def _parse_quote(raw: dict) -> MarketQuote:
    # stable API uses "changePercentage"; v3 used "changesPercentage"
    pct = raw.get("changePercentage") or raw.get("changesPercentage") or 0
    return MarketQuote(
        symbol=raw.get("symbol", ""),
        name=raw.get("name", raw.get("symbol", "")),
        price=float(raw.get("price", 0) or 0),
        change=float(raw.get("change", 0) or 0),
        changesPercentage=float(pct),
    )


def _parse_news(raw: dict) -> NewsItem:
    return NewsItem(
        title=raw.get("title", ""),
        url=raw.get("url", ""),
        publishedDate=raw.get("publishedDate", ""),
        site=raw.get("site", ""),
        text=raw.get("text", "")[:300],
        symbol=raw.get("symbol", ""),
    )


@router.get("/overview", response_model=MarketOverview)
async def get_market_overview() -> MarketOverview:
    """
    Returns a market overview: major indices, top gainers, losers,
    most active stocks, and latest news. Returns empty lists with a
    warning if FMP_API_KEY is not configured.
    """
    fetched_at = datetime.now(timezone.utc).isoformat()

    if not settings.FMP_API_KEY:
        return MarketOverview(
            indices=[],
            gainers=[],
            losers=[],
            actives=[],
            news=[],
            fetched_at=fetched_at,
            warning="FMP_API_KEY is not configured. Add it to backend/.env to see live market data.",
        )

    try:
        raw_quotes = _fmp.get_quotes(INDEX_SYMBOLS)
        indices = [_parse_quote(q) for q in raw_quotes]
    except Exception as e:
        logger.warning(f"Failed to fetch index quotes: {e}")
        indices = []

    try:
        gainers = [_parse_mover(m) for m in _fmp.get_gainers()[:10]]
    except Exception as e:
        logger.warning(f"Failed to fetch gainers: {e}")
        gainers = []

    try:
        losers = [_parse_mover(m) for m in _fmp.get_losers()[:10]]
    except Exception as e:
        logger.warning(f"Failed to fetch losers: {e}")
        losers = []

    try:
        actives = [_parse_mover(m) for m in _fmp.get_actives()[:10]]
    except Exception as e:
        logger.warning(f"Failed to fetch actives: {e}")
        actives = []

    try:
        news = [_parse_news(n) for n in _fmp.get_market_news(limit=20)]
    except Exception as e:
        logger.warning(f"Failed to fetch news: {e}")
        news = []

    return MarketOverview(
        indices=indices,
        gainers=gainers,
        losers=losers,
        actives=actives,
        news=news,
        fetched_at=fetched_at,
    )
