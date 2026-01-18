"""
Pydantic models for sentiment data
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RedditPost(BaseModel):
    """Reddit post with sentiment"""
    ticker: str
    post_id: str
    author_hash: str  # Hashed for privacy
    title: str
    text: str
    subreddit: str
    score: int
    num_comments: int
    created_utc: datetime
    sentiment_score: float  # VADER compound score [-1, 1]
    sentiment_positive: float
    sentiment_negative: float
    sentiment_neutral: float


class GDELTArticle(BaseModel):
    """GDELT news article"""
    ticker: str
    title: str
    url: str
    source: str
    published_date: str
    tone: float  # Normalized to [-1, 1]
    language: str = "en"


class SentimentData(BaseModel):
    """Aggregated sentiment data point"""
    ticker: str
    timestamp: datetime
    reddit_sentiment: float
    gdelt_sentiment: float
    fusion_sentiment: float


class SentimentSpike(BaseModel):
    """Detected sentiment spike"""
    ticker: str
    timestamp: datetime
    sentiment_value: float
    z_score: float
    spike_type: str  # "positive" or "negative"


class SentimentSummary(BaseModel):
    """Summary of current sentiment"""
    ticker: str
    current_fusion_score: float
    reddit_score: float
    gdelt_score: float
    regime: str  # "bullish", "bearish", "neutral"
    volatility: float
    trend: float
    recent_spikes: list
    last_updated: datetime = Field(default_factory=datetime.utcnow)
