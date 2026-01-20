"""
Sentiment Service - Fetch and analyze sentiment from Reddit and GDELT
"""

import praw
import requests
import pandas as pd
from datetime import datetime, timedelta, timezone
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
                        created_utc=datetime.fromtimestamp(submission.created_utc, tz=timezone.utc),
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
            now = datetime.now(timezone.utc)
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

    async def get_sentiment_explanation(
        self,
        ticker: str,
        reddit_posts: List[RedditPost],
        gdelt_articles: List[GDELTArticle]
    ) -> "SentimentExplanation":
        """
        Generate a detailed explanation for the current sentiment
        """
        from app.models.sentiment import SentimentExplanation, RedditExplanation, GDELTExplanation
        
        # 1. Process Reddit
        reddit_score = 0.0
        reddit_expl = None
        if reddit_posts:
            reddit_score = sum(p.sentiment_score for p in reddit_posts) / len(reddit_posts)
            
            # Count distribution
            pos = sum(1 for p in reddit_posts if p.sentiment_score > 0.05)
            neg = sum(1 for p in reddit_posts if p.sentiment_score < -0.05)
            neu = len(reddit_posts) - pos - neg
            
            # Get top keywords (simple word count)
            # In a real app, use NLP. For now, we'll extract tickers or words from titles
            words = []
            for p in reddit_posts:
                words.extend(p.title.lower().split())
            
            # Filter common words (stop words)
            stop_words = {'the', 'a', 'to', 'is', 'in', 'and', 'for', 'of', 'on', 'with', 'at', 'this', 'that', ticker.lower()}
            word_counts = {}
            for w in words:
                if w.isalpha() and len(w) > 3 and w not in stop_words:
                    word_counts[w] = word_counts.get(w, 0) + 1
            
            top_keywords = sorted(word_counts.items(), key=lambda x: x[1], reverse=True)[:5]
            
            # Top posts
            top_posts = [
                {"title": p.title, "score": p.score, "sentiment": p.sentiment_score}
                for p in sorted(reddit_posts, key=lambda x: abs(x.sentiment_score), reverse=True)[:3]
            ]
            
            reddit_expl = RedditExplanation(
                total_posts=len(reddit_posts),
                positive_count=pos,
                negative_count=neg,
                neutral_count=neu,
                top_keywords=[k for k, v in top_keywords],
                top_posts=top_posts,
                subreddits=list(set(p.subreddit for p in reddit_posts)),
                average_score=reddit_score,
                confidence=min(1.0, len(reddit_posts) / 20.0)
            )

        # 2. Process GDELT
        gdelt_score = 0.0
        gdelt_expl = None
        if gdelt_articles:
            gdelt_score = sum(a.tone for a in gdelt_articles) / len(gdelt_articles)
            
            pos = sum(1 for a in gdelt_articles if a.tone > 0.1)
            neg = sum(1 for a in gdelt_articles if a.tone < -0.1)
            neu = len(gdelt_articles) - pos - neg
            
            gdelt_expl = GDELTExplanation(
                total_articles=len(gdelt_articles),
                positive_count=pos,
                negative_count=neg,
                neutral_count=neu,
                top_themes=[], # GDELT themes could be added if available in API
                top_sources=list(set(a.source for a in gdelt_articles))[:5],
                articles=gdelt_articles[:5], # Include top 5 articles
                average_tone=gdelt_score,
                confidence=min(1.0, len(gdelt_articles) / 10.0)
            )

        # 3. Fusion logic
        alpha = self.settings.SENTIMENT_ALPHA
        fusion_score = alpha * gdelt_score + (1 - alpha) * reddit_score
        
        # Determine regime and reasoning
        if fusion_score > 0.3:
            regime = "bullish"
            regime_reasoning = f"Strong positive sentiment detected across {'both' if reddit_expl and gdelt_expl else 'available'} sources."
        elif fusion_score < -0.3:
            regime = "bearish"
            regime_reasoning = f"Significant negative sentiment detected across {'both' if reddit_expl and gdelt_expl else 'available'} sources."
        else:
            regime = "neutral"
            regime_reasoning = "Sentiment is currently mixed or low volume, suggesting a stable or indecisive market mood."

        # Key factors summary
        key_factors = []
        if reddit_expl and reddit_expl.positive_count > reddit_expl.negative_count * 2:
            key_factors.append(f"Strong Reddit bullishness ({reddit_expl.positive_count} pos vs {reddit_expl.negative_count} neg)")
        if gdelt_expl and gdelt_expl.negative_count > gdelt_expl.positive_count * 2:
            key_factors.append(f"Prevalent negative news coverage ({gdelt_expl.negative_count} neg articles)")
        
        if not key_factors:
            key_factors.append("Balanced sentiment from available sources")

        return SentimentExplanation(
            ticker=ticker,
            reddit_score=reddit_score,
            gdelt_score=gdelt_score,
            fusion_score=fusion_score,
            reddit_weight=1 - alpha,
            gdelt_weight=alpha,
            regime=regime,
            regime_reasoning=regime_reasoning,
            reddit_explanation=reddit_expl,
            gdelt_explanation=gdelt_expl,
            key_factors=key_factors
        )

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
