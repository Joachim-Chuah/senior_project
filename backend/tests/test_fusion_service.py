"""
Tests for Fusion Service
"""

import pytest
from datetime import datetime
from app.services.fusion_service import FusionService


class TestFusionService:
    """Test sentiment fusion service"""

    def setup_method(self):
        """Setup test fixtures"""
        self.fusion = FusionService(ema_span=10)

    def test_add_sentiment_data(self):
        """Test adding sentiment data"""
        data = self.fusion.add_sentiment_data(
            ticker="AAPL",
            timestamp=datetime.utcnow(),
            reddit_score=0.5,
            gdelt_score=0.3,
            alpha=0.5
        )

        assert data.ticker == "AAPL"
        assert data.reddit_sentiment == 0.5
        assert data.gdelt_sentiment == 0.3
        # Fusion should be weighted average
        assert data.fusion_sentiment == 0.4

    def test_fusion_score_calculation(self):
        """Test fusion score with different alpha values"""
        # Alpha = 1 means 100% GDELT
        data1 = self.fusion.add_sentiment_data(
            "TEST1", datetime.utcnow(), 0.5, 0.8, alpha=1.0
        )
        assert data1.fusion_sentiment == 0.8

        # Alpha = 0 means 100% Reddit
        data2 = self.fusion.add_sentiment_data(
            "TEST2", datetime.utcnow(), 0.5, 0.8, alpha=0.0
        )
        assert data2.fusion_sentiment == 0.5

    def test_sentiment_regime_detection(self):
        """Test sentiment regime detection"""
        ticker = "TSLA"

        # Add bullish sentiment data
        for i in range(20):
            self.fusion.add_sentiment_data(
                ticker, datetime.utcnow(), 0.7, 0.6, alpha=0.5
            )

        regime = self.fusion.get_sentiment_regime(ticker)

        assert regime["regime"] == "bullish"
        assert regime["mean_sentiment"] > 0.3

    def test_bearish_regime(self):
        """Test bearish regime detection"""
        ticker = "BEAR"

        # Add bearish sentiment data
        for i in range(20):
            self.fusion.add_sentiment_data(
                ticker, datetime.utcnow(), -0.7, -0.6, alpha=0.5
            )

        regime = self.fusion.get_sentiment_regime(ticker)

        assert regime["regime"] == "bearish"
        assert regime["mean_sentiment"] < -0.3

    def test_spike_detection(self):
        """Test sentiment spike detection"""
        ticker = "SPIKE"

        # Add normal data
        for i in range(15):
            self.fusion.add_sentiment_data(
                ticker, datetime.utcnow(), 0.1, 0.1, alpha=0.5
            )

        # Add spike
        self.fusion.add_sentiment_data(
            ticker, datetime.utcnow(), 0.9, 0.9, alpha=0.5
        )

        # Add more normal data
        for i in range(5):
            self.fusion.add_sentiment_data(
                ticker, datetime.utcnow(), 0.1, 0.1, alpha=0.5
            )

        spikes = self.fusion.detect_sentiment_spikes(ticker, z_threshold=2.0)

        # Should detect at least one spike
        assert len(spikes) > 0

    def test_timeseries_retrieval(self):
        """Test getting sentiment timeseries"""
        ticker = "TIME"

        # Add data points
        for i in range(50):
            self.fusion.add_sentiment_data(
                ticker, datetime.utcnow(), 0.1 * i / 50, 0.2 * i / 50, alpha=0.5
            )

        timeseries = self.fusion.get_sentiment_timeseries(ticker, limit=20)

        assert len(timeseries) == 20
        assert "timestamp" in timeseries[0]
        assert "fusion_sentiment" in timeseries[0]
