"""
API routes for sentiment data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.services.sentiment_service import SentimentService
from app.models.sentiment import RedditPost, GDELTArticle, SentimentSummary

logger = logging.getLogger(__name__)
router = APIRouter()

sentiment_service = SentimentService()


@router.get("/reddit/{ticker}", response_model=List[RedditPost])
async def get_reddit_sentiment(
    ticker: str,
    subreddits: Optional[str] = Query(None, description="Comma-separated subreddit names"),
    limit: int = Query(100, ge=1, le=500)
):
    """
    Get Reddit sentiment for a ticker

    Args:
        ticker: Stock ticker symbol
        subreddits: Optional comma-separated subreddit names
        limit: Maximum number of posts to fetch
    """
    try:
        subreddit_list = subreddits.split(",") if subreddits else \
                         ["wallstreetbets", "stocks", "investing"]

        posts = await sentiment_service.get_reddit_sentiment(
            ticker,
            subreddit_list,
            limit
        )

        return posts

    except Exception as e:
        logger.error(f"Error fetching Reddit sentiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/gdelt/{ticker}", response_model=List[GDELTArticle])
async def get_gdelt_sentiment(
    ticker: str,
    keywords: Optional[str] = Query(None, description="Comma-separated keywords")
):
    """
    Get GDELT news sentiment for a ticker

    Args:
        ticker: Stock ticker symbol
        keywords: Optional comma-separated additional keywords
    """
    try:
        keyword_list = keywords.split(",") if keywords else None

        articles = await sentiment_service.get_gdelt_sentiment(
            ticker,
            keyword_list
        )

        return articles

    except Exception as e:
        logger.error(f"Error fetching GDELT sentiment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{ticker}", response_model=SentimentSummary)
async def get_sentiment_summary(ticker: str):
    """
    Get aggregated sentiment summary for a ticker

    Args:
        ticker: Stock ticker symbol
    """
    try:
        # Fetch both sources
        reddit_posts = await sentiment_service.get_reddit_sentiment(ticker, limit=50)
        gdelt_articles = await sentiment_service.get_gdelt_sentiment(ticker)

        # Calculate aggregate
        reddit_score = sum(p.sentiment_score for p in reddit_posts) / len(reddit_posts) \
                      if reddit_posts else 0.0
        gdelt_score = sum(a.tone for a in gdelt_articles) / len(gdelt_articles) \
                     if gdelt_articles else 0.0

        fusion_score = sentiment_service.calculate_aggregate_sentiment(
            reddit_posts,
            gdelt_articles
        )

        # Determine regime
        if fusion_score > 0.3:
            regime = "bullish"
        elif fusion_score < -0.3:
            regime = "bearish"
        else:
            regime = "neutral"

        return SentimentSummary(
            ticker=ticker,
            current_fusion_score=fusion_score,
            reddit_score=reddit_score,
            gdelt_score=gdelt_score,
            regime=regime,
            volatility=0.0,  # Will be calculated by fusion service
            trend=0.0,
            recent_spikes=[]
        )

    except Exception as e:
        logger.error(f"Error generating sentiment summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
