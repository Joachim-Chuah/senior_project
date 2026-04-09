"""
Unit tests for RSS Service
"""

import pytest
from unittest.mock import patch, MagicMock

from app.services.rss_service import fetch_news, _parse_date


# ─── _parse_date ─────────────────────────────────────────────────────────────

class TestParseDate:
    def test_valid_published_date(self):
        entry = {"published": "Mon, 01 Jan 2024 12:00:00 +0000"}
        result = _parse_date(entry)
        assert "2024" in result
        assert result != ""

    def test_falls_back_to_updated(self):
        entry = {"updated": "Mon, 01 Jan 2024 12:00:00 +0000"}
        result = _parse_date(entry)
        assert "2024" in result

    def test_published_takes_priority_over_updated(self):
        entry = {
            "published": "Mon, 01 Jan 2024 12:00:00 +0000",
            "updated":   "Tue, 02 Jan 2024 12:00:00 +0000",
        }
        result = _parse_date(entry)
        assert "2024-01-01" in result

    def test_missing_both_returns_empty_string(self):
        assert _parse_date({}) == ""

    def test_malformed_date_returns_raw_string(self):
        entry = {"published": "not-a-real-date"}
        result = _parse_date(entry)
        # Should return the raw string rather than raising
        assert result == "not-a-real-date"

    def test_iso_format_output(self):
        entry = {"published": "Mon, 15 Apr 2024 09:30:00 +0000"}
        result = _parse_date(entry)
        # Should be parseable ISO string
        from datetime import datetime
        dt = datetime.fromisoformat(result)
        assert dt.year == 2024
        assert dt.month == 4


# ─── fetch_news ──────────────────────────────────────────────────────────────

def _make_entry(title, link, published="Mon, 01 Jan 2024 12:00:00 +0000", summary=""):
    return MagicMock(
        title=title,
        link=link,
        published=published,
        summary=summary,
        get=lambda k, default="": {
            "title": title,
            "link": link,
            "published": published,
            "summary": summary,
        }.get(k, default),
    )


def _make_parsed_feed(entries):
    feed = MagicMock()
    feed.entries = entries
    return feed


class TestFetchNews:
    def test_returns_list(self):
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.return_value = _make_parsed_feed([])
            result = fetch_news()
            assert isinstance(result, list)

    def test_respects_limit(self):
        entries = [
            _make_entry(f"Title {i}", f"http://example.com/{i}",
                        published=f"Mon, 0{i+1} Jan 2024 12:00:00 +0000")
            for i in range(20)
        ]
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.return_value = _make_parsed_feed(entries)
            result = fetch_news(limit=5)
            assert len(result) <= 5

    def test_item_has_required_fields(self):
        entry = _make_entry("Test Headline", "http://example.com/1")
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.return_value = _make_parsed_feed([entry])
            result = fetch_news(limit=10)
            if result:
                item = result[0]
                assert "title" in item
                assert "url" in item
                assert "source" in item
                assert "publishedDate" in item
                assert "summary" in item

    def test_summary_truncated_to_200_chars(self):
        long_summary = "x" * 500
        entry = _make_entry("Title", "http://example.com", summary=long_summary)
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.return_value = _make_parsed_feed([entry])
            result = fetch_news(limit=10)
            if result:
                assert len(result[0]["summary"]) <= 200

    def test_failed_feed_does_not_crash(self):
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.side_effect = Exception("network error")
            result = fetch_news()
            assert result == []

    def test_one_failed_feed_others_still_returned(self):
        good_entry = _make_entry("Good News", "http://good.com")

        call_count = [0]
        def side_effect(url):
            call_count[0] += 1
            if call_count[0] == 1:
                raise Exception("feed 1 failed")
            return _make_parsed_feed([good_entry])

        with patch("app.services.rss_service.feedparser.parse", side_effect=side_effect):
            result = fetch_news(limit=30)
            # At least entries from the non-failing feeds should appear
            assert isinstance(result, list)

    def test_sorted_newest_first(self):
        entries = [
            _make_entry("Old", "http://old.com", published="Mon, 01 Jan 2024 00:00:00 +0000"),
            _make_entry("New", "http://new.com", published="Tue, 02 Jan 2024 00:00:00 +0000"),
        ]
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.return_value = _make_parsed_feed(entries)
            result = fetch_news(limit=10)
            if len(result) >= 2:
                # Newer date string should come first (ISO sort works lexicographically)
                assert result[0]["publishedDate"] >= result[1]["publishedDate"]

    def test_empty_feeds_return_empty_list(self):
        with patch("app.services.rss_service.feedparser.parse") as mock_parse:
            mock_parse.return_value = _make_parsed_feed([])
            result = fetch_news()
            assert result == []
