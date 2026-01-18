"""
Sentiment Service - Fetch and analyze sentiment from Reddit and GDELT
"""

import praw
import requests
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
import logging
import hashlib

from app.models.sentiment import SentimentData, RedditPost, GDELTArticle
from app.utils.config import get_settings

logger = logging.getLogger(__name__)


class SentimentService:
    """Service for fetching and analyzing sentiment data"""

    def __init__(self):
        self.settings = get_settings()
        self.vader = SentimentIntensityAnalyzer()
        self._init_reddit()
        self.gdelt_cache: Dict[str, List[GDELTArticle]] = {}

    def _init_reddit(self):
        """Initialize Reddit API client"""
        try:
            self.reddit = praw.Reddit(
                client_id=self.settings.REDDIT_CLIENT_ID,
                client_secret=self.settings.REDDIT_CLIENT_SECRET,
                user_agent=self.settings.REDDIT_USER_AGENT
            )
            logger.info("Reddit API initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Reddit API: {e}")
            self.reddit = None

    async def get_reddit_sentiment(
        self,
        ticker: str,
        subreddits: List[str] = ["wallstreetbets", "stocks", "investing"],
        limit: int = 100
    ) -> List[RedditPost]:
        """
        Fetch and analyze Reddit posts mentioning the ticker

        Args:
            ticker: Stock ticker symbol
            subreddits: List of subreddits to search
            limit: Maximum number of posts to fetch

        Returns:
            List of analyzed Reddit posts
        """
        if not self.reddit:
            logger.warning("Reddit API not initialized")
            return []

        posts = []

        try:
            for subreddit_name in subreddits:
                subreddit = self.reddit.subreddit(subreddit_name)

                # Search for ticker mentions
                for submission in subreddit.search(ticker, limit=limit, time_filter="day"):
                    # Check if ticker is actually mentioned
                    if ticker.upper() not in submission.title.upper() and \
                       ticker.upper() not in submission.selftext.upper():
                        continue

                    # Combine title and text for sentiment analysis
                    text = f"{submission.title} {submission.selftext}"
                    sentiment_scores = self.vader.polarity_scores(text)

                    # Hash author ID for privacy
                    author_hash = hashlib.sha256(
                        str(submission.author).encode()
                    ).hexdigest()[:16]

                    post = RedditPost(
                        ticker=ticker,
                        post_id=submission.id,
                        author_hash=author_hash,
                        title=submission.title,
                        text=submission.selftext[:500],  # Limit text length
                        subreddit=subreddit_name,
                        score=submission.score,
                        num_comments=submission.num_comments,
                        created_utc=datetime.fromtimestamp(submission.created_utc),
                        sentiment_score=sentiment_scores['compound'],
                        sentiment_positive=sentiment_scores['pos'],
                        sentiment_negative=sentiment_scores['neg'],
                        sentiment_neutral=sentiment_scores['neu']
                    )
                    posts.append(post)

            logger.info(f"Fetched {len(posts)} Reddit posts for {ticker}")
            return posts

        except Exception as e:
            logger.error(f"Error fetching Reddit sentiment for {ticker}: {e}")
            return []

    async def get_gdelt_sentiment(
        self,
        ticker: str,
        keywords: Optional[List[str]] = None
    ) -> List[GDELTArticle]:
        """
        Fetch and filter GDELT news articles for ticker

        Args:
            ticker: Stock ticker symbol
            keywords: Additional keywords to filter (e.g., company name)

        Returns:
            List of filtered GDELT articles
        """
        try:
            # Build GDELT query
            # GDELT API: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/

            if keywords is None:
                keywords = [ticker]

            # Get articles from last 15 minutes
            now = datetime.utcnow()
            start_time = now - timedelta(minutes=15)

            # Format: YYYYMMDDHHMMSS
            timespan = start_time.strftime("%Y%m%d%H%M%S")

            query = " OR ".join(keywords)
            url = (
                f"https://api.gdeltproject.org/api/v2/doc/doc"
                f"?query={query}"
                f"&mode=artlist"
                f"&maxrecords=250"
                f"&format=json"
                f"&startdatetime={timespan}"
            )

            response = requests.get(url, timeout=30)
            response.raise_for_status()

            data = response.json()
            articles = []

            if 'articles' in data:
                for article in data['articles']:
                    # Filter by keywords in title or URL
                    title = article.get('title', '').upper()
                    url_str = article.get('url', '').upper()

                    if not any(kw.upper() in title or kw.upper() in url_str
                              for kw in keywords):
                        continue

                    # Extract and normalize tone
                    tone = article.get('tone', 0)
                    normalized_tone = self._normalize_gdelt_tone(tone)

                    gdelt_article = GDELTArticle(
                        ticker=ticker,
                        title=article.get('title', ''),
                        url=article.get('url', ''),
                        source=article.get('domain', ''),
                        published_date=article.get('seendate', ''),
                        tone=normalized_tone,
                        language=article.get('language', 'en')
                    )
                    articles.append(gdelt_article)

            logger.info(f"Fetched {len(articles)} GDELT articles for {ticker}")
            return articles

        except Exception as e:
            logger.error(f"Error fetching GDELT sentiment for {ticker}: {e}")
            return []

    def _normalize_gdelt_tone(self, tone: float) -> float:
        """
        Normalize GDELT tone to [-1, 1] range
        GDELT tone typically ranges from -10 to +10
        """
        return max(-1.0, min(1.0, tone / 10.0))

    def calculate_aggregate_sentiment(
        self,
        reddit_posts: List[RedditPost],
        gdelt_articles: List[GDELTArticle]
    ) -> float:
        """
        Calculate aggregate sentiment score

        Returns:
            Aggregate sentiment in [-1, 1] range
        """
        if not reddit_posts and not gdelt_articles:
            return 0.0

        # Calculate average Reddit sentiment
        reddit_sentiment = 0.0
        if reddit_posts:
            reddit_sentiment = sum(p.sentiment_score for p in reddit_posts) / len(reddit_posts)

        # Calculate average GDELT sentiment
        gdelt_sentiment = 0.0
        if gdelt_articles:
            gdelt_sentiment = sum(a.tone for a in gdelt_articles) / len(gdelt_articles)

        # Weighted fusion
        alpha = self.settings.SENTIMENT_ALPHA
        fusion_score = alpha * gdelt_sentiment + (1 - alpha) * reddit_sentiment

        return fusion_score
