"""
Options Service - Fetch and process options chain data using yfinance
"""

import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional
import logging

from app.models.options import OptionChain, OptionContract
from app.services.black_scholes import BlackScholesCalculator

logger = logging.getLogger(__name__)


class OptionsService:
    """Service for fetching and processing options data"""

    def __init__(self):
        self.cache: Dict[str, Dict] = {}
        self.bs_calculator = BlackScholesCalculator()

    async def get_option_chain(
        self,
        ticker: str,
        expiration_date: Optional[str] = None
    ) -> OptionChain:
        """
        Fetch option chain for a ticker

        Args:
            ticker: Stock ticker symbol
            expiration_date: Optional specific expiration date

        Returns:
            OptionChain object with calls and puts
        """
        try:
            stock = yf.Ticker(ticker)

            # Get expiration dates
            expirations = stock.options
            if not expirations:
                raise ValueError(f"No options available for {ticker}")

            # Use specified date or nearest expiration
            exp_date = expiration_date if expiration_date else expirations[0]

            # Fetch option chain
            opt_chain = stock.option_chain(exp_date)

            # Get current stock price
            current_price = stock.history(period="1d")['Close'].iloc[-1]

            # Process calls and puts
            calls = self._process_options(
                opt_chain.calls,
                ticker,
                current_price,
                exp_date,
                option_type="call"
            )

            puts = self._process_options(
                opt_chain.puts,
                ticker,
                current_price,
                exp_date,
                option_type="put"
            )

            return OptionChain(
                ticker=ticker,
                current_price=current_price,
                expiration_date=exp_date,
                calls=calls,
                puts=puts,
                available_expirations=list(expirations)
            )

        except Exception as e:
            logger.error(f"Error fetching option chain for {ticker}: {e}")
            raise

    def _process_options(
        self,
        options_df: pd.DataFrame,
        ticker: str,
        spot_price: float,
        expiration: str,
        option_type: str
    ) -> List[OptionContract]:
        """Process raw options data and calculate Greeks"""
        processed = []

        for _, row in options_df.iterrows():
            try:
                strike = row['strike']

                # Calculate Greeks using Black-Scholes
                greeks = self.bs_calculator.calculate_greeks(
                    spot_price=spot_price,
                    strike=strike,
                    time_to_expiry=self._calculate_time_to_expiry(expiration),
                    volatility=row.get('impliedVolatility', 0.3),
                    option_type=option_type
                )

                contract = OptionContract(
                    ticker=ticker,
                    strike=strike,
                    expiration=expiration,
                    option_type=option_type,
                    last_price=row.get('lastPrice', 0),
                    bid=row.get('bid', 0),
                    ask=row.get('ask', 0),
                    volume=row.get('volume', 0),
                    open_interest=row.get('openInterest', 0),
                    implied_volatility=row.get('impliedVolatility', 0),
                    delta=greeks['delta'],
                    gamma=greeks['gamma'],
                    theta=greeks['theta'],
                    vega=greeks['vega'],
                    rho=greeks['rho']
                )
                processed.append(contract)

            except Exception as e:
                logger.warning(f"Error processing option row: {e}")
                continue

        return processed

    def _calculate_time_to_expiry(self, expiration: str) -> float:
        """Calculate time to expiry in years"""
        exp_date = datetime.strptime(expiration, "%Y-%m-%d")
        now = datetime.now()
        days_to_expiry = (exp_date - now).days
        return max(days_to_expiry / 365.0, 0.001)  # Minimum 0.001 years

    async def get_historical_volatility(
        self,
        ticker: str,
        period: str = "1mo"
    ) -> float:
        """Calculate historical volatility from OHLC data"""
        try:
            stock = yf.Ticker(ticker)
            hist = stock.history(period=period)

            # Calculate log returns
            log_returns = pd.Series(hist['Close']).pct_change().apply(lambda x: np.log(1 + x))

            # Annualized volatility
            volatility = log_returns.std() * (252 ** 0.5)

            return volatility

        except Exception as e:
            logger.error(f"Error calculating volatility for {ticker}: {e}")
            return 0.3  # Default volatility
