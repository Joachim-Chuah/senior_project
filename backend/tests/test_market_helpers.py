"""
Unit tests for market.py helper functions and caching logic
"""

import json
import pytest
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from unittest.mock import patch

from app.api.market import (
    _last_trading_date,
    _prev_trading_date,
    _market_closed_for_day,
    _load_summary_cache,
    _save_summary_cache,
)

ET = ZoneInfo("America/New_York")


def _et(year, month, day, hour=12, minute=0):
    return datetime(year, month, day, hour, minute, tzinfo=ET)


# ─── _last_trading_date ───────────────────────────────────────────────────────

class TestLastTradingDate:
    def test_weekday_returns_same_day(self):
        # Monday 2024-01-08
        dt = _et(2024, 1, 8)
        assert _last_trading_date(dt) == "2024-01-08"

    def test_friday_returns_same_day(self):
        # Friday 2024-01-05
        dt = _et(2024, 1, 5)
        assert _last_trading_date(dt) == "2024-01-05"

    def test_saturday_returns_friday(self):
        # Saturday 2024-01-06 → Friday 2024-01-05
        dt = _et(2024, 1, 6)
        assert _last_trading_date(dt) == "2024-01-05"

    def test_sunday_returns_friday(self):
        # Sunday 2024-01-07 → Friday 2024-01-05
        dt = _et(2024, 1, 7)
        assert _last_trading_date(dt) == "2024-01-05"

    def test_wednesday_returns_wednesday(self):
        # Wednesday 2024-01-10
        dt = _et(2024, 1, 10)
        assert _last_trading_date(dt) == "2024-01-10"


# ─── _prev_trading_date ───────────────────────────────────────────────────────

class TestPrevTradingDate:
    def test_tuesday_returns_monday(self):
        # Tuesday 2024-01-09 → Monday 2024-01-08
        dt = _et(2024, 1, 9)
        assert _prev_trading_date(dt) == "2024-01-08"

    def test_monday_returns_friday(self):
        # Monday 2024-01-08 → Friday 2024-01-05
        dt = _et(2024, 1, 8)
        assert _prev_trading_date(dt) == "2024-01-05"

    def test_saturday_returns_thursday(self):
        # Saturday 2024-01-06 → last trading = Friday 2024-01-05 → prev = Thursday 2024-01-04
        dt = _et(2024, 1, 6)
        assert _prev_trading_date(dt) == "2024-01-04"

    def test_sunday_returns_thursday(self):
        # Sunday 2024-01-07 → last trading = Friday 2024-01-05 → prev = Thursday 2024-01-04
        dt = _et(2024, 1, 7)
        assert _prev_trading_date(dt) == "2024-01-04"

    def test_wednesday_returns_tuesday(self):
        dt = _et(2024, 1, 10)
        assert _prev_trading_date(dt) == "2024-01-09"


# ─── _market_closed_for_day ───────────────────────────────────────────────────

class TestMarketClosedForDay:
    def test_weekday_before_4pm_is_open(self):
        dt = _et(2024, 1, 8, hour=13)  # Monday 1 PM ET
        assert _market_closed_for_day(dt) is False

    def test_weekday_at_4pm_is_closed(self):
        dt = _et(2024, 1, 8, hour=16)  # Monday 4 PM ET
        assert _market_closed_for_day(dt) is True

    def test_weekday_after_4pm_is_closed(self):
        dt = _et(2024, 1, 8, hour=17)  # Monday 5 PM ET
        assert _market_closed_for_day(dt) is True

    def test_saturday_is_closed(self):
        dt = _et(2024, 1, 6, hour=10)  # Saturday morning
        assert _market_closed_for_day(dt) is True

    def test_sunday_is_closed(self):
        dt = _et(2024, 1, 7, hour=10)  # Sunday morning
        assert _market_closed_for_day(dt) is True

    def test_weekday_morning_is_open(self):
        dt = _et(2024, 1, 8, hour=9, minute=30)  # Monday market open
        assert _market_closed_for_day(dt) is False

    def test_weekday_just_before_close_is_open(self):
        dt = _et(2024, 1, 8, hour=15, minute=59)  # Monday 3:59 PM
        assert _market_closed_for_day(dt) is False


# ─── _load_summary_cache ─────────────────────────────────────────────────────

class TestLoadSummaryCache:
    def test_returns_empty_dict_when_file_missing(self, tmp_path):
        path = tmp_path / "missing.json"
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            result = _load_summary_cache()
        assert result == {}

    def test_returns_dict_from_valid_file(self, tmp_path):
        data = {"2024-01-08": {"summary": "Markets closed higher.", "generated_at": "2024-01-08T21:00:00Z"}}
        path = tmp_path / "cache.json"
        path.write_text(json.dumps(data))
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            result = _load_summary_cache()
        assert result == data

    def test_returns_empty_dict_on_corrupt_json(self, tmp_path):
        path = tmp_path / "bad.json"
        path.write_text("{ not valid json }")
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            result = _load_summary_cache()
        assert result == {}


# ─── _save_summary_cache ─────────────────────────────────────────────────────

class TestSaveSummaryCache:
    def test_writes_file(self, tmp_path):
        path = tmp_path / "cache.json"
        data = {"2024-01-08": {"summary": "Test.", "generated_at": "2024-01-08T21:00:00Z"}}
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            _save_summary_cache(data)
        assert path.exists()

    def test_keeps_only_two_most_recent_keys(self, tmp_path):
        path = tmp_path / "cache.json"
        data = {
            "2024-01-06": {"summary": "Old.", "generated_at": ""},
            "2024-01-07": {"summary": "Yesterday.", "generated_at": ""},
            "2024-01-08": {"summary": "Today.", "generated_at": ""},
        }
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            _save_summary_cache(data)
            saved = json.loads(path.read_text())
        assert len(saved) == 2
        assert "2024-01-08" in saved
        assert "2024-01-07" in saved
        assert "2024-01-06" not in saved

    def test_single_key_preserved(self, tmp_path):
        path = tmp_path / "cache.json"
        data = {"2024-01-08": {"summary": "Only one.", "generated_at": ""}}
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            _save_summary_cache(data)
            saved = json.loads(path.read_text())
        assert len(saved) == 1

    def test_written_json_is_valid(self, tmp_path):
        path = tmp_path / "cache.json"
        data = {"2024-01-08": {"summary": "Valid.", "generated_at": "2024-01-08T21:00:00Z"}}
        with patch("app.api.market.SUMMARY_CACHE_PATH", path):
            _save_summary_cache(data)
        # Should not raise
        parsed = json.loads(path.read_text())
        assert isinstance(parsed, dict)
