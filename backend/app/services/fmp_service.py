"""
FMP (Financial Modeling Prep) Service
Fetches company profile and historical OHLCV as a fallback data source.
"""

import requests
import logging
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

FMP_BASE = "https://financialmodelingprep.com/api/v3"


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
