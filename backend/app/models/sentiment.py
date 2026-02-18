"""
Pydantic models for sentiment data
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone


class StockTwitsPost(BaseModel):
    """Individual StockTwits post"""
    id: int
    body: str
    sentiment: Optional[str] = None  # "Bullish", "Bearish", or None
    created_at: datetime
    username: str
    followers: int = 0
    avatar_url: Optional[str] = None


class SentimentSignal(BaseModel):
    """Sentiment signal with bull/bear breakdown"""
    ticker: str
    signal: str  # "bullish", "bearish", "neutral"
    score: float  # -1 to 1

    # Counts
    bullish_count: int
    bearish_count: int
    neutral_count: int
    total_posts: int

    # Posts for display
    bullish_posts: List[StockTwitsPost] = Field(default_factory=list)
    bearish_posts: List[StockTwitsPost] = Field(default_factory=list)

    # Metadata
    company_name: str
    logo_url: Optional[str] = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    error: Optional[str] = None
