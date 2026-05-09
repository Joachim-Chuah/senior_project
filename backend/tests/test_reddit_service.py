"""
Unit tests for RedditService
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch, call

from app.services.reddit_service import RedditService, SUBREDDITS, BASE_URL, REQUEST_DELAY
from app.models.sentiment import RedditPost


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _mock_finbert(labels=None):
    fb = MagicMock()
    if labels is not None:
        fb.classify_texts = MagicMock(return_value=labels)
    else:
        fb.classify_texts = MagicMock(side_effect=lambda texts: ["Neutral"] * len(texts))
    return fb


def _make_child(id="abc123", title="NVDA up 10%", selftext="Big news", score=100,
                num_comments=50, created_utc=1700000000, author="user1", subreddit="wallstreetbets",
                permalink="/r/wallstreetbets/comments/abc123/nvda_up_10"):
    return {
        "kind": "t3",
        "data": {
            "id": id,
            "title": title,
            "selftext": selftext,
            "is_self": True,
            "score": score,
            "num_comments": num_comments,
            "created_utc": created_utc,
            "author": author,
            "subreddit": subreddit,
            "permalink": permalink,
        }
    }


def _make_search_response(children):
    return {"data": {"children": children}}


# ─── _to_model ────────────────────────────────────────────────────────────────

class TestToModel:
    def setup_method(self):
        self.svc = RedditService()

    def test_basic_fields_mapped(self):
        p = {
            "id": "xyz", "title": "Some title", "body": "Some body",
            "sentiment": "Bullish", "score": 42, "num_comments": 7,
            "created_utc": 1700000000, "author": "trader99",
            "subreddit": "stocks", "permalink": "/r/stocks/comments/xyz/some_title",
        }
        post = self.svc._to_model(p)
        assert post.id == "xyz"
        assert post.title == "Some title"
        assert post.body == "Some body"
        assert post.sentiment == "Bullish"
        assert post.score == 42
        assert post.num_comments == 7
        assert post.username == "trader99"
        assert post.subreddit == "stocks"
        assert post.url == "https://reddit.com/r/stocks/comments/xyz/some_title"

    def test_created_at_from_utc_timestamp(self):
        p = {
            "id": "1", "title": "t", "body": "", "sentiment": None,
            "score": 0, "num_comments": 0, "created_utc": 0,
            "author": "u", "subreddit": "stocks", "permalink": "",
        }
        post = self.svc._to_model(p)
        assert post.created_at == datetime(1970, 1, 1, 0, 0, 0, tzinfo=timezone.utc)

    def test_invalid_timestamp_falls_back_to_now(self):
        p = {
            "id": "1", "title": "t", "body": "", "sentiment": None,
            "score": 0, "num_comments": 0, "created_utc": "bad",
            "author": "u", "subreddit": "stocks", "permalink": "",
        }
        post = self.svc._to_model(p)
        assert isinstance(post.created_at, datetime)

    def test_url_built_from_permalink(self):
        p = {
            "id": "1", "title": "t", "body": "", "sentiment": None,
            "score": 0, "num_comments": 0, "created_utc": 0,
            "author": "u", "subreddit": "stocks",
            "permalink": "/r/stocks/comments/1/t",
        }
        post = self.svc._to_model(p)
        assert post.url == "https://reddit.com/r/stocks/comments/1/t"


# ─── _search ─────────────────────────────────────────────────────────────────

class TestSearch:
    def setup_method(self):
        self.svc = RedditService()

    def _mock_response(self, children):
        mock_resp = MagicMock()
        mock_resp.json.return_value = _make_search_response(children)
        mock_resp.raise_for_status = MagicMock()
        self.svc.session.get = MagicMock(return_value=mock_resp)

    def test_returns_list_of_posts(self):
        self._mock_response([_make_child(title="NVDA up")])
        result = self.svc._search("wallstreetbets", "$NVDA", 25)
        assert len(result) == 1
        assert result[0]["title"] == "NVDA up"

    def test_skips_child_with_no_title(self):
        child = _make_child()
        child["data"]["title"] = ""
        self._mock_response([child])
        result = self.svc._search("wallstreetbets", "$NVDA", 25)
        assert result == []

    def test_body_truncated_to_500_chars(self):
        child = _make_child(selftext="x" * 600)
        self._mock_response([child])
        result = self.svc._search("wallstreetbets", "$NVDA", 25)
        assert len(result[0]["body"]) == 500

    def test_correct_url_and_params_used(self):
        self._mock_response([])
        self.svc._search("stocks", "$AAPL", 20)
        call_args = self.svc.session.get.call_args
        assert "stocks" in call_args[0][0]
        assert call_args[1]["params"]["q"] == "$AAPL"
        assert call_args[1]["params"]["limit"] == 20
        assert call_args[1]["params"]["restrict_sr"] == "1"

    def test_raises_on_http_error(self):
        import requests
        self.svc.session.get = MagicMock(
            side_effect=requests.exceptions.HTTPError("429")
        )
        with pytest.raises(requests.exceptions.HTTPError):
            self.svc._search("wallstreetbets", "$NVDA", 25)

    def test_empty_response_returns_empty_list(self):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()
        self.svc.session.get = MagicMock(return_value=mock_resp)
        result = self.svc._search("stocks", "$TSLA", 10)
        assert result == []


# ─── get_posts ────────────────────────────────────────────────────────────────

class TestGetPosts:
    def setup_method(self):
        self.svc = RedditService(finbert=_mock_finbert())

    def _mock_search(self, results_by_sub):
        """results_by_sub: dict mapping sub -> list of child dicts"""
        def search_side_effect(sub, ticker, limit):
            children = results_by_sub.get(sub, [])
            posts = []
            for c in children:
                d = c["data"]
                posts.append({
                    "id": d["id"], "title": d["title"],
                    "body": (d.get("selftext") or "")[:500],
                    "sentiment": None, "score": d["score"],
                    "num_comments": d["num_comments"],
                    "created_utc": d["created_utc"], "author": d["author"],
                    "subreddit": d["subreddit"], "permalink": d["permalink"],
                })
            return posts
        self.svc._search = MagicMock(side_effect=search_side_effect)

    def test_returns_posts_matching_ticker_in_title(self):
        self._mock_search({
            "wallstreetbets": [_make_child(title="NVDA just mooned", id="1")],
            "stocks": [],
            "investing": [],
        })
        posts = self.svc.get_posts("NVDA")
        assert len(posts) == 1

    def test_filters_posts_without_ticker_in_title(self):
        self._mock_search({
            "wallstreetbets": [_make_child(title="AMD is great", id="1")],
            "stocks": [],
            "investing": [],
        })
        posts = self.svc.get_posts("NVDA")
        assert len(posts) == 0

    def test_cashtag_in_title_also_matches(self):
        self._mock_search({
            "wallstreetbets": [_make_child(title="$NVDA to the moon", id="1")],
            "stocks": [],
            "investing": [],
        })
        posts = self.svc.get_posts("NVDA")
        assert len(posts) == 1

    def test_ticker_case_insensitive_match(self):
        self._mock_search({
            "wallstreetbets": [_make_child(title="nvda earnings today", id="1")],
            "stocks": [],
            "investing": [],
        })
        posts = self.svc.get_posts("nvda")
        assert len(posts) == 1

    def test_deduplicates_posts_across_subs(self):
        child = _make_child(title="NVDA up", id="same_id")
        self._mock_search({
            "wallstreetbets": [child],
            "stocks": [child],
            "investing": [],
        })
        posts = self.svc.get_posts("NVDA")
        assert len(posts) == 1

    def test_returns_empty_when_no_matching_posts(self):
        self._mock_search({"wallstreetbets": [], "stocks": [], "investing": []})
        posts = self.svc.get_posts("NVDA")
        assert posts == []

    def test_returns_reddit_post_objects(self):
        self._mock_search({
            "wallstreetbets": [_make_child(title="NVDA up 10%", id="1")],
            "stocks": [], "investing": [],
        })
        posts = self.svc.get_posts("NVDA")
        assert all(isinstance(p, RedditPost) for p in posts)

    def test_sorted_newest_first(self):
        self._mock_search({
            "wallstreetbets": [
                _make_child(title="NVDA old post", id="1", created_utc=1000000),
                _make_child(title="NVDA new post", id="2", created_utc=2000000),
            ],
            "stocks": [], "investing": [],
        })
        posts = self.svc.get_posts("NVDA")
        assert posts[0].created_at > posts[1].created_at

    def test_finbert_called_when_available(self):
        fb = _mock_finbert(["Bullish"])
        svc = RedditService(finbert=fb)
        svc._search = MagicMock(side_effect=lambda sub, t, limit: (
            [{"id": "1", "title": "NVDA up", "body": "", "sentiment": None,
              "score": 0, "num_comments": 0, "created_utc": 0,
              "author": "u", "subreddit": sub,
              "permalink": "/r/" + sub + "/1"}]
            if sub == "wallstreetbets" else []
        ))
        posts = svc.get_posts("NVDA")
        assert fb.classify_texts.called
        assert posts[0].sentiment == "Bullish"

    def test_no_finbert_leaves_sentiment_none(self):
        svc = RedditService(finbert=None)
        svc._search = MagicMock(side_effect=lambda sub, t, limit: (
            [{"id": "1", "title": "NVDA up", "body": "", "sentiment": None,
              "score": 0, "num_comments": 0, "created_utc": 0,
              "author": "u", "subreddit": sub,
              "permalink": ""}]
            if sub == "wallstreetbets" else []
        ))
        posts = svc.get_posts("NVDA")
        assert posts[0].sentiment is None

    def test_search_exception_skipped_gracefully(self):
        import requests
        self.svc._search = MagicMock(
            side_effect=requests.exceptions.ConnectionError("network error")
        )
        posts = self.svc.get_posts("NVDA")
        assert posts == []

    def test_delay_between_subreddits(self):
        """Verify REQUEST_DELAY sleep is called between subreddit fetches."""
        self.svc._search = MagicMock(return_value=[])
        with patch("app.services.reddit_service.time.sleep") as mock_sleep:
            self.svc.get_posts("AAPL")
        # Should be called len(SUBREDDITS)-1 times
        assert mock_sleep.call_count == len(SUBREDDITS) - 1
        mock_sleep.assert_called_with(REQUEST_DELAY)

    def test_no_delay_for_first_subreddit(self):
        """No sleep before the first subreddit."""
        self.svc._search = MagicMock(return_value=[])
        with patch("app.services.reddit_service.time.sleep") as mock_sleep:
            self.svc.get_posts("AAPL")
        # First call_args should not be at i=0
        assert mock_sleep.call_count == 2  # for 3 subs: delays at i=1 and i=2

    def test_aggregates_posts_from_all_subreddits(self):
        self._mock_search({
            "wallstreetbets": [_make_child(title="NVDA WSB", id="1")],
            "stocks": [_make_child(title="NVDA stocks", id="2")],
            "investing": [_make_child(title="NVDA investing", id="3")],
        })
        posts = self.svc.get_posts("NVDA")
        assert len(posts) == 3
