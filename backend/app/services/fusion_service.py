"""
Fusion Service - Combine sentiment sources and detect spikes
"""

import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
from datetime import datetime
import logging

from app.models.sentiment import SentimentData, SentimentSpike

logger = logging.getLogger(__name__)


class FusionService:
    """Service for fusing sentiment sources and detecting anomalies"""

    def __init__(self, ema_span: int = 20):
        self.ema_span = ema_span
        self.sentiment_history: Dict[str, List[SentimentData]] = {}

    def add_sentiment_data(
        self,
        ticker: str,
        timestamp: datetime,
        reddit_score: float,
        gdelt_score: float,
        alpha: float = 0.5
    ) -> SentimentData:
        """
        Add new sentiment data point and calculate fusion score

        Args:
            ticker: Stock ticker
            timestamp: Time of measurement
            reddit_score: Reddit sentiment [-1, 1]
            gdelt_score: GDELT sentiment [-1, 1]
            alpha: Weight for GDELT (1-alpha for Reddit)

        Returns:
            SentimentData object with fusion score
        """
        fusion_score = alpha * gdelt_score + (1 - alpha) * reddit_score

        data = SentimentData(
            ticker=ticker,
            timestamp=timestamp,
            reddit_sentiment=reddit_score,
            gdelt_sentiment=gdelt_score,
            fusion_sentiment=fusion_score
        )

        # Store in history
        if ticker not in self.sentiment_history:
            self.sentiment_history[ticker] = []

        self.sentiment_history[ticker].append(data)

        # Keep only last 1000 data points
        if len(self.sentiment_history[ticker]) > 1000:
            self.sentiment_history[ticker] = self.sentiment_history[ticker][-1000:]

        return data

    def calculate_ema(self, ticker: str) -> pd.Series:
        """
        Calculate exponential moving average of fusion sentiment

        Args:
            ticker: Stock ticker

        Returns:
            Pandas Series of EMA values
        """
        if ticker not in self.sentiment_history:
            return pd.Series([])

        scores = [d.fusion_sentiment for d in self.sentiment_history[ticker]]
        df = pd.DataFrame({'sentiment': scores})

        ema = df['sentiment'].ewm(span=self.ema_span, adjust=False).mean()

        return ema

    def detect_sentiment_spikes(
        self,
        ticker: str,
        z_threshold: float = 2.0
    ) -> List[SentimentSpike]:
        """
        Detect sentiment spikes using Z-score method

        Args:
            ticker: Stock ticker
            z_threshold: Z-score threshold for spike detection

        Returns:
            List of detected sentiment spikes
        """
        if ticker not in self.sentiment_history or \
           len(self.sentiment_history[ticker]) < 10:
            return []

        # Get fusion scores
        data = self.sentiment_history[ticker]
        scores = np.array([d.fusion_sentiment for d in data])
        timestamps = [d.timestamp for d in data]

        # Calculate rolling statistics
        window_size = min(20, len(scores) // 2)
        rolling_mean = pd.Series(scores).rolling(window=window_size, center=True).mean()
        rolling_std = pd.Series(scores).rolling(window=window_size, center=True).std()

        # Calculate Z-scores
        z_scores = (scores - rolling_mean) / (rolling_std + 1e-8)

        # Detect spikes
        spikes = []
        for i, z in enumerate(z_scores):
            if abs(z) > z_threshold:
                spike = SentimentSpike(
                    ticker=ticker,
                    timestamp=timestamps[i],
                    sentiment_value=scores[i],
                    z_score=z,
                    spike_type="positive" if z > 0 else "negative"
                )
                spikes.append(spike)

        logger.info(f"Detected {len(spikes)} sentiment spikes for {ticker}")
        return spikes

    def get_sentiment_regime(
        self,
        ticker: str,
        lookback_periods: int = 20
    ) -> Dict[str, float]:
        """
        Determine current sentiment regime

        Args:
            ticker: Stock ticker
            lookback_periods: Number of periods to look back

        Returns:
            Dictionary with regime metrics
        """
        if ticker not in self.sentiment_history:
            return {
                'regime': 'neutral',
                'mean_sentiment': 0.0,
                'volatility': 0.0,
                'trend': 0.0
            }

        recent_data = self.sentiment_history[ticker][-lookback_periods:]
        scores = [d.fusion_sentiment for d in recent_data]

        mean_sentiment = np.mean(scores)
        volatility = np.std(scores)

        # Calculate trend (simple linear regression slope)
        if len(scores) > 1:
            x = np.arange(len(scores))
            trend = np.polyfit(x, scores, 1)[0]
        else:
            trend = 0.0

        # Determine regime
        if mean_sentiment > 0.3:
            regime = 'bullish'
        elif mean_sentiment < -0.3:
            regime = 'bearish'
        else:
            regime = 'neutral'

        return {
            'regime': regime,
            'mean_sentiment': float(mean_sentiment),
            'volatility': float(volatility),
            'trend': float(trend)
        }

    def get_sentiment_timeseries(
        self,
        ticker: str,
        limit: int = 100
    ) -> List[Dict]:
        """
        Get recent sentiment timeseries data

        Args:
            ticker: Stock ticker
            limit: Maximum number of points to return

        Returns:
            List of sentiment data points
        """
        if ticker not in self.sentiment_history:
            return []

        recent = self.sentiment_history[ticker][-limit:]

        return [
            {
                'timestamp': d.timestamp.isoformat(),
                'reddit_sentiment': d.reddit_sentiment,
                'gdelt_sentiment': d.gdelt_sentiment,
                'fusion_sentiment': d.fusion_sentiment
            }
            for d in recent
        ]
