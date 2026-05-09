"""
FMP (Financial Modeling Prep) Service
Fetches company profile and historical OHLCV as a fallback data source.
"""

import requests
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

FMP_BASE = "https://financialmodelingprep.com/api/v3"
FMP_STABLE = "https://financialmodelingprep.com/stable"


class FMPService:
    def __init__(self, api_key: str = ""):
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": "Sentiviz/1.0"})

    def _get(self, endpoint: str, params: dict | None = None) -> Optional[Any]:
        if not self.api_key:
            return None
        url = f"{FMP_BASE}/{endpoint}"
        p = {"apikey": self.api_key}
        if params:
            p.update(params)
        try:
            resp = self.session.get(url, params=p, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"FMP request failed for {endpoint}: {e}")
            return None

    def _get_stable(self, endpoint: str, params: dict | None = None) -> Optional[Any]:
        if not self.api_key:
            return None
        url = f"{FMP_STABLE}/{endpoint}"
        p = {"apikey": self.api_key}
        if params:
            p.update(params)
        try:
            resp = self.session.get(url, params=p, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logger.warning(f"FMP stable request failed for {endpoint}: {e}")
            return None

    def get_company_name(self, ticker: str) -> str:
        """Return company name from FMP profile, or ticker as fallback."""
        data = self._get(f"profile/{ticker.upper()}")
        if isinstance(data, list) and data:
            return data[0].get("companyName", ticker.upper())
        return ticker.upper()

    def get_historical_closes(self, ticker: str, days: int = 30) -> List[float]:
        """Return list of adjusted close prices (oldest → newest), up to `days`."""
        data = self._get(
            f"historical-price-full/{ticker.upper()}",
            {"serietype": "line", "timeseries": days},
        )
        if not data or "historical" not in data:
            return []
        closes = [item["close"] for item in reversed(data["historical"])]
        return closes

    def get_gainers(self) -> List[Dict[str, Any]]:
        """Return top gaining stocks for the day."""
        data = self._get_stable("biggest-gainers")
        return data if isinstance(data, list) else []

    def get_losers(self) -> List[Dict[str, Any]]:
        """Return top losing stocks for the day."""
        data = self._get_stable("biggest-losers")
        return data if isinstance(data, list) else []

    def get_actives(self) -> List[Dict[str, Any]]:
        """Return most active stocks by volume for the day."""
        data = self._get_stable("actively-trading-list")
        if not isinstance(data, list) or not data:
            return []
        # The list endpoint only returns symbol+name on the free tier; enrich with quotes.
        symbols = [item["symbol"] for item in data[:10] if item.get("symbol")]
        return self.get_quotes(symbols) if symbols else []

    def get_market_news(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Return latest market news headlines."""
        data = self._get_stable("news/stock-latest", {"page": 0, "limit": limit})
        return data if isinstance(data, list) else []

    def search_symbols(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """Search tickers by symbol prefix, filtered to major US exchanges."""
        data = self._get_stable("search-symbol", {"query": query.upper(), "limit": 20})
        if not isinstance(data, list):
            return []
        us_exchanges = {"NASDAQ", "NYSE", "AMEX", "NYSE ARCA", "NYSE MKT"}
        filtered = [
            r for r in data
            if r.get("exchange", "").upper() in us_exchanges
            and "." not in r.get("symbol", "")
        ]
        return filtered[:limit]

    def get_price_change(self, ticker: str) -> Optional[Dict[str, Any]]:
        """Return period returns for a ticker: ytd, 1M, 5D, 1D etc."""
        data = self._get_stable("stock-price-change", {"symbol": ticker.upper()})
        if isinstance(data, list) and data:
            return data[0]
        return None

    def get_etf_holdings(self, etf: str) -> List[Dict[str, Any]]:
        """Return ETF constituent holdings (asset, weightPercentage)."""
        data = self._get(f"etf-holder/{etf.upper()}")
        if not isinstance(data, list):
            return []
        return [
            {"asset": h.get("asset", ""), "weightPercentage": h.get("weightPercentage")}
            for h in data
            if h.get("asset") and "." not in h.get("asset", "")
        ]

    def get_quotes(self, symbols: List[str]) -> List[Dict[str, Any]]:
        """Return quotes for a list of symbols — one request per symbol (free tier limit)."""
        results = []
        for symbol in symbols:
            data = self._get_stable("quote", {"symbol": symbol})
            if isinstance(data, list) and data:
                results.append(data[0])
            elif isinstance(data, dict) and data:
                results.append(data)
        return results
