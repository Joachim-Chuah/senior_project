"""
Reddit service — scrapes public subreddit search endpoints (no API key needed).
Uses Reddit's undocumented .json suffix on standard URLs.
"""

import logging
import time
from datetime import datetime, timezone
from typing import Optional

import requests

from app.models.sentiment import RedditPost

logger = logging.getLogger(__name__)

SUBREDDITS = ["wallstreetbets", "stocks", "investing"]
BASE_URL = "https://www.reddit.com"
REQUEST_DELAY = 1.0  # seconds between subreddit requests (Reddit rate limit courtesy)


class RedditService:
    def __init__(self, finbert=None):
        self.session = requests.Session()
        self.session.headers.update({
            # Reddit requires a descriptive User-Agent or it returns 429/403
            "User-Agent": "rylo-sentiment-app/1.0 (financial dashboard; contact via github)",
            "Accept": "application/json",
        })
        self._finbert = finbert

    def get_posts(self, ticker: str, limit_per_sub: int = 10) -> list[RedditPost]:
        """
        Search for posts mentioning `ticker` across SUBREDDITS.
        Returns posts sorted newest-first with FinBERT sentiment labels.
        """
        raw: list[dict] = []
        for i, sub in enumerate(SUBREDDITS):
            if i > 0:
                time.sleep(REQUEST_DELAY)
            try:
                raw.extend(self._search(sub, ticker, limit_per_sub))
            except Exception as e:
                logger.warning(f"Reddit scrape failed for r/{sub} ticker={ticker}: {e}")

        if not raw:
            return []

        # Classify sentiment with FinBERT if available
        if self._finbert:
            texts = [f"{p['title']} {p['body']}"[:512] for p in raw]
            try:
                labels = self._finbert.classify_texts(texts)
                for post, label in zip(raw, labels):
                    post["sentiment"] = label
            except Exception as e:
                logger.warning(f"FinBERT classification failed for Reddit posts: {e}")

        posts = [self._to_model(p) for p in raw]
        posts.sort(key=lambda p: p.created_at, reverse=True)
        return posts

    def _search(self, subreddit: str, ticker: str, limit: int) -> list[dict]:
        url = f"{BASE_URL}/r/{subreddit}/search.json"
        params = {
            "q": ticker,
            "sort": "new",
            "restrict_sr": "1",
            "limit": limit,
            "t": "week",
        }
        resp = self.session.get(url, params=params, timeout=10)
        resp.raise_for_status()
        children = resp.json().get("data", {}).get("children", [])
        posts = []
        for child in children:
            d = child.get("data", {})
            title = (d.get("title") or "").strip()
            if not title or d.get("is_self") is False and not d.get("selftext"):
                # Skip link posts with no text body — just keep title
                pass
            if not title:
                continue
            posts.append({
                "id": str(d.get("id", "")),
                "title": title,
                "body": (d.get("selftext") or "")[:500].strip(),
                "sentiment": None,
                "score": int(d.get("score", 0)),
                "num_comments": int(d.get("num_comments", 0)),
                "created_utc": d.get("created_utc", 0),
                "author": d.get("author", ""),
                "subreddit": subreddit,
                "permalink": d.get("permalink", ""),
            })
        return posts

    def _to_model(self, p: dict) -> RedditPost:
        try:
            created_at = datetime.fromtimestamp(p["created_utc"], tz=timezone.utc)
        except Exception:
            created_at = datetime.now(timezone.utc)
        return RedditPost(
            id=p["id"],
            title=p["title"],
            body=p["body"],
            sentiment=p.get("sentiment"),
            score=p["score"],
            num_comments=p["num_comments"],
            created_at=created_at,
            username=p["author"],
            subreddit=p["subreddit"],
            url=f"https://reddit.com{p['permalink']}",
        )
