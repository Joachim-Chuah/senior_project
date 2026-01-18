"""
Black-Scholes Model Implementation
Calculate option prices and Greeks
"""

import numpy as np
from scipy.stats import norm
from typing import Dict
import logging

logger = logging.getLogger(__name__)


class BlackScholesCalculator:
    """Black-Scholes option pricing and Greeks calculator"""

    def __init__(self, risk_free_rate: float = 0.045):
        self.risk_free_rate = risk_free_rate

    def calculate_price(
        self,
        spot_price: float,
        strike: float,
        time_to_expiry: float,
        volatility: float,
        option_type: str = "call"
    ) -> float:
        """
        Calculate option price using Black-Scholes formula

        Args:
            spot_price: Current stock price
            strike: Strike price
            time_to_expiry: Time to expiration in years
            volatility: Implied volatility
            option_type: "call" or "put"

        Returns:
            Option price
        """
        d1 = self._d1(spot_price, strike, time_to_expiry, volatility)
        d2 = self._d2(d1, volatility, time_to_expiry)

        if option_type.lower() == "call":
            price = (spot_price * norm.cdf(d1) -
                    strike * np.exp(-self.risk_free_rate * time_to_expiry) * norm.cdf(d2))
        else:  # put
            price = (strike * np.exp(-self.risk_free_rate * time_to_expiry) * norm.cdf(-d2) -
                    spot_price * norm.cdf(-d1))

        return price

    def calculate_greeks(
        self,
        spot_price: float,
        strike: float,
        time_to_expiry: float,
        volatility: float,
        option_type: str = "call"
    ) -> Dict[str, float]:
        """
        Calculate all Greeks for an option

        Returns:
            Dictionary with delta, gamma, theta, vega, rho
        """
        d1 = self._d1(spot_price, strike, time_to_expiry, volatility)
        d2 = self._d2(d1, volatility, time_to_expiry)

        # Delta
        if option_type.lower() == "call":
            delta = norm.cdf(d1)
        else:
            delta = norm.cdf(d1) - 1

        # Gamma (same for calls and puts)
        gamma = norm.pdf(d1) / (spot_price * volatility * np.sqrt(time_to_expiry))

        # Theta
        if option_type.lower() == "call":
            theta = (
                -(spot_price * norm.pdf(d1) * volatility) / (2 * np.sqrt(time_to_expiry))
                - self.risk_free_rate * strike * np.exp(-self.risk_free_rate * time_to_expiry) * norm.cdf(d2)
            ) / 365  # Convert to daily theta
        else:
            theta = (
                -(spot_price * norm.pdf(d1) * volatility) / (2 * np.sqrt(time_to_expiry))
                + self.risk_free_rate * strike * np.exp(-self.risk_free_rate * time_to_expiry) * norm.cdf(-d2)
            ) / 365  # Convert to daily theta

        # Vega (same for calls and puts)
        vega = spot_price * norm.pdf(d1) * np.sqrt(time_to_expiry) / 100  # Per 1% change

        # Rho
        if option_type.lower() == "call":
            rho = strike * time_to_expiry * np.exp(-self.risk_free_rate * time_to_expiry) * norm.cdf(d2) / 100
        else:
            rho = -strike * time_to_expiry * np.exp(-self.risk_free_rate * time_to_expiry) * norm.cdf(-d2) / 100

        return {
            'delta': delta,
            'gamma': gamma,
            'theta': theta,
            'vega': vega,
            'rho': rho
        }

    def adjust_for_sentiment(
        self,
        base_volatility: float,
        sentiment_score: float,
        adjustment_factor: float = 0.1
    ) -> float:
        """
        Adjust volatility based on sentiment regime

        Args:
            base_volatility: Historical/implied volatility
            sentiment_score: Sentiment score [-1, 1]
            adjustment_factor: How much sentiment impacts volatility

        Returns:
            Adjusted volatility
        """
        # Negative sentiment increases volatility, positive decreases it
        adjustment = 1 + (adjustment_factor * abs(sentiment_score))

        if sentiment_score < 0:
            # Negative sentiment increases volatility
            return base_volatility * adjustment
        else:
            # Positive sentiment slightly decreases volatility
            return base_volatility / adjustment

    def _d1(
        self,
        spot_price: float,
        strike: float,
        time_to_expiry: float,
        volatility: float
    ) -> float:
        """Calculate d1 term"""
        return (
            (np.log(spot_price / strike) +
             (self.risk_free_rate + 0.5 * volatility ** 2) * time_to_expiry)
            / (volatility * np.sqrt(time_to_expiry))
        )

    def _d2(self, d1: float, volatility: float, time_to_expiry: float) -> float:
        """Calculate d2 term"""
        return d1 - volatility * np.sqrt(time_to_expiry)
