"""
Unit tests for FMPService
"""

import pytest
from unittest.mock import MagicMock, patch

from app.services.fmp_service import FMPService


def _make_service(api_key="test_key"):
    return FMPService(api_key=api_key)


# ─── Empty API key ────────────────────────────────────────────────────────────

class TestEmptyApiKey:
    def test_get_returns_none_without_key(self):
        svc = FMPService(api_key="")
        result = svc._get("profile/AAPL")
        assert result is None

    def test_get_stable_returns_none_without_key(self):
        svc = FMPService(api_key="")
        result = svc._get_stable("quote", {"symbol": "AAPL"})
        assert result is None

    def test_get_gainers_returns_empty_without_key(self):
        svc = FMPService(api_key="")
        assert svc.get_gainers() == []

    def test_get_losers_returns_empty_without_key(self):
        svc = FMPService(api_key="")
        assert svc.get_losers() == []

    def test_get_quotes_returns_empty_without_key(self):
        svc = FMPService(api_key="")
        assert svc.get_quotes(["AAPL"]) == []

    def test_search_symbols_returns_empty_without_key(self):
        svc = FMPService(api_key="")
        assert svc.search_symbols("AAPL") == []


# ─── get_quotes ───────────────────────────────────────────────────────────────

class TestGetQuotes:
    def setup_method(self):
        self.svc = _make_service()

    def test_list_response_appended(self):
        quote = {"symbol": "AAPL", "price": 150.0}
        self.svc._get_stable = MagicMock(return_value=[quote])
        results = self.svc.get_quotes(["AAPL"])
        assert len(results) == 1
        assert results[0]["symbol"] == "AAPL"

    def test_dict_response_appended(self):
        quote = {"symbol": "AAPL", "price": 150.0}
        self.svc._get_stable = MagicMock(return_value=quote)
        results = self.svc.get_quotes(["AAPL"])
        assert len(results) == 1

    def test_empty_list_response_skipped(self):
        self.svc._get_stable = MagicMock(return_value=[])
        results = self.svc.get_quotes(["AAPL"])
        assert results == []

    def test_none_response_skipped(self):
        self.svc._get_stable = MagicMock(return_value=None)
        results = self.svc.get_quotes(["AAPL"])
        assert results == []

    def test_multiple_symbols_one_call_each(self):
        quote = {"symbol": "X", "price": 100.0}
        self.svc._get_stable = MagicMock(return_value=[quote])
        results = self.svc.get_quotes(["AAPL", "MSFT", "NVDA"])
        assert self.svc._get_stable.call_count == 3
        assert len(results) == 3

    def test_empty_symbol_list(self):
        results = self.svc.get_quotes([])
        assert results == []


# ─── search_symbols ───────────────────────────────────────────────────────────

class TestSearchSymbols:
    def setup_method(self):
        self.svc = _make_service()

    def _mock_search(self, results):
        self.svc._get_stable = MagicMock(return_value=results)

    def test_filters_non_us_exchanges(self):
        self._mock_search([
            {"symbol": "AAPL", "exchange": "NASDAQ", "name": "Apple"},
            {"symbol": "VOD", "exchange": "LSE", "name": "Vodafone"},
        ])
        results = self.svc.search_symbols("A")
        assert len(results) == 1
        assert results[0]["symbol"] == "AAPL"

    def test_excludes_symbols_with_dots(self):
        self._mock_search([
            {"symbol": "BRK.A", "exchange": "NYSE", "name": "Berkshire"},
            {"symbol": "AAPL", "exchange": "NASDAQ", "name": "Apple"},
        ])
        results = self.svc.search_symbols("A")
        assert len(results) == 1
        assert results[0]["symbol"] == "AAPL"

    def test_allows_all_us_exchanges(self):
        self._mock_search([
            {"symbol": "A", "exchange": "NASDAQ"},
            {"symbol": "B", "exchange": "NYSE"},
            {"symbol": "C", "exchange": "AMEX"},
            {"symbol": "D", "exchange": "NYSE ARCA"},
            {"symbol": "E", "exchange": "NYSE MKT"},
        ])
        results = self.svc.search_symbols("X")
        assert len(results) == 5

    def test_respects_limit(self):
        self._mock_search([
            {"symbol": f"T{i}", "exchange": "NYSE"} for i in range(15)
        ])
        results = self.svc.search_symbols("T", limit=5)
        assert len(results) == 5

    def test_non_list_response_returns_empty(self):
        self._mock_search(None)
        results = self.svc.search_symbols("AAPL")
        assert results == []

    def test_empty_response_returns_empty(self):
        self._mock_search([])
        results = self.svc.search_symbols("AAPL")
        assert results == []


# ─── get_gainers / get_losers / get_actives ───────────────────────────────────

class TestGetMovers:
    def setup_method(self):
        self.svc = _make_service()

    def test_get_gainers_returns_list(self):
        data = [{"symbol": "X", "changesPercentage": 10.0}]
        self.svc._get_stable = MagicMock(return_value=data)
        assert self.svc.get_gainers() == data

    def test_get_losers_returns_list(self):
        data = [{"symbol": "Y", "changesPercentage": -10.0}]
        self.svc._get_stable = MagicMock(return_value=data)
        assert self.svc.get_losers() == data

    def test_get_gainers_non_list_returns_empty(self):
        self.svc._get_stable = MagicMock(return_value={"error": "premium"})
        assert self.svc.get_gainers() == []

    def test_get_losers_none_returns_empty(self):
        self.svc._get_stable = MagicMock(return_value=None)
        assert self.svc.get_losers() == []


# ─── get_company_name ─────────────────────────────────────────────────────────

class TestGetCompanyName:
    def setup_method(self):
        self.svc = _make_service()

    def test_returns_company_name(self):
        self.svc._get = MagicMock(return_value=[{"companyName": "Apple Inc"}])
        assert self.svc.get_company_name("AAPL") == "Apple Inc"

    def test_falls_back_to_ticker_on_empty(self):
        self.svc._get = MagicMock(return_value=[])
        assert self.svc.get_company_name("AAPL") == "AAPL"

    def test_falls_back_to_ticker_on_none(self):
        self.svc._get = MagicMock(return_value=None)
        assert self.svc.get_company_name("NVDA") == "NVDA"

    def test_ticker_uppercased_in_fallback(self):
        self.svc._get = MagicMock(return_value=None)
        assert self.svc.get_company_name("nvda") == "NVDA"
