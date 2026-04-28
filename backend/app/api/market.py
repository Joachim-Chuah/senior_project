"""
Market Overview API Router
GET /api/market/overview
GET /api/market/summary
"""

from fastapi import APIRouter
from datetime import datetime, timezone, timedelta
import logging
import time
import json
from pathlib import Path
from zoneinfo import ZoneInfo

from app.models.market import MarketOverview, MarketQuote, MarketMover, NewsItem
from app.services.fmp_service import FMPService
from app.services.mock_fmp_service import MockFMPService
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
_fmp = MockFMPService() if settings.DEMO_MODE else FMPService(api_key=settings.FMP_API_KEY)

INDEX_SYMBOLS = ["SPY", "AAPL", "MSFT", "NVDA"]

CACHE_TTL = 900  # 15 minutes
_overview_cache: dict = {"data": None, "expires_at": 0.0}

ET = ZoneInfo("America/New_York")
SUMMARY_CACHE_PATH = Path(__file__).parent.parent.parent / "summary_cache.json"


def _last_trading_date(now_et: datetime) -> str:
    """Most recent weekday (Mon–Fri) as YYYY-MM-DD."""
    d = now_et.date()
    while d.weekday() >= 5:  # 5=Sat, 6=Sun
        d -= timedelta(days=1)
    return d.isoformat()


def _prev_trading_date(now_et: datetime) -> str:
    """The trading day before the last trading date."""
    d = now_et.date()
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    d -= timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d.isoformat()


def _market_closed_for_day(now_et: datetime) -> bool:
    """True if market has finished trading (weekday after 4 PM ET, or weekend)."""
    if now_et.weekday() >= 5:
        return True
    return now_et.hour >= 16


def _load_summary_cache() -> dict:
    if SUMMARY_CACHE_PATH.exists():
        try:
            return json.loads(SUMMARY_CACHE_PATH.read_text())
        except Exception:
            pass
    return {}


def _save_summary_cache(cache: dict):
    # Keep only the last 2 trading days to avoid bloat
    sorted_keys = sorted(cache.keys(), reverse=True)[:2]
    trimmed = {k: cache[k] for k in sorted_keys}
    try:
        SUMMARY_CACHE_PATH.write_text(json.dumps(trimmed, indent=2))
    except Exception as e:
        logger.warning(f"Failed to save summary cache: {e}")


