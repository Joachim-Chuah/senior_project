"""
Pydantic models for sentiment data
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone


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
    reddit_posts: int = 0
    gdelt_articles: int = 0
    regime: str  # "bullish", "bearish", "neutral"
    volatility: float
    trend: float
    recent_spikes: List[SentimentSpike]
    last_updated: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RedditExplanation(BaseModel):
    """Explanation of Reddit sentiment analysis"""
    total_posts: int
    positive_count: int
    negative_count: int
    neutral_count: int
    top_keywords: list[str] = Field(default_factory=list)
    top_posts: list[dict] = Field(default_factory=list)  # [{title, score, sentiment}]
    subreddits: list[str] = Field(default_factory=list)
    average_score: float
    confidence: float = 0.0


class GDELTExplanation(BaseModel):
    """Explanation of GDELT sentiment analysis"""
    total_articles: int
    positive_count: int
    negative_count: int
    neutral_count: int
    top_themes: list[str] = Field(default_factory=list)
    top_sources: list[str] = Field(default_factory=list)
    articles: list[GDELTArticle] = Field(default_factory=list)
    average_tone: float
    confidence: float = 0.0


class SentimentExplanation(BaseModel):
    """Complete explanation of sentiment analysis"""
    ticker: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Scores
    reddit_score: float
    gdelt_score: float
    fusion_score: float
    
    # Weights
    reddit_weight: float
    gdelt_weight: float
    
    # Regime
    regime: str
    regime_reasoning: str
    
    # Detailed explanations
    reddit_explanation: Optional[RedditExplanation] = None
    gdelt_explanation: Optional[GDELTExplanation] = None
    
    # Key factors
    key_factors: list[str] = Field(default_factory=list)
