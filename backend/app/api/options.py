"""
API routes for options data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.services.options_service import OptionsService
from app.services.black_scholes import BlackScholesCalculator
from app.models.options import OptionChain, ScenarioAnalysis

logger = logging.getLogger(__name__)
router = APIRouter()

options_service = OptionsService()
bs_calculator = BlackScholesCalculator()


@router.get("/chain/{ticker}", response_model=OptionChain)
async def get_option_chain(
    ticker: str,
    expiration: Optional[str] = None
):
    """
    Get option chain for a ticker

    Args:
        ticker: Stock ticker symbol
        expiration: Optional specific expiration date
    """
    try:
        chain = await options_service.get_option_chain(ticker, expiration)
        return chain
    except Exception as e:
        logger.error(f"Error fetching option chain: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/volatility/{ticker}")
async def get_historical_volatility(
    ticker: str,
    period: str = Query("1mo", regex="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$")
):
    """
    Get historical volatility for a ticker

    Args:
        ticker: Stock ticker symbol
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
    """
    try:
        volatility = await options_service.get_historical_volatility(ticker, period)
        return {
            "ticker": ticker,
            "period": period,
            "historical_volatility": volatility
        }
    except Exception as e:
        logger.error(f"Error calculating volatility: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenario", response_model=ScenarioAnalysis)
async def run_scenario_analysis(
    ticker: str,
    strike: float,
    expiration: str,
    option_type: str,
    spot_price: float,
    volatility: float,
    price_change: float = 0,
    volatility_change: float = 0,
    time_change: float = 0,
    sentiment_score: Optional[float] = None
):
    """
    Run scenario analysis on an option

    Args:
        ticker: Stock ticker
        strike: Strike price
        expiration: Expiration date
        option_type: "call" or "put"
        spot_price: Current stock price
        volatility: Current volatility
        price_change: Change in stock price (ΔS)
        volatility_change: Change in volatility (Δσ)
        time_change: Change in time (Δt in days)
        sentiment_score: Optional sentiment score to adjust volatility
    """
    try:
        # Calculate time to expiry
        from datetime import datetime
        exp_date = datetime.strptime(expiration, "%Y-%m-%d")
        now = datetime.now()
        days_to_expiry = (exp_date - now).days
        time_to_expiry = max((days_to_expiry + time_change) / 365.0, 0.001)

        # Adjust for sentiment if provided
        adjusted_volatility = volatility + volatility_change
        if sentiment_score is not None:
            adjusted_volatility = bs_calculator.adjust_for_sentiment(
                adjusted_volatility,
                sentiment_score
            )

        # Calculate base values
        base_price = bs_calculator.calculate_price(
            spot_price, strike, time_to_expiry, volatility, option_type
        )
        base_greeks = bs_calculator.calculate_greeks(
            spot_price, strike, time_to_expiry, volatility, option_type
        )

        # Calculate adjusted values
        adjusted_spot = spot_price + price_change
        adjusted_price = bs_calculator.calculate_price(
            adjusted_spot, strike, time_to_expiry, adjusted_volatility, option_type
        )
        adjusted_greeks = bs_calculator.calculate_greeks(
            adjusted_spot, strike, time_to_expiry, adjusted_volatility, option_type
        )

        return ScenarioAnalysis(
            ticker=ticker,
            strike=strike,
            option_type=option_type,
            base_price=base_price,
            base_greeks=base_greeks,
            price_change=price_change,
            volatility_change=volatility_change,
            time_change=time_change,
            adjusted_price=adjusted_price,
            adjusted_greeks=adjusted_greeks,
            sentiment_adjustment=sentiment_score
        )

    except Exception as e:
        logger.error(f"Error in scenario analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))
