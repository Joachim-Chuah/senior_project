"""
Tests for Black-Scholes Calculator
"""

import pytest
from app.services.black_scholes import BlackScholesCalculator


class TestBlackScholesCalculator:
    """Test Black-Scholes calculations"""

    def setup_method(self):
        """Setup test fixtures"""
        self.calc = BlackScholesCalculator(risk_free_rate=0.05)

    def test_call_option_price(self):
        """Test call option pricing"""
        price = self.calc.calculate_price(
            spot_price=100,
            strike=100,
            time_to_expiry=1.0,
            volatility=0.2,
            option_type="call"
        )
        assert price > 0
        assert isinstance(price, float)

    def test_put_option_price(self):
        """Test put option pricing"""
        price = self.calc.calculate_price(
            spot_price=100,
            strike=100,
            time_to_expiry=1.0,
            volatility=0.2,
            option_type="put"
        )
        assert price > 0
        assert isinstance(price, float)

    def test_greeks_calculation(self):
        """Test Greeks calculation"""
        greeks = self.calc.calculate_greeks(
            spot_price=100,
            strike=100,
            time_to_expiry=1.0,
            volatility=0.2,
            option_type="call"
        )

        assert "delta" in greeks
        assert "gamma" in greeks
        assert "theta" in greeks
        assert "vega" in greeks
        assert "rho" in greeks

        # Delta should be between 0 and 1 for calls
        assert 0 <= greeks["delta"] <= 1
        # Gamma should be positive
        assert greeks["gamma"] > 0

    def test_put_call_parity(self):
        """Test put-call parity relationship"""
        spot = 100
        strike = 100
        time = 1.0
        vol = 0.2

        call_price = self.calc.calculate_price(spot, strike, time, vol, "call")
        put_price = self.calc.calculate_price(spot, strike, time, vol, "put")

        # Call - Put = S - K*e^(-rT)
        import numpy as np
        expected_diff = spot - strike * np.exp(-self.calc.risk_free_rate * time)
        actual_diff = call_price - put_price

        assert abs(actual_diff - expected_diff) < 0.01

    def test_sentiment_adjustment(self):
        """Test volatility adjustment for sentiment"""
        base_vol = 0.2

        # Negative sentiment should increase volatility
        neg_vol = self.calc.adjust_for_sentiment(base_vol, -0.5, 0.1)
        assert neg_vol > base_vol

        # Positive sentiment should decrease volatility
        pos_vol = self.calc.adjust_for_sentiment(base_vol, 0.5, 0.1)
        assert pos_vol < base_vol
