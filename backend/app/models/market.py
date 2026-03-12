"""
Pydantic models for the Market Overview endpoint.
"""

from pydantic import BaseModel
from typing import List, Optional


class MarketMover(BaseModel):
    ticker: str
    name: str
    price: float
    change: float
    changesPercentage: float
    volume: Optional[float] = None


class MarketQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    changesPercentage: float


class NewsItem(BaseModel):
    title: str
    url: str
    publishedDate: str
    site: str
    text: str
    symbol: Optional[str] = ""


class MarketOverview(BaseModel):
    indices: List[MarketQuote]
    gainers: List[MarketMover]
    losers: List[MarketMover]
    actives: List[MarketMover]
    news: List[NewsItem]
    fetched_at: str
    warning: Optional[str] = None
