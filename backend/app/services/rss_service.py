"""
RSS Service — fetches financial news headlines from free RSS feeds.
No API key required.
"""

import feedparser
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any
from email.utils import parsedate_to_datetime

logger = logging.getLogger(__name__)

FEEDS = [
    {"source": "Yahoo Finance", "url": "https://finance.yahoo.com/rss/topstories"},
    {"source": "MarketWatch",   "url": "https://feeds.marketwatch.com/marketwatch/topstories/"},
    {"source": "Reuters",       "url": "https://feeds.reuters.com/reuters/businessNews"},
]


def _parse_date(entry) -> str:
    """Return ISO date string from a feedparser entry, or empty string."""
    for field in ("published", "updated"):
        raw = entry.get(field)
        if raw:
            try:
                dt = parsedate_to_datetime(raw)
                return dt.astimezone(timezone.utc).isoformat()
            except Exception:
                return raw
    return ""


def fetch_news(limit: int = 30) -> List[Dict[str, Any]]:
    """
    Fetch and merge headlines from all configured RSS feeds.
    Returns up to `limit` items sorted newest-first.
    """
    items: List[Dict[str, Any]] = []

    for feed_cfg in FEEDS:
        try:
            parsed = feedparser.parse(feed_cfg["url"])
            for entry in parsed.entries:
                items.append({
                    "title": entry.get("title", "").strip(),
                    "url": entry.get("link", ""),
                    "source": feed_cfg["source"],
                    "publishedDate": _parse_date(entry),
                    "summary": entry.get("summary", "")[:200].strip(),
                })
        except Exception as e:
            logger.warning(f"RSS fetch failed for {feed_cfg['source']}: {e}")

    # Sort newest-first, items with no date go last
    items.sort(key=lambda x: x["publishedDate"] or "0", reverse=True)
    return items[:limit]
