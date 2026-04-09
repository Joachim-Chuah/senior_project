"""
Unit tests for StockTwitsService
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services.stocktwits_service import StockTwitsService


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_msg(id=1, body="test", sentiment_basic=None, created_at="2024-01-01T12:00:00Z",
              username="trader1", followers=100, avatar_url=None):
    msg = {
        "id": id,
        "body": body,
        "created_at": created_at,
        "user": {"username": username, "followers": followers, "avatar_url_ssl": avatar_url},
        "entities": {},
    }
    if sentiment_basic is not None:
        msg["entities"]["sentiment"] = {"basic": sentiment_basic}
    return msg


def _make_api_response(messages, symbol_title="Apple Inc", logo_url=None):
    return {
        "messages": messages,
        "symbol": {"title": symbol_title, "logo_url": logo_url},
    }


# ─── _parse_message ───────────────────────────────────────────────────────────

class TestParseMessage:
    def setup_method(self):
        self.svc = StockTwitsService()

    def test_bullish_sentiment(self):
        msg = _make_msg(sentiment_basic="Bullish")
        post = self.svc._parse_message(msg, "AAPL")
        assert post.sentiment == "Bullish"

    def test_bearish_sentiment(self):
        msg = _make_msg(sentiment_basic="Bearish")
        post = self.svc._parse_message(msg, "AAPL")
        assert post.sentiment == "Bearish"

    def test_no_sentiment(self):
        msg = _make_msg(sentiment_basic=None)
        post = self.svc._parse_message(msg, "AAPL")
        assert post.sentiment is None

    def test_fields_mapped_correctly(self):
        msg = _make_msg(id=42, body="Going up!", username="bull_trader", followers=500,
                        avatar_url="https://example.com/pic.jpg")
        post = self.svc._parse_message(msg, "AAPL")
        assert post.id == 42
        assert post.body == "Going up!"
        assert post.username == "bull_trader"
        assert post.followers == 500
        assert post.avatar_url == "https://example.com/pic.jpg"

    def test_valid_timestamp_parsed(self):
        msg = _make_msg(created_at="2024-06-15T10:30:00Z")
        post = self.svc._parse_message(msg, "AAPL")
        assert post.created_at.year == 2024
        assert post.created_at.month == 6
        assert post.created_at.day == 15

    def test_malformed_timestamp_falls_back(self):
        msg = _make_msg(created_at="not-a-date")
        post = self.svc._parse_message(msg, "AAPL")
        # Should not raise; falls back to now
        assert isinstance(post.created_at, datetime)

    def test_missing_user_defaults(self):
        msg = _make_msg()
        msg["user"] = {}  # empty user
        post = self.svc._parse_message(msg, "AAPL")
        assert post.username == "Anonymous"
        assert post.followers == 0
        assert post.avatar_url is None


# ─── _empty_signal ────────────────────────────────────────────────────────────

class TestEmptySignal:
    def setup_method(self):
        self.svc = StockTwitsService()

    def test_returns_neutral_signal(self):
        sig = self.svc._empty_signal("TSLA")
        assert sig.signal == "neutral"
        assert sig.score == 0.0

    def test_ticker_uppercased(self):
        sig = self.svc._empty_signal("tsla")
        assert sig.ticker == "TSLA"

    def test_all_counts_zero(self):
        sig = self.svc._empty_signal("TSLA")
        assert sig.bullish_count == 0
        assert sig.bearish_count == 0
        assert sig.neutral_count == 0
        assert sig.total_posts == 0

    def test_empty_post_lists(self):
        sig = self.svc._empty_signal("TSLA")
        assert sig.bullish_posts == []
        assert sig.bearish_posts == []

    def test_error_stored(self):
        sig = self.svc._empty_signal("TSLA", error="timeout")
        assert sig.error == "timeout"

    def test_no_error_by_default(self):
        sig = self.svc._empty_signal("TSLA")
        assert sig.error is None


# ─── Score & signal calculation ──────────────────────────────────────────────

class TestSentimentScoreCalculation:
    """Tests for score and signal logic via mocked HTTP."""

    def setup_method(self):
        self.svc = StockTwitsService()

    def _mock_get(self, messages, symbol_title="Test Corp"):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _make_api_response(messages, symbol_title)
        mock_resp.raise_for_status = MagicMock()
        self.svc.session.get = MagicMock(return_value=mock_resp)

    @pytest.mark.asyncio
    async def test_all_bullish_score_is_one(self):
        msgs = [_make_msg(id=i, sentiment_basic="Bullish") for i in range(5)]
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.score == 1.0
        assert sig.signal == "bullish"

    @pytest.mark.asyncio
    async def test_all_bearish_score_is_minus_one(self):
        msgs = [_make_msg(id=i, sentiment_basic="Bearish") for i in range(5)]
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.score == -1.0
        assert sig.signal == "bearish"

    @pytest.mark.asyncio
    async def test_equal_bull_bear_score_is_zero(self):
        msgs = (
            [_make_msg(id=i, sentiment_basic="Bullish") for i in range(3)] +
            [_make_msg(id=i+10, sentiment_basic="Bearish") for i in range(3)]
        )
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.score == 0.0
        assert sig.signal == "neutral"

    @pytest.mark.asyncio
    async def test_no_scored_posts_score_is_zero(self):
        msgs = [_make_msg(id=i, sentiment_basic=None) for i in range(5)]
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.score == 0.0
        assert sig.signal == "neutral"

    @pytest.mark.asyncio
    async def test_signal_bullish_above_threshold(self):
        # 4 bullish, 1 bearish → score = (4-1)/5 = 0.6 > 0.2
        msgs = (
            [_make_msg(id=i, sentiment_basic="Bullish") for i in range(4)] +
            [_make_msg(id=10, sentiment_basic="Bearish")]
        )
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.signal == "bullish"

    @pytest.mark.asyncio
    async def test_signal_neutral_within_threshold(self):
        # 3 bullish, 2 bearish → score = (3-2)/5 = 0.2 (not > 0.2, so neutral)
        msgs = (
            [_make_msg(id=i, sentiment_basic="Bullish") for i in range(3)] +
            [_make_msg(id=i+10, sentiment_basic="Bearish") for i in range(2)]
        )
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.signal == "neutral"

    @pytest.mark.asyncio
    async def test_counts_correct(self):
        msgs = (
            [_make_msg(id=i, sentiment_basic="Bullish") for i in range(3)] +
            [_make_msg(id=i+10, sentiment_basic="Bearish") for i in range(2)] +
            [_make_msg(id=i+20, sentiment_basic=None) for i in range(4)]
        )
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.bullish_count == 3
        assert sig.bearish_count == 2
        assert sig.neutral_count == 4
        assert sig.total_posts == 9

    @pytest.mark.asyncio
    async def test_bull_bear_posts_capped_at_five(self):
        msgs = [_make_msg(id=i, sentiment_basic="Bullish") for i in range(10)]
        self._mock_get(msgs)
        sig = await self.svc.get_sentiment("AAPL")
        assert len(sig.bullish_posts) <= 5

    @pytest.mark.asyncio
    async def test_ticker_uppercased_in_result(self):
        self._mock_get([])
        sig = await self.svc.get_sentiment("aapl")
        assert sig.ticker == "AAPL"

    @pytest.mark.asyncio
    async def test_no_messages_key_returns_empty_signal(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}  # no 'messages' key
        mock_resp.raise_for_status = MagicMock()
        self.svc.session.get = MagicMock(return_value=mock_resp)
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.signal == "neutral"
        assert sig.total_posts == 0

    @pytest.mark.asyncio
    async def test_http_error_returns_empty_signal(self):
        import requests
        self.svc.session.get = MagicMock(
            side_effect=requests.exceptions.RequestException("timeout")
        )
        sig = await self.svc.get_sentiment("AAPL")
        assert sig.signal == "neutral"
        assert sig.error is not None

    @pytest.mark.asyncio
    async def test_company_name_from_api(self):
        self._mock_get([], symbol_title="NVIDIA Corporation")
        sig = await self.svc.get_sentiment("NVDA")
        assert sig.company_name == "NVIDIA Corporation"
