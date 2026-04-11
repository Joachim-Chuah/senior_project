"""
Mock FMP Service for demo mode.
Returns realistic hardcoded market data with small random drift on each call.
Drop-in replacement for FMPService — same interface, no network calls.
"""

import random
from typing import List, Dict, Any

# Approximate prices (early 2025)
_BASE_PRICES: Dict[str, float] = {
    "SPY":  574.50,
    "AAPL": 224.80,
    "MSFT": 418.30,
    "NVDA": 876.40,
    "META": 618.20,
    "GOOGL": 175.60,
    "AMZN": 205.40,
    "TSLA": 248.70,
    "AMD":  107.90,
    "CRWD": 394.20,
    "INTC":  21.80,
    "PFE":   28.40,
    "BA":   174.50,
    "WBA":   11.20,
    "PARA":  11.80,
    "QQQ":  492.30,
    "DIA":  424.80,
}

_COMPANY_NAMES: Dict[str, str] = {
    "SPY":   "SPDR S&P 500 ETF",
    "QQQ":   "Invesco QQQ Trust",
    "DIA":   "SPDR Dow Jones ETF",
    "AAPL":  "Apple Inc.",
    "MSFT":  "Microsoft Corporation",
    "NVDA":  "NVIDIA Corporation",
    "META":  "Meta Platforms Inc.",
    "GOOGL": "Alphabet Inc.",
    "AMZN":  "Amazon.com Inc.",
    "TSLA":  "Tesla Inc.",
    "AMD":   "Advanced Micro Devices",
    "CRWD":  "CrowdStrike Holdings",
    "INTC":  "Intel Corporation",
    "PFE":   "Pfizer Inc.",
    "BA":    "Boeing Company",
    "WBA":   "Walgreens Boots Alliance",
    "PARA":  "Paramount Global",
}

_GAINERS_BASE = [
    {"symbol": "NVDA", "name": "NVIDIA Corporation",       "price": 876.40, "changesPercentage":  7.2, "change":  58.90, "volume": 48200000},
    {"symbol": "META", "name": "Meta Platforms Inc.",      "price": 618.20, "changesPercentage":  5.8, "change":  33.90, "volume": 19800000},
    {"symbol": "AAPL", "name": "Apple Inc.",               "price": 224.80, "changesPercentage":  4.1, "change":   8.85, "volume": 72300000},
    {"symbol": "AMD",  "name": "Advanced Micro Devices",   "price": 107.90, "changesPercentage":  6.3, "change":   6.38, "volume": 55100000},
    {"symbol": "CRWD", "name": "CrowdStrike Holdings",     "price": 394.20, "changesPercentage":  3.9, "change":  14.79, "volume":  3800000},
]

_LOSERS_BASE = [
    {"symbol": "INTC", "name": "Intel Corporation",        "price":  21.80, "changesPercentage": -4.2, "change":  -0.95, "volume": 61200000},
    {"symbol": "PFE",  "name": "Pfizer Inc.",              "price":  28.40, "changesPercentage": -3.1, "change":  -0.91, "volume": 34500000},
    {"symbol": "BA",   "name": "Boeing Company",           "price": 174.50, "changesPercentage": -5.7, "change": -10.52, "volume": 15300000},
    {"symbol": "WBA",  "name": "Walgreens Boots Alliance", "price":  11.20, "changesPercentage": -6.8, "change":  -0.82, "volume": 22100000},
    {"symbol": "PARA", "name": "Paramount Global",         "price":  11.80, "changesPercentage": -2.9, "change":  -0.35, "volume": 14700000},
]


def _drift(base: float, pct: float = 0.003) -> float:
    """Nudge a price by up to ±pct so numbers feel live."""
    return round(base * (1 + random.uniform(-pct, pct)), 2)


class MockFMPService:
    """Demo-mode drop-in for FMPService. No network calls, no API key needed."""

    def get_company_name(self, ticker: str) -> str:
        return _COMPANY_NAMES.get(ticker.upper(), ticker.upper())

    def get_historical_closes(self, ticker: str, days: int = 30) -> List[float]:
        """Generate a realistic random-walk price series ending near the base price."""
        base = _BASE_PRICES.get(ticker.upper(), 100.0)
        price = base * 0.95
        closes = []
        for _ in range(days):
            price *= 1 + random.gauss(0.0004, 0.012)
            closes.append(round(price, 2))
        return closes

    def get_gainers(self) -> List[Dict[str, Any]]:
        return [
            {**g, "price": _drift(g["price"])}
            for g in _GAINERS_BASE
        ]

    def get_losers(self) -> List[Dict[str, Any]]:
        return [
            {**l, "price": _drift(l["price"])}
            for l in _LOSERS_BASE
        ]

    def get_actives(self) -> List[Dict[str, Any]]:
        return []

    def get_market_news(self, limit: int = 20) -> List[Dict[str, Any]]:
        return []

    def get_quotes(self, symbols: List[str]) -> List[Dict[str, Any]]:
        results = []
        for symbol in symbols:
            base = _BASE_PRICES.get(symbol.upper())
            if base is None:
                continue
            price = _drift(base)
            change_pct = round(random.uniform(-0.8, 1.2), 2)
            change = round(base * change_pct / 100, 2)
            results.append({
                "symbol":            symbol.upper(),
                "name":              _COMPANY_NAMES.get(symbol.upper(), symbol.upper()),
                "price":             price,
                "change":            change,
                "changesPercentage": change_pct,
                "changePercentage":  change_pct,
            })
        return results

    def search_symbols(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        q = query.upper()
        results = [
            {"symbol": sym, "name": name, "exchange": "NASDAQ"}
            for sym, name in _COMPANY_NAMES.items()
            if sym.startswith(q) or q in name.upper()
        ]
        return results[:limit]
