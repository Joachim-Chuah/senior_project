"""
API routes for options data
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.services.options_service import OptionsService
from app.services.black_scholes import BlackScholesCalculator
from app.models.options import OptionChain, ScenarioAnalysis
from app.utils.validation import validate_ticker, validate_positive_number
from app.utils.errors import handle_api_error, TickerNotFoundError

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
        # Validate and normalize ticker
        ticker = validate_ticker(ticker)

        chain = await options_service.get_option_chain(ticker, expiration)
        return chain
    except HTTPException:
        raise
    except ValueError as e:
        # Handle case where no options are available
        if "No options available" in str(e):
            raise HTTPException(
                status_code=404,
                detail=f"No options data available for {ticker}"
            )
        raise handle_api_error(e, ticker, "fetching option chain")
    except Exception as e:
        logger.error(f"Error fetching option chain for {ticker}: {e}")
        raise handle_api_error(e, ticker, "fetching option chain")


@router.get("/volatility/{ticker}")
async def get_historical_volatility(
    ticker: str,
    period: str = Query("1mo", pattern="^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$")
):
    """
    Get historical volatility for a ticker

    Args:
        ticker: Stock ticker symbol
        period: Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
    """
    try:
        # Validate and normalize ticker
        ticker = validate_ticker(ticker)

        volatility = await options_service.get_historical_volatility(ticker, period)
        return {
            "ticker": ticker,
            "period": period,
            "historical_volatility": volatility
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating volatility for {ticker}: {e}")
        raise handle_api_error(e, ticker, "calculating historical volatility")


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
        # Validate inputs
        ticker = validate_ticker(ticker)
        validate_positive_number(strike, "Strike price")
        validate_positive_number(spot_price, "Spot price")
        validate_positive_number(volatility, "Volatility")

        if option_type.lower() not in ["call", "put"]:
            raise HTTPException(
                status_code=400,
                detail="option_type must be 'call' or 'put'"
            )

        # Calculate time to expiry
        from datetime import datetime
        try:
            exp_date = datetime.strptime(expiration, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="expiration must be in YYYY-MM-DD format"
            )

        now = datetime.now()
        days_to_expiry = (exp_date - now).days

        if days_to_expiry < 0:
            raise HTTPException(
                status_code=400,
                detail="Expiration date must be in the future"
            )

        time_to_expiry = max((days_to_expiry + time_change) / 365.0, 0.001)

        # Adjust for sentiment if provided
        adjusted_volatility = volatility + volatility_change
        if sentiment_score is not None:
            if not -1.0 <= sentiment_score <= 1.0:
                raise HTTPException(
                    status_code=400,
                    detail="sentiment_score must be between -1.0 and 1.0"
                )
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

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in scenario analysis for {ticker}: {e}")
        raise handle_api_error(e, ticker, "running scenario analysis")
