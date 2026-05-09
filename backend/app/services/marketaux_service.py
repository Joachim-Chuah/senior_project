"""
Marketaux service — sector-filtered financial news.
Docs: https://www.marketaux.com/documentation
"""

import logging
import requests
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

MARKETAUX_BASE = "https://api.marketaux.com/v1"

# Map our BASKETS sector IDs to Marketaux industry filter values.
# Values must match what the /v1/entity/stats/aggregation endpoint returns.
SECTOR_INDUSTRIES: dict[str, str] = {
    "semiconductors":    "Technology",
    "big_tech":          "Technology",
    "ai_infrastructure": "Technology",
    "cybersecurity":     "Technology",
    "energy":            "Energy",
    "financials":        "Financial Services",
    "healthcare":        "Healthcare",
    "biotech":           "Healthcare",
    "industrials":       "Industrials",
    "defense":           "Industrials",
    "clean_energy":      "Energy",
    "ev":                "Consumer Cyclical",
    "consumer":          "Consumer Cyclical",
    "real_estate":       "Real Estate",
    "materials":         "Basic Materials",
}


class MarketauxService:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.session = requests.Session()

    def _get(self, endpoint: str, params: dict | None = None) -> Any:
        if not self.api_key:
            return None
        try:
            p = {"api_token": self.api_key, **(params or {})}
            resp = self.session.get(f"{MARKETAUX_BASE}/{endpoint}", params=p, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"Marketaux request failed for {endpoint}: {e}")
            return None

    def get_sector_news(
        self,
        sector_id: str,
        symbols: list[str],
        max_articles: int = 5,
        days: int = 7,
    ) -> list[dict]:
        """
        Fetch news filtered by Marketaux industry tag and top sector symbols.
        Falls back to symbols-only if the industry tag returns nothing.
        """
        industry = SECTOR_INDUSTRIES.get(sector_id)
        published_after = (
            datetime.now(timezone.utc) - timedelta(days=days)
        ).strftime("%Y-%m-%dT%H:%M")

        params: dict = {
            "language": "en",
            "published_after": published_after,
            "limit": max_articles,
            "filter_entities": "true",
            "sort": "published_desc",
        }

        if industry:
            params["industries"] = industry

        if symbols:
            params["symbols"] = ",".join(symbols[:6])

        data = self._get("news/all", params)
        articles = self._parse(data)

        # If industry+symbols returned nothing, try industry-only
        if not articles and industry and symbols:
            params.pop("symbols", None)
            data = self._get("news/all", params)
            articles = self._parse(data)

        return articles

    def _parse(self, data: Any) -> list[dict]:
        if not isinstance(data, dict):
            return []
        results = data.get("data", [])
        if not isinstance(results, list):
            return []
        articles = []
        for item in results:
            title = item.get("title", "").strip()
            url = item.get("url", "").strip()
            if not title or not url:
                continue
            # Extract source from entities or url
            source = item.get("source", "") or _source_from_url(url)
            snippet = item.get("snippet") or item.get("description") or ""
            articles.append({
                "title": title,
                "url": url,
                "source": source,
                "content": snippet[:300],
                "datetime": item.get("published_at"),
            })
        return articles


def _source_from_url(url: str) -> str:
    try:
        from urllib.parse import urlparse
        host = urlparse(url).netloc.lower().removeprefix("www.")
        known = {
            "reuters.com": "Reuters",
            "bloomberg.com": "Bloomberg",
            "cnbc.com": "CNBC",
            "wsj.com": "WSJ",
            "marketwatch.com": "MarketWatch",
            "finance.yahoo.com": "Yahoo Finance",
            "yahoo.com": "Yahoo Finance",
            "benzinga.com": "Benzinga",
            "fool.com": "Motley Fool",
            "seekingalpha.com": "Seeking Alpha",
            "barrons.com": "Barron's",
            "ft.com": "Financial Times",
            "businessinsider.com": "Business Insider",
            "investing.com": "Investing.com",
            "prnewswire.com": "PR Newswire",
            "businesswire.com": "Business Wire",
            "globenewswire.com": "GlobeNewswire",
        }
        return known.get(host, host)
    except Exception:
        return ""
