"""
Unit tests for MarketauxService
"""

import pytest
from unittest.mock import MagicMock, patch

from app.services.marketaux_service import MarketauxService, SECTOR_INDUSTRIES, _source_from_url


# ─── _source_from_url ────────────────────────────────────────────────────────

class TestSourceFromUrl:
    def test_reuters(self):
        assert _source_from_url("https://www.reuters.com/article/something") == "Reuters"

    def test_bloomberg(self):
        assert _source_from_url("https://bloomberg.com/news/articles/x") == "Bloomberg"

    def test_cnbc(self):
        assert _source_from_url("https://www.cnbc.com/2024/01/01/article") == "CNBC"

    def test_wsj(self):
        assert _source_from_url("https://wsj.com/articles/foo") == "WSJ"

    def test_yahoo_finance_subdomain(self):
        assert _source_from_url("https://finance.yahoo.com/news/foo") == "Yahoo Finance"

    def test_yahoo_com(self):
        assert _source_from_url("https://www.yahoo.com/finance/foo") == "Yahoo Finance"

    def test_benzinga(self):
        assert _source_from_url("https://benzinga.com/article") == "Benzinga"

    def test_seeking_alpha(self):
        assert _source_from_url("https://seekingalpha.com/article") == "Seeking Alpha"

    def test_unknown_domain_returns_netloc(self):
        result = _source_from_url("https://someobscure.news/article")
        assert result == "someobscure.news"

    def test_empty_url_returns_empty(self):
        assert _source_from_url("") == ""

    def test_invalid_url_returns_empty(self):
        assert _source_from_url("not-a-url") == ""

    def test_www_prefix_stripped(self):
        assert _source_from_url("https://www.marketwatch.com/story") == "MarketWatch"


# ─── SECTOR_INDUSTRIES mapping ───────────────────────────────────────────────

class TestSectorIndustries:
    def test_semiconductors_maps_to_technology(self):
        assert SECTOR_INDUSTRIES["semiconductors"] == "Technology"

    def test_big_tech_maps_to_technology(self):
        assert SECTOR_INDUSTRIES["big_tech"] == "Technology"

    def test_energy_maps_to_energy(self):
        assert SECTOR_INDUSTRIES["energy"] == "Energy"

    def test_financials_maps_to_financial_services(self):
        assert SECTOR_INDUSTRIES["financials"] == "Financial Services"

    def test_healthcare_maps_to_healthcare(self):
        assert SECTOR_INDUSTRIES["healthcare"] == "Healthcare"

    def test_ev_maps_to_consumer_cyclical(self):
        assert SECTOR_INDUSTRIES["ev"] == "Consumer Cyclical"

    def test_real_estate_maps_to_real_estate(self):
        assert SECTOR_INDUSTRIES["real_estate"] == "Real Estate"

    def test_materials_maps_to_basic_materials(self):
        assert SECTOR_INDUSTRIES["materials"] == "Basic Materials"

    def test_defense_maps_to_industrials(self):
        assert SECTOR_INDUSTRIES["defense"] == "Industrials"

    def test_clean_energy_maps_to_energy(self):
        assert SECTOR_INDUSTRIES["clean_energy"] == "Energy"


# ─── MarketauxService._get ────────────────────────────────────────────────────

class TestMarketauxGet:
    def test_returns_none_without_api_key(self):
        svc = MarketauxService(api_key="")
        result = svc._get("news/all", {})
        assert result is None

    def test_returns_json_on_success(self):
        svc = MarketauxService(api_key="testkey")
        mock_resp = MagicMock()
        mock_resp.json.return_value = {"data": []}
        mock_resp.raise_for_status = MagicMock()
        svc.session.get = MagicMock(return_value=mock_resp)
        result = svc._get("news/all")
        assert result == {"data": []}

    def test_passes_api_token_in_params(self):
        svc = MarketauxService(api_key="mykey123")
        mock_resp = MagicMock()
        mock_resp.json.return_value = {}
        mock_resp.raise_for_status = MagicMock()
        svc.session.get = MagicMock(return_value=mock_resp)
        svc._get("news/all", {"language": "en"})
        call_kwargs = svc.session.get.call_args
        params = call_kwargs[1]["params"]
        assert params["api_token"] == "mykey123"
        assert params["language"] == "en"

    def test_returns_none_on_request_exception(self):
        import requests
        svc = MarketauxService(api_key="testkey")
        svc.session.get = MagicMock(side_effect=requests.exceptions.ConnectionError("timeout"))
        result = svc._get("news/all")
        assert result is None

    def test_returns_none_on_http_error(self):
        import requests
        svc = MarketauxService(api_key="testkey")
        mock_resp = MagicMock()
        mock_resp.raise_for_status.side_effect = requests.exceptions.HTTPError("401")
        svc.session.get = MagicMock(return_value=mock_resp)
        result = svc._get("news/all")
        assert result is None


# ─── MarketauxService._parse ──────────────────────────────────────────────────

