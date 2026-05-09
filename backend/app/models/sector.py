from pydantic import BaseModel
from typing import List, Optional


class SectorStock(BaseModel):
    ticker: str
    name: str
    ytd_return: float
    one_month_return: float
    weight: Optional[float] = None


class SectorSummary(BaseModel):
    id: str
    name: str
    etf: str
    category: str
    ytd_return: float
    one_month_return: float
    stock_count: int
    phase: str
    rotation: str


class SectorDetail(BaseModel):
    id: str
    name: str
    etf: str
    category: str
    ytd_return: float
    one_month_return: float
    winner_count: int
    loser_count: int
    median_return: float
    avg_return: float
    stocks: List[SectorStock]
    narrative: Optional[str] = None
    articles: List[dict] = []
    cached_at: str
