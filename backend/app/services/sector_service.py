"""
Sector rotation service — computes YTD/1M returns for thematic baskets,
derives phase/rotation labels, and generates AI narratives via Groq + Tavily.
"""

import logging
import statistics
import time
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Thematic baskets: id → (name, category, proxy_etf, fallback_tickers)
BASKETS: dict = {
    "semiconductors":    ("Semiconductors",       "Technology",  "SOXX", ["NVDA","AMD","INTC","MU","ARM","MRVL","AVGO","QCOM","TXN","AMAT","LRCX","KLAC","ADI","ASML","TSM"]),
    "big_tech":          ("Big Tech",              "Technology",  "XLK",  ["AAPL","MSFT","GOOGL","META","AMZN","NVDA","ORCL","CRM","ADBE","CSCO"]),
    "ai_infrastructure": ("AI Infrastructure",     "Technology",  "BOTZ", ["NVDA","AVGO","AMD","MSFT","GOOGL","META","AMZN","ORCL","DELL","HPE"]),
    "cybersecurity":     ("Cybersecurity",         "Technology",  "HACK", ["CRWD","PANW","ZS","FTNT","OKTA","S","CYBR","TENB","NET","CHKP"]),
    "energy":            ("Energy",                "Energy",      "XLE",  ["XOM","CVX","COP","EOG","SLB","MPC","PSX","VLO","HAL","OXY"]),
    "financials":        ("Financials",            "Financial",   "XLF",  ["JPM","BAC","GS","MS","WFC","BLK","SCHW","C","AXP","V"]),
    "healthcare":        ("Healthcare",            "Healthcare",  "XLV",  ["JNJ","UNH","PFE","ABBV","MRK","LLY","BMY","CVS","TMO","DHR"]),
    "biotech":           ("Biotech & Pharma",      "Healthcare",  "XBI",  ["MRNA","BIIB","REGN","VRTX","GILD","SGEN","ALNY","BMRN","IONS","FATE"]),
    "industrials":       ("Industrials",           "Industrial",  "XLI",  ["CAT","DE","GE","HON","MMM","UPS","FDX","EMR","ETN","ITW"]),
    "defense":           ("Defense & Aerospace",   "Industrial",  "ITA",  ["LMT","RTX","NOC","GD","BA","AXON","KTOS","RKLB","HII","L3H"]),
    "clean_energy":      ("Clean Energy",          "Energy",      "ICLN", ["ENPH","FSLR","PLUG","SEDG","RUN","NOVA","ARRY","CSIQ","HASI","NEE"]),
    "ev":                ("Electric Vehicles",     "Consumer",    "DRIV", ["TSLA","RIVN","NIO","LCID","GM","F","CHPT","BLNK","XPEV","LI"]),
    "consumer":          ("Consumer & Retail",     "Consumer",    "XLY",  ["AMZN","TSLA","HD","MCD","NKE","SBUX","LOW","TGT","BKNG","CMG"]),
    "real_estate":       ("Real Estate",           "Real Estate", "XLRE", ["AMT","PLD","CCI","EQIX","SPG","O","AVB","EQR","DLR","PSA"]),
    "materials":         ("Materials & Commodities","Commodity",  "XLB",  ["LIN","APD","SHW","FCX","NEM","NUE","MOS","ALB","CF","VMC"]),
}


def _compute_rsi(closes: list[float], period: int = 14) -> float | None:
    if len(closes) < period + 1:
        return None
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(d, 0) for d in deltas[-period:]]
    losses = [abs(min(d, 0)) for d in deltas[-period:]]
    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 1)


def _derive_phase(rsi: float | None, ytd: float, one_month: float) -> str:
    if rsi is None:
        return "Unknown"
    if rsi < 35:
        return "Bottoming"
    if rsi < 50 and one_month > 0:
        return "Early"
    if rsi < 65:
        return "Mature"
    return "Exhaustion"


def _derive_rotation(ytd: float, one_month: float, phase: str) -> str:
    if phase == "Bottoming" and one_month > 0:
        return "Reflex Setup"
    if ytd > 0 and one_month > 0:
        return "Accumulation"
    if ytd > 15 and one_month < 0:
        return "Distribution"
    if one_month < -3:
        return "Fading"
    return "Neutral"


