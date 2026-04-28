"""
StockTwits Service - Fetch real-time sentiment from StockTwits
"""

import requests
from datetime import datetime, timezone
from typing import List, Dict, Optional
import logging

from app.db.repository import save_sentiment_snapshot
from app.models.sentiment import StockTwitsPost, SentimentSignal
from app.services.finbert_service import FinBERTService

logger = logging.getLogger(__name__)

STOCKTWITS_API_BASE = "https://api.stocktwits.com/api/2"


class StockTwitsService:
    """Service for fetching sentiment data from StockTwits"""

    def __init__(self, finbert=None):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': 'https://stocktwits.com/',
            'Origin': 'https://stocktwits.com',
        })
        self._finbert = finbert if finbert is not None else FinBERTService()

    async def get_sentiment(self, ticker: str, limit: int = 30) -> SentimentSignal:
        """
        Fetch StockTwits posts and compute sentiment signal

        Args:
            ticker: Stock ticker symbol
            limit: Maximum posts to analyze (API returns up to 30)

        Returns:
            SentimentSignal with overall signal and bull/bear posts
        """
        try:
            url = f"{STOCKTWITS_API_BASE}/streams/symbol/{ticker.upper()}.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()

            data = response.json()

            if 'messages' not in data:
                logger.warning(f"No messages found for {ticker}")
                return self._empty_signal(ticker)

            # Parse messages
            all_posts = [self._parse_message(msg, ticker) for msg in data['messages'][:limit]]

            # FinBERT fallback: classify any posts with no StockTwits tag
            untagged_indices = [i for i, p in enumerate(all_posts) if p.sentiment is None]
            if untagged_indices:
                texts = [all_posts[i].body for i in untagged_indices]
                labels = self._finbert.classify_texts(texts)
                for i, label in zip(untagged_indices, labels):
                    all_posts[i].sentiment = label

            # Categorise
            bullish_posts = [p for p in all_posts if p.sentiment == 'Bullish']
            bearish_posts = [p for p in all_posts if p.sentiment == 'Bearish']
            neutral_posts = [p for p in all_posts if p.sentiment not in ('Bullish', 'Bearish')]

            # Calculate sentiment score
            # Bullish = +1, Bearish = -1, Neutral = 0
            total_scored = len(bullish_posts) + len(bearish_posts)
            if total_scored > 0:
                score = (len(bullish_posts) - len(bearish_posts)) / total_scored
            else:
                score = 0.0

            # Determine signal
            if score > 0.2:
                signal = "bullish"
            elif score < -0.2:
                signal = "bearish"
            else:
                signal = "neutral"

            # Get symbol info
            symbol_info = data.get('symbol', {})

            signal_payload = SentimentSignal(
                ticker=ticker.upper(),
                signal=signal,
                score=round(score, 3),
                bullish_count=len(bullish_posts),
                bearish_count=len(bearish_posts),
                neutral_count=len(neutral_posts),
                total_posts=len(all_posts),
                bullish_posts=bullish_posts,
                bearish_posts=bearish_posts,
                company_name=symbol_info.get('title', ticker.upper()),
                logo_url=symbol_info.get('logo_url'),
                fetched_at=datetime.now(timezone.utc)
            )
            try:
                save_sentiment_snapshot(signal_payload)
            except Exception as e:
                logger.warning(f"Failed to persist sentiment snapshot for {ticker}: {e}")
            return signal_payload

        except requests.exceptions.RequestException as e:
            logger.error(f"Error fetching StockTwits data for {ticker}: {e}")
            return self._empty_signal(ticker, error=str(e))
        except Exception as e:
            logger.error(f"Unexpected error processing StockTwits data for {ticker}: {e}")
            return self._empty_signal(ticker, error=str(e))

    def _parse_message(self, msg: Dict, ticker: str) -> StockTwitsPost:
        """Parse a StockTwits message into a StockTwitsPost"""

        # Extract sentiment
        entities = msg.get('entities', {})
        sentiment_data = entities.get('sentiment')
        sentiment = sentiment_data.get('basic') if sentiment_data else None

        # Parse timestamp
        created_str = msg.get('created_at', '')
        try:
            created_at = datetime.fromisoformat(created_str.replace('Z', '+00:00'))
        except:
            created_at = datetime.now(timezone.utc)

        # Get user info
        user = msg.get('user', {})

        return StockTwitsPost(
            id=msg.get('id'),
            body=msg.get('body', ''),
            sentiment=sentiment,
            created_at=created_at,
            username=user.get('username', 'Anonymous'),
            followers=user.get('followers', 0),
            avatar_url=user.get('avatar_url_ssl')
        )

    def get_trending_tickers(self, limit: int = 10) -> List[str]:
        """Fetch the most discussed tickers on StockTwits right now."""
        try:
            url = f"{STOCKTWITS_API_BASE}/trending/symbols.json"
            response = self.session.get(url, timeout=8)
            response.raise_for_status()
            symbols = response.json().get("symbols", [])
            return [s["symbol"] for s in symbols[:limit] if s.get("symbol")]
        except Exception as e:
            logger.warning(f"Failed to fetch trending tickers: {e}")
            return []

    def _empty_signal(self, ticker: str, error: Optional[str] = None) -> SentimentSignal:
        """Return an empty signal when no data available"""
        return SentimentSignal(
            ticker=ticker.upper(),
            signal="neutral",
            score=0.0,
            bullish_count=0,
            bearish_count=0,
            neutral_count=0,
            total_posts=0,
            bullish_posts=[],
            bearish_posts=[],
            company_name=ticker.upper(),
            logo_url=None,
            fetched_at=datetime.now(timezone.utc),
            error=error
        )