def _parse_mover(raw: dict) -> MarketMover:
    pct = raw.get("changesPercentage") or raw.get("changePercentage") or 0
    return MarketMover(
        ticker=raw.get("symbol", ""),
        name=raw.get("name", raw.get("symbol", "")),
        price=float(raw.get("price", 0) or 0),
        change=float(raw.get("change", 0) or 0),
        changesPercentage=float(pct),
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
    warning if FMP_API_KEY is not configured. Cached for 15 minutes.
    """
    # Serve from cache if still fresh
    if _overview_cache["data"] is not None and time.time() < _overview_cache["expires_at"]:
        return _overview_cache["data"]

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

    result = MarketOverview(
        indices=indices,
        gainers=gainers,
        losers=losers,
        actives=actives,
        news=news,
        fetched_at=fetched_at,
    )
    _overview_cache["data"] = result
    _overview_cache["expires_at"] = time.time() + CACHE_TTL
    return result


@router.get("/sparkline/{ticker}")
async def get_sparkline(ticker: str):
    """30-day daily close prices for sparkline charts."""
    import asyncio
    import yfinance as yf

    def fetch():
        hist = yf.Ticker(ticker.upper()).history(period="30d")
        if hist.empty:
            return []
        return [round(float(p), 2) for p in hist["Close"].tolist()]

    loop = asyncio.get_event_loop()
    prices = await loop.run_in_executor(None, fetch)
    return {"ticker": ticker.upper(), "prices": prices}


@router.get("/summary")
async def get_market_summary():
    """
    Return an AI end-of-day market summary using Groq.
    Generated once per trading day after 4 PM ET, then cached to disk.
    If the market hasn't closed yet, returns the previous day's summary instead.
    """
    import asyncio

    now_et = datetime.now(ET)
    closed = _market_closed_for_day(now_et)
    trading_date = _last_trading_date(now_et)
    prev_date = _prev_trading_date(now_et)

    cache = _load_summary_cache()
    prev_entry = cache.get(prev_date)
    prev_summary = prev_entry.get("summary") if prev_entry else None
    prev_generated_at = prev_entry.get("generated_at") if prev_entry else None

    def _base_response(**kwargs):
        return {
            "market_closed": closed,
            "trading_date": trading_date,
            "prev_summary": prev_summary,
            "prev_date": prev_date,
            "prev_generated_at": prev_generated_at,
            **kwargs,
        }

    # Market still open — return prev summary, no generation
    if not closed:
        return _base_response(summary=None, generated_at=None)

    # Market closed — serve from cache if available
    if trading_date in cache:
        entry = cache[trading_date]
        return _base_response(summary=entry["summary"], generated_at=entry["generated_at"])

    # Market closed, no cache — generate now
    generated_at = datetime.now(timezone.utc).isoformat()

    if not settings.GROQ_API_KEY:
        return _base_response(
            summary="AI summary unavailable — GROQ_API_KEY not configured.",
            generated_at=generated_at,
        )

    loop = asyncio.get_event_loop()

    def fetch_all():
        quotes = _fmp.get_quotes(INDEX_SYMBOLS)
        gainers = _fmp.get_gainers()[:5]
        losers = _fmp.get_losers()[:5]
        vix_level = None
        try:
            import yfinance as yf
            vix_hist = yf.Ticker("^VIX").history(period="2d")
            if not vix_hist.empty:
                vix_level = round(float(vix_hist["Close"].iloc[-1]), 2)
        except Exception:
            pass
        return quotes, gainers, losers, vix_level

    quotes, gainers, losers, vix_level = await loop.run_in_executor(None, fetch_all)

    lines = ["=== MARKET DATA ==="]
    if quotes:
        lines.append("\nIndex / Key Tickers:")
        for q in quotes:
            pct = q.get("changePercentage") or q.get("changesPercentage") or 0
            chg = q.get("change", 0)
            sign = "+" if float(pct) >= 0 else ""
            lines.append(f"  {q.get('symbol')}: ${q.get('price', 0):.2f}  {sign}{float(pct):.2f}%  ({sign}{float(chg):.2f})")
    if vix_level is not None:
        regime = "low (calm)" if vix_level < 15 else "elevated (cautious)" if vix_level < 25 else "high (fearful)"
        lines.append(f"\nVIX: {vix_level} — {regime}")
    if gainers:
        lines.append("\nTop Gainers:")
        for g in gainers:
            lines.append(f"  {g.get('symbol')} ({g.get('name', '')[:25]}): +{g.get('changesPercentage', 0):.1f}%")
    if losers:
        lines.append("\nTop Losers:")
        for l in losers:
            lines.append(f"  {l.get('symbol')} ({l.get('name', '')[:25]}): {l.get('changesPercentage', 0):.1f}%")

    data_context = "\n".join(lines)

    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a concise financial markets analyst writing a daily closing brief. "
                        "Given price data, write a 3-5 sentence end-of-day summary covering: "
                        "(1) how the major indices closed, "
                        "(2) the likely reasons behind the direction — using VIX, breadth (gainers vs losers ratio), and momentum as clues, "
                        "(3) any notable movers and what they suggest about sector or risk appetite. "
                        "Be factual and specific — cite the actual numbers. "
                        "Interpret what the data implies but stay grounded in what is shown. "
                        "Do not mention social media sentiment. "
                        "Do not give buy/sell recommendations."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Write an end-of-day market summary with reasoning based on this data:\n\n{data_context}",
                },
            ],
            temperature=0.5,
            max_tokens=200,
        )
        summary = response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"Groq summary generation failed: {e}")
        summary = "Unable to generate summary at this time."

    # Persist to disk
    cache[trading_date] = {"summary": summary, "generated_at": generated_at}
    _save_summary_cache(cache)

    return _base_response(summary=summary, generated_at=generated_at)