class SectorService:
    def __init__(self, fmp_service, settings):
        self._fmp = fmp_service
        self._settings = settings
        self._summary_cache: dict = {"data": None, "expires_at": 0.0}
        self._detail_cache: dict = {}

    def _get_returns(self, ticker: str) -> tuple[float, float]:
        """Return (ytd_return_pct, one_month_return_pct) for a ticker."""
        closes = self._fmp.get_historical_closes(ticker, days=130)
        if len(closes) < 22:
            return 0.0, 0.0

        current = closes[-1]

        # 1M return — ~22 trading days back
        one_month_start = closes[-22]
        one_month = round((current - one_month_start) / one_month_start * 100, 2) if one_month_start else 0.0

        # YTD return — use oldest available price as proxy for Jan start
        ytd_start = closes[0]
        ytd = round((current - ytd_start) / ytd_start * 100, 2) if ytd_start else 0.0

        return ytd, one_month

    def get_all_summaries(self) -> list[dict]:
        if self._summary_cache["data"] and time.time() < self._summary_cache["expires_at"]:
            return self._summary_cache["data"]

        results = []
        for sector_id, (name, category, etf, _) in BASKETS.items():
            try:
                ytd, one_month = self._get_returns(etf)
                closes = self._fmp.get_historical_closes(etf, days=30)
                rsi = _compute_rsi(closes)
                phase = _derive_phase(rsi, ytd, one_month)
                rotation = _derive_rotation(ytd, one_month, phase)
                # Use ETF holdings count or fallback ticker count as stock_count
                _, _, _, fallback = BASKETS[sector_id]
                holdings = self._fmp.get_etf_holdings(etf)
                stock_count = len(holdings) if holdings else len(fallback)
                results.append({
                    "id": sector_id,
                    "name": name,
                    "etf": etf,
                    "category": category,
                    "ytd_return": ytd,
                    "one_month_return": one_month,
                    "stock_count": stock_count,
                    "phase": phase,
                    "rotation": rotation,
                })
            except Exception as e:
                logger.warning(f"Failed to compute summary for {sector_id}: {e}")

        results.sort(key=lambda x: x["ytd_return"], reverse=True)
        self._summary_cache["data"] = results
        self._summary_cache["expires_at"] = time.time() + 3600  # 1 hour
        return results

    def get_detail(self, sector_id: str) -> dict | None:
        if sector_id in self._detail_cache:
            entry = self._detail_cache[sector_id]
            if time.time() < entry["expires_at"]:
                return entry["data"]

        if sector_id not in BASKETS:
            return None

        name, category, etf, fallback_tickers = BASKETS[sector_id]

        # Get constituent tickers from ETF holdings, fall back to hardcoded list
        holdings = self._fmp.get_etf_holdings(etf)
        if holdings:
            tickers = [h["asset"] for h in holdings[:15] if h.get("asset")]
            weights = {h["asset"]: h.get("weightPercentage") for h in holdings[:15]}
        else:
            tickers = fallback_tickers[:15]
            weights = {}

        stocks = []
        for ticker in tickers:
            try:
                ytd, one_month = self._get_returns(ticker)
                # Get company name
                name_str = self._fmp.get_company_name(ticker)
                stocks.append({
                    "ticker": ticker,
                    "name": name_str,
                    "ytd_return": ytd,
                    "one_month_return": one_month,
                    "weight": weights.get(ticker),
                })
            except Exception as e:
                logger.warning(f"Failed to get data for {ticker}: {e}")

        stocks.sort(key=lambda x: x["ytd_return"], reverse=True)

        returns = [s["ytd_return"] for s in stocks]
        winner_count = sum(1 for r in returns if r > 0)
        loser_count = sum(1 for r in returns if r <= 0)
        median_return = round(statistics.median(returns), 2) if returns else 0.0
        avg_return = round(sum(returns) / len(returns), 2) if returns else 0.0

        ytd_etf, one_month_etf = self._get_returns(etf)

        narrative, articles = self._generate_narrative(sector_id, name, ytd_etf, one_month_etf, stocks)

        detail = {
            "id": sector_id,
            "name": name,
            "etf": etf,
            "category": category,
            "ytd_return": ytd_etf,
            "one_month_return": one_month_etf,
            "winner_count": winner_count,
            "loser_count": loser_count,
            "median_return": median_return,
            "avg_return": avg_return,
            "stocks": stocks,
            "narrative": narrative,
            "articles": articles,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }

        self._detail_cache[sector_id] = {"data": detail, "expires_at": time.time() + 7200}
        return detail

    def _generate_narrative(
        self,
        sector_id: str,
        name: str,
        ytd: float,
        one_month: float,
        stocks: list[dict],
    ) -> tuple[str | None, list[dict]]:
        articles = []
        narrative = None

        try:
            from tavily import TavilyClient
            if self._settings.TAVILY_API_KEY:
                client = TavilyClient(api_key=self._settings.TAVILY_API_KEY)
                query = f"{name} sector stocks market rotation outlook 2026"
                result = client.search(query=query, max_results=5, search_depth="basic")
                raw = result.get("results", [])
                articles = [
                    {"title": r.get("title"), "url": r.get("url"), "source": r.get("source"), "content": r.get("content", "")[:300]}
                    for r in raw
                ]
        except Exception as e:
            logger.warning(f"Tavily search failed for {sector_id}: {e}")

        try:
            from groq import Groq
            if self._settings.GROQ_API_KEY:
                top_stocks = ", ".join(f"{s['ticker']} ({s['ytd_return']:+.1f}%)" for s in stocks[:5])
                article_snippets = "\n".join(f"- {a['title']}: {a['content']}" for a in articles[:3]) if articles else "No recent articles found."

                prompt = (
                    f"{name} sector performance: YTD {ytd:+.1f}%, last month {one_month:+.1f}%.\n"
                    f"Top movers: {top_stocks}.\n\n"
                    f"Recent news:\n{article_snippets}\n\n"
                    f"In 2-3 sentences, explain what is driving this sector's performance and whether there is a market rotation happening into or out of this sector. Be specific and factual."
                )

                client = Groq(api_key=self._settings.GROQ_API_KEY)
                response = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a concise financial markets analyst specialising in sector rotation and macro trends. Never give buy/sell recommendations."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.4,
                    max_tokens=150,
                )
                narrative = response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq narrative generation failed for {sector_id}: {e}")

        return narrative, articles
