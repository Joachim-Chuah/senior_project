"""
API routes for sentiment data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
import logging

from app.services.sentiment_service import SentimentService
from app.models.sentiment import RedditPost, GDELTArticle, SentimentSummary, SentimentExplanation
from app.utils.validation import validate_ticker
from app.utils.errors import handle_api_error, TickerNotFoundError, ExternalAPIError

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
        # Validate and normalize ticker
        ticker = validate_ticker(ticker)

        subreddit_list = subreddits.split(",") if subreddits else \
                         ["wallstreetbets", "stocks", "investing"]

        posts = await sentiment_service.get_reddit_sentiment(
            ticker,
            subreddit_list,
            limit
        )

        return posts

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Reddit sentiment for {ticker}: {e}")
        raise handle_api_error(e, ticker, "fetching Reddit sentiment")


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
        # Validate and normalize ticker
        ticker = validate_ticker(ticker)

        keyword_list = keywords.split(",") if keywords else None

        articles = await sentiment_service.get_gdelt_sentiment(
            ticker,
            keyword_list
        )

        return articles

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching GDELT sentiment for {ticker}: {e}")
        raise handle_api_error(e, ticker, "fetching GDELT sentiment")


@router.get("/explanation/{ticker}", response_model=SentimentExplanation)
async def get_sentiment_explanation(ticker: str):
    """
    Get detailed explanation for current sentiment analysis
    """
    try:
        # Validate and normalize ticker
        ticker = validate_ticker(ticker)

        # Fetch both sources
        reddit_posts = await sentiment_service.get_reddit_sentiment(ticker, limit=50)
        gdelt_articles = await sentiment_service.get_gdelt_sentiment(ticker)

        # Generate explanation
        explanation = await sentiment_service.get_sentiment_explanation(
            ticker,
            reddit_posts,
            gdelt_articles
        )

        return explanation

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating sentiment explanation for {ticker}: {e}")
        raise handle_api_error(e, ticker, "generating sentiment explanation")


@router.get("/summary/{ticker}", response_model=SentimentSummary)
async def get_sentiment_summary(ticker: str):
    """
    Get aggregated sentiment summary for a ticker
    """
    try:
        from app.api.fusion import fusion_service
        from datetime import datetime, timezone

        # Validate and normalize ticker
        ticker = validate_ticker(ticker)

        # Fetch fresh data from sources
        reddit_posts = await sentiment_service.get_reddit_sentiment(ticker, limit=50)
        gdelt_articles = await sentiment_service.get_gdelt_sentiment(ticker)

        # Calculate latest scores
        reddit_score = sum(p.sentiment_score for p in reddit_posts) / len(reddit_posts) \
                      if len(reddit_posts) > 0 else 0.0
        gdelt_score = sum(a.tone for a in gdelt_articles) / len(gdelt_articles) \
                     if len(gdelt_articles) > 0 else 0.0

        # Push to FusionService to maintain history and get metrics
        alpha = sentiment_service.settings.SENTIMENT_ALPHA
        fusion_data = fusion_service.add_sentiment_data(
            ticker,
            datetime.now(timezone.utc),
            reddit_score,
            gdelt_score,
            alpha
        )

        # Get advanced metrics (regime, volatility, trend)
        regime_data = fusion_service.get_sentiment_regime(ticker)
        spikes = fusion_service.detect_sentiment_spikes(ticker)

        return SentimentSummary(
            ticker=ticker,
            current_fusion_score=fusion_data.fusion_sentiment,
            reddit_score=reddit_score,
            gdelt_score=gdelt_score,
            reddit_posts=len(reddit_posts),
            gdelt_articles=len(gdelt_articles),
            regime=regime_data['regime'],
            volatility=regime_data['volatility'],
            trend=regime_data['trend'],
            recent_spikes=spikes,
            last_updated=fusion_data.timestamp
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating sentiment summary for {ticker}: {e}")
        raise handle_api_error(e, ticker, "generating sentiment summary")
