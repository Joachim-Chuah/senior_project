"""
Market Overview API Router
GET /api/market/overview
GET /api/market/summary
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


@router.get("/summary")
async def get_market_summary():
    """
    Generate an AI end-of-day market summary using Groq.
    Based purely on price data — no social sentiment involved.
    """
    import asyncio

    generated_at = datetime.now(timezone.utc).isoformat()

    if not settings.GROQ_API_KEY:
        return {"summary": "AI summary unavailable — GROQ_API_KEY not configured.", "generated_at": generated_at}

    # Fetch market data concurrently
    loop = asyncio.get_event_loop()

    def fetch_all():
        quotes = _fmp.get_quotes(INDEX_SYMBOLS)
        gainers = _fmp.get_gainers()[:5]
        losers = _fmp.get_losers()[:5]

        # VIX via yfinance
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

    # Build compact data context
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

    # Call Groq
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

    return {"summary": summary, "generated_at": generated_at}