class TestMarketauxParse:
    def setup_method(self):
        self.svc = MarketauxService(api_key="testkey")

    def _make_item(self, title="NVDA surges", url="https://reuters.com/nvda", snippet="Big move"):
        return {"title": title, "url": url, "snippet": snippet,
                "source": "Reuters", "published_at": "2024-01-01T12:00:00Z"}

    def test_parses_valid_items(self):
        data = {"data": [self._make_item()]}
        result = self.svc._parse(data)
        assert len(result) == 1
        assert result[0]["title"] == "NVDA surges"
        assert result[0]["url"] == "https://reuters.com/nvda"

    def test_skips_item_without_title(self):
        data = {"data": [{"title": "", "url": "https://reuters.com/foo"}]}
        result = self.svc._parse(data)
        assert result == []

    def test_skips_item_without_url(self):
        data = {"data": [{"title": "Something", "url": ""}]}
        result = self.svc._parse(data)
        assert result == []

    def test_returns_empty_for_none(self):
        assert self.svc._parse(None) == []

    def test_returns_empty_for_non_dict(self):
        assert self.svc._parse("string") == []
        assert self.svc._parse([]) == []

    def test_returns_empty_when_data_missing(self):
        assert self.svc._parse({}) == []

    def test_content_truncated_to_300_chars(self):
        long_snippet = "x" * 500
        data = {"data": [self._make_item(snippet=long_snippet)]}
        result = self.svc._parse(data)
        assert len(result[0]["content"]) == 300

    def test_source_from_url_when_source_missing(self):
        item = self._make_item(url="https://benzinga.com/article")
        item["source"] = ""
        data = {"data": [item]}
        result = self.svc._parse(data)
        assert result[0]["source"] == "Benzinga"

    def test_uses_description_when_no_snippet(self):
        item = self._make_item()
        item.pop("snippet", None)
        item["description"] = "Fallback description"
        data = {"data": [item]}
        result = self.svc._parse(data)
        assert result[0]["content"] == "Fallback description"

    def test_published_at_included(self):
        data = {"data": [self._make_item()]}
        result = self.svc._parse(data)
        assert result[0]["datetime"] == "2024-01-01T12:00:00Z"

    def test_multiple_items_all_parsed(self):
        items = [self._make_item(title=f"Article {i}", url=f"https://reuters.com/{i}") for i in range(4)]
        data = {"data": items}
        result = self.svc._parse(data)
        assert len(result) == 4


# ─── MarketauxService.get_sector_news ────────────────────────────────────────

class TestGetSectorNews:
    def setup_method(self):
        self.svc = MarketauxService(api_key="testkey")

    def _mock_get_returning(self, articles):
        """Make _get return a dict with 'data' list."""
        self.svc._get = MagicMock(return_value={"data": articles})

    def _make_raw(self, title="Article", url="https://reuters.com/x"):
        return {"title": title, "url": url, "snippet": "snippet",
                "source": "Reuters", "published_at": "2024-01-01T12:00:00Z"}

    def test_returns_articles_for_known_sector(self):
        self._mock_get_returning([self._make_raw()])
        result = self.svc.get_sector_news("semiconductors", ["NVDA", "AMD"])
        assert len(result) == 1

    def test_unknown_sector_id_still_calls_api(self):
        self._mock_get_returning([self._make_raw()])
        result = self.svc.get_sector_news("unknown_sector", ["XYZ"])
        assert len(result) == 1

    def test_symbols_capped_at_six(self):
        # Return non-empty so fallback doesn't mutate params in-place
        self._mock_get_returning([self._make_raw()])
        symbols = ["AAPL", "MSFT", "GOOG", "AMZN", "META", "NVDA", "AMD"]  # 7 items
        self.svc.get_sector_news("big_tech", symbols)
        call_args = self.svc._get.call_args_list[0]
        params = call_args[0][1]
        symbol_list = params["symbols"].split(",")
        assert len(symbol_list) <= 6

    def test_fallback_to_industry_only_when_empty(self):
        """If industry+symbols returns nothing, retry with industry-only."""
        call_count = [0]
        def side_effect(endpoint, params):
            call_count[0] += 1
            if call_count[0] == 1:
                return {"data": []}  # first call: empty
            return {"data": [self._make_raw()]}  # second call: has results

        self.svc._get = MagicMock(side_effect=side_effect)
        result = self.svc.get_sector_news("energy", ["XOM", "CVX"])
        assert len(result) == 1
        assert call_count[0] == 2

    def test_no_fallback_when_no_symbols(self):
        """No fallback needed if symbols list is empty."""
        self.svc._get = MagicMock(return_value={"data": []})
        result = self.svc.get_sector_news("energy", [])
        assert self.svc._get.call_count == 1

    def test_no_fallback_when_no_industry(self):
        """No fallback if sector has no industry mapping."""
        self.svc._get = MagicMock(return_value={"data": []})
        result = self.svc.get_sector_news("unknown_xyz", ["SYM"])
        assert self.svc._get.call_count == 1

    def test_empty_when_api_key_missing(self):
        svc = MarketauxService(api_key="")
        result = svc.get_sector_news("semiconductors", ["NVDA"])
        assert result == []

    def test_industries_param_set_for_known_sector(self):
        self._mock_get_returning([])
        self.svc.get_sector_news("financials", [])
        call_params = self.svc._get.call_args[0][1]
        assert call_params["industries"] == "Financial Services"
