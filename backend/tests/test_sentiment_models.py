"""
Unit tests for sentiment Pydantic models — RedditPost and updated SentimentSignal.
"""

import pytest
from datetime import datetime, timezone

from app.models.sentiment import RedditPost, SentimentSignal, StockTwitsPost, SentimentSummary


# ─── RedditPost ───────────────────────────────────────────────────────────────

class TestRedditPost:
    def _make(self, **kwargs):
        defaults = {
            "id": "abc123", "title": "NVDA up", "body": "big move",
            "sentiment": "Bullish", "score": 100, "num_comments": 50,
            "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
            "username": "trader1", "subreddit": "wallstreetbets",
            "url": "https://reddit.com/r/wallstreetbets/comments/abc123",
        }
        defaults.update(kwargs)
        return RedditPost(**defaults)

    def test_valid_post_created(self):
        post = self._make()
        assert post.id == "abc123"
        assert post.title == "NVDA up"

    def test_body_defaults_to_empty(self):
        post = RedditPost(
            id="1", title="t",
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="u", subreddit="stocks",
        )
        assert post.body == ""

    def test_sentiment_can_be_none(self):
        post = self._make(sentiment=None)
        assert post.sentiment is None

    def test_sentiment_bullish(self):
        post = self._make(sentiment="Bullish")
        assert post.sentiment == "Bullish"

    def test_sentiment_bearish(self):
        post = self._make(sentiment="Bearish")
        assert post.sentiment == "Bearish"

    def test_sentiment_neutral(self):
        post = self._make(sentiment="Neutral")
        assert post.sentiment == "Neutral"

    def test_score_defaults_to_zero(self):
        post = RedditPost(
            id="1", title="t",
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="u", subreddit="stocks",
        )
        assert post.score == 0

    def test_num_comments_defaults_to_zero(self):
        post = RedditPost(
            id="1", title="t",
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="u", subreddit="stocks",
        )
        assert post.num_comments == 0

    def test_url_defaults_to_empty(self):
        post = RedditPost(
            id="1", title="t",
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="u", subreddit="stocks",
        )
        assert post.url == ""

    def test_created_at_timezone_aware(self):
        post = self._make()
        assert post.created_at.tzinfo is not None

    def test_id_is_string(self):
        post = self._make(id="xyz999")
        assert isinstance(post.id, str)

    def test_serialization_roundtrip(self):
        post = self._make()
        data = post.model_dump()
        post2 = RedditPost(**data)
        assert post2.id == post.id
        assert post2.title == post.title


# ─── SentimentSignal reddit fields ───────────────────────────────────────────

class TestSentimentSignalRedditFields:
    def _make_signal(self, **kwargs):
        defaults = {
            "ticker": "NVDA", "signal": "bullish", "score": 0.8,
            "bullish_count": 10, "bearish_count": 2, "neutral_count": 3,
            "total_posts": 15, "company_name": "NVIDIA Corporation",
        }
        defaults.update(kwargs)
        return SentimentSignal(**defaults)

    def test_reddit_counts_default_to_zero(self):
        sig = self._make_signal()
        assert sig.reddit_bullish_count == 0
        assert sig.reddit_bearish_count == 0
        assert sig.reddit_total_posts == 0

    def test_reddit_posts_defaults_to_empty_list(self):
        sig = self._make_signal()
        assert sig.reddit_posts == []

    def test_reddit_counts_set_correctly(self):
        sig = self._make_signal(
            reddit_bullish_count=5, reddit_bearish_count=3, reddit_total_posts=8
        )
        assert sig.reddit_bullish_count == 5
        assert sig.reddit_bearish_count == 3
        assert sig.reddit_total_posts == 8

    def test_reddit_posts_list_accepted(self):
        post = RedditPost(
            id="1", title="NVDA mooning",
            created_at=datetime(2024, 1, 1, tzinfo=timezone.utc),
            username="u", subreddit="wallstreetbets",
        )
        sig = self._make_signal(reddit_posts=[post], reddit_total_posts=1)
        assert len(sig.reddit_posts) == 1
        assert sig.reddit_posts[0].title == "NVDA mooning"

    def test_stocktwits_fields_unchanged(self):
        sig = self._make_signal(bullish_count=10, bearish_count=2)
        assert sig.bullish_count == 10
        assert sig.bearish_count == 2

    def test_bullish_posts_defaults_to_empty(self):
        sig = self._make_signal()
        assert sig.bullish_posts == []

    def test_bearish_posts_defaults_to_empty(self):
        sig = self._make_signal()
        assert sig.bearish_posts == []

    def test_fetched_at_auto_populated(self):
        sig = self._make_signal()
        assert sig.fetched_at is not None
        assert sig.fetched_at.tzinfo is not None

    def test_error_defaults_to_none(self):
        sig = self._make_signal()
        assert sig.error is None

    def test_serialization_includes_reddit_fields(self):
        sig = self._make_signal(reddit_total_posts=5)
        data = sig.model_dump()
        assert "reddit_bullish_count" in data
        assert "reddit_bearish_count" in data
        assert "reddit_total_posts" in data
        assert "reddit_posts" in data
        assert data["reddit_total_posts"] == 5


# ─── SentimentSummary ────────────────────────────────────────────────────────

class TestSentimentSummary:
    def test_valid_summary(self):
        s = SentimentSummary(
            ticker="AAPL", company_name="Apple", signal="neutral",
            score=0.0, bullish_count=5, bearish_count=5, total_posts=10,
        )
        assert s.ticker == "AAPL"
        assert s.error is None

    def test_error_field_optional(self):
        s = SentimentSummary(
            ticker="AAPL", company_name="Apple", signal="neutral",
            score=0.0, bullish_count=0, bearish_count=0, total_posts=0,
            error="timeout",
        )
        assert s.error == "timeout"
