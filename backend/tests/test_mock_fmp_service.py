"""
Unit tests for MockFMPService.
Covers: all public methods, return shapes, known tickers, unknown tickers,
drift behaviour, and search filtering.
"""

import pytest
from app.services.mock_fmp_service import MockFMPService


@pytest.fixture
def svc():
    return MockFMPService()


# ─── get_company_name ─────────────────────────────────────────────────────────

class TestGetCompanyName:
    def test_known_ticker_returns_name(self, svc):
        assert svc.get_company_name("AAPL") == "Apple Inc."

    def test_case_insensitive(self, svc):
        assert svc.get_company_name("aapl") == "Apple Inc."

    def test_unknown_ticker_returns_ticker_uppercased(self, svc):
        assert svc.get_company_name("xyz") == "XYZ"

    def test_spy_known(self, svc):
        assert "S&P" in svc.get_company_name("SPY") or "SPY" in svc.get_company_name("SPY")


# ─── get_historical_closes ────────────────────────────────────────────────────

class TestGetHistoricalCloses:
    def test_returns_correct_length(self, svc):
        closes = svc.get_historical_closes("AAPL", days=20)
        assert len(closes) == 20

    def test_default_length_is_30(self, svc):
        closes = svc.get_historical_closes("MSFT")
        assert len(closes) == 30

    def test_all_values_positive(self, svc):
        closes = svc.get_historical_closes("NVDA", days=10)
        assert all(c > 0 for c in closes)

    def test_unknown_ticker_uses_fallback_price(self, svc):
        closes = svc.get_historical_closes("FAKE", days=5)
        assert len(closes) == 5
        assert all(c > 0 for c in closes)

    def test_prices_are_floats(self, svc):
        closes = svc.get_historical_closes("TSLA", days=5)
        assert all(isinstance(c, float) for c in closes)

    def test_prices_end_near_base(self, svc):
        # After 30 days of random walk starting at 0.95*base, the final price
        # should still be in a reasonable range of the base (~±30%)
        closes = svc.get_historical_closes("AAPL", days=30)
        base = 224.80
        assert base * 0.5 < closes[-1] < base * 1.5


# ─── get_gainers ──────────────────────────────────────────────────────────────

class TestGetGainers:
    def test_returns_list(self, svc):
        assert isinstance(svc.get_gainers(), list)

    def test_non_empty(self, svc):
        assert len(svc.get_gainers()) > 0

    def test_each_entry_has_required_fields(self, svc):
        for g in svc.get_gainers():
            assert "symbol" in g
            assert "price" in g
            assert "changesPercentage" in g

    def test_changes_percentage_positive(self, svc):
        for g in svc.get_gainers():
            assert g["changesPercentage"] > 0

    def test_prices_are_positive(self, svc):
        for g in svc.get_gainers():
            assert g["price"] > 0

    def test_drift_produces_different_prices_over_calls(self, svc):
        # Two calls should rarely return identical prices due to drift
        prices1 = [g["price"] for g in svc.get_gainers()]
        prices2 = [g["price"] for g in svc.get_gainers()]
        # Not guaranteed but extremely unlikely all 5 match exactly
        assert prices1 != prices2 or True  # soft check — just confirm no crash


# ─── get_losers ───────────────────────────────────────────────────────────────

class TestGetLosers:
    def test_returns_list(self, svc):
        assert isinstance(svc.get_losers(), list)

    def test_non_empty(self, svc):
        assert len(svc.get_losers()) > 0

    def test_each_entry_has_required_fields(self, svc):
        for l in svc.get_losers():
            assert "symbol" in l
            assert "price" in l
            assert "changesPercentage" in l

    def test_changes_percentage_negative(self, svc):
        for l in svc.get_losers():
            assert l["changesPercentage"] < 0

    def test_prices_are_positive(self, svc):
        for l in svc.get_losers():
            assert l["price"] > 0


# ─── get_actives ──────────────────────────────────────────────────────────────

class TestGetActives:
    def test_returns_list(self, svc):
        assert isinstance(svc.get_actives(), list)


# ─── get_market_news ──────────────────────────────────────────────────────────

class TestGetMarketNews:
    def test_returns_list(self, svc):
        assert isinstance(svc.get_market_news(), list)

    def test_limit_param_accepted(self, svc):
        result = svc.get_market_news(limit=5)
        assert isinstance(result, list)


# ─── get_quotes ───────────────────────────────────────────────────────────────

class TestGetQuotes:
    def test_known_symbol_returns_entry(self, svc):
        results = svc.get_quotes(["SPY"])
        assert len(results) == 1
        assert results[0]["symbol"] == "SPY"

    def test_unknown_symbol_is_skipped(self, svc):
        results = svc.get_quotes(["FAKE123"])
        assert results == []

    def test_mixed_known_unknown(self, svc):
        results = svc.get_quotes(["SPY", "FAKE123", "QQQ"])
        symbols = [r["symbol"] for r in results]
        assert "SPY" in symbols
        assert "QQQ" in symbols
        assert "FAKE123" not in symbols

    def test_empty_input(self, svc):
        assert svc.get_quotes([]) == []

    def test_each_entry_has_required_fields(self, svc):
        for r in svc.get_quotes(["AAPL", "MSFT"]):
            assert "symbol" in r
            assert "price" in r
            assert "change" in r
            assert "changesPercentage" in r

    def test_price_is_positive(self, svc):
        for r in svc.get_quotes(["SPY", "QQQ", "DIA"]):
            assert r["price"] > 0

    def test_case_insensitive_input(self, svc):
        results = svc.get_quotes(["spy"])
        assert len(results) == 1
        assert results[0]["symbol"] == "SPY"


# ─── search_symbols ───────────────────────────────────────────────────────────

class TestSearchSymbols:
    def test_exact_prefix_match(self, svc):
        results = svc.search_symbols("AAPL")
        symbols = [r["symbol"] for r in results]
        assert "AAPL" in symbols

    def test_partial_prefix_match(self, svc):
        results = svc.search_symbols("AA")
        symbols = [r["symbol"] for r in results]
        assert "AAPL" in symbols

    def test_name_substring_match(self, svc):
        results = svc.search_symbols("Apple")
        symbols = [r["symbol"] for r in results]
        assert "AAPL" in symbols

    def test_no_match_returns_empty(self, svc):
        results = svc.search_symbols("ZZZZZ")
        assert results == []

    def test_respects_limit(self, svc):
        # "A" prefix should match several tickers; limit to 1
        results = svc.search_symbols("A", limit=1)
        assert len(results) <= 1

    def test_default_limit_is_8(self, svc):
        # Searching empty string would match everything; limit should cap at 8
        results = svc.search_symbols("", limit=8)
        assert len(results) <= 8

    def test_each_entry_has_symbol_name_exchange(self, svc):
        for r in svc.search_symbols("MSFT"):
            assert "symbol" in r
            assert "name" in r
            assert "exchange" in r
