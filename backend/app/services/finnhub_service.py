"""
Finnhub service — company news, analyst recommendations, earnings calendar.
"""

import logging
import requests
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

FINNHUB_BASE = "https://finnhub.io/api/v1"


class FinnhubService:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({"X-Finnhub-Token": api_key})

    def _get(self, endpoint: str, params: dict | None = None) -> Any:
        if not self.api_key:
            return None
        try:
            resp = self.session.get(f"{FINNHUB_BASE}/{endpoint}", params=params or {}, timeout=8)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Finnhub request failed for {endpoint}: {e}")
            return None

    def get_company_news(self, ticker: str, days: int = 7) -> list[dict]:
        """Return recent news articles for a ticker."""
        to_date = datetime.now(timezone.utc).date()
        from_date = to_date - timedelta(days=days)
        data = self._get("company-news", {
            "symbol": ticker.upper(),
            "from": from_date.isoformat(),
            "to": to_date.isoformat(),
        })
        if not isinstance(data, list):
            return []
        return [
            {
                "title": item.get("headline", ""),
                "url": item.get("url", ""),
                "source": item.get("source", ""),
                "summary": item.get("summary", "")[:300],
                "datetime": item.get("datetime"),
            }
            for item in data[:5]
            if item.get("headline") and item.get("url")
        ]

    def get_analyst_recommendation(self, ticker: str) -> dict | None:
        """Return latest analyst consensus (buy/hold/sell counts)."""
        data = self._get("stock/recommendation", {"symbol": ticker.upper()})
        if not isinstance(data, list) or not data:
            return None
        latest = data[0]
        total = (latest.get("strongBuy", 0) + latest.get("buy", 0) +
                 latest.get("hold", 0) + latest.get("sell", 0) + latest.get("strongSell", 0))
        if total == 0:
            return None
        buy = latest.get("strongBuy", 0) + latest.get("buy", 0)
        sell = latest.get("sell", 0) + latest.get("strongSell", 0)
        hold = latest.get("hold", 0)
        if buy / total >= 0.6:
            consensus = "Buy"
        elif sell / total >= 0.3:
            consensus = "Sell"
        else:
            consensus = "Hold"
        return {"buy": buy, "hold": hold, "sell": sell, "total": total, "consensus": consensus}

    def get_sector_news(self, tickers: list[str], days: int = 7, max_articles: int = 6) -> list[dict]:
        """Return deduplicated news across a list of tickers, most recent first."""
        seen_urls: set[str] = set()
        articles = []
        for ticker in tickers[:5]:  # top 5 tickers only to stay within rate limits
            for article in self.get_company_news(ticker, days=days):
                url = article.get("url", "")
                if url and url not in seen_urls:
                    seen_urls.add(url)
                    article["ticker"] = ticker
                    articles.append(article)
        articles.sort(key=lambda x: x.get("datetime") or 0, reverse=True)
        return articles[:max_articles]
