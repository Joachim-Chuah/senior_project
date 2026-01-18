"""
Pydantic models for options data
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class OptionContract(BaseModel):
    """Individual option contract"""
    ticker: str
    strike: float
    expiration: str
    option_type: str  # "call" or "put"
    last_price: float
    bid: float
    ask: float
    volume: int
    open_interest: int
    implied_volatility: float

    # Greeks
    delta: float
    gamma: float
    theta: float
    vega: float
    rho: float


class OptionChain(BaseModel):
    """Complete option chain for a ticker"""
    ticker: str
    current_price: float
    expiration_date: str
    calls: List[OptionContract]
    puts: List[OptionContract]
    available_expirations: List[str]
    fetched_at: datetime = Field(default_factory=datetime.utcnow)


class ScenarioAnalysis(BaseModel):
    """Scenario analysis results"""
    ticker: str
    strike: float
    option_type: str
    base_price: float
    base_greeks: dict

    # Scenario adjustments
    price_change: float = 0  # ΔS
    volatility_change: float = 0  # Δσ
    time_change: float = 0  # Δt (days)

    # Adjusted values
    adjusted_price: float
    adjusted_greeks: dict

    sentiment_adjustment: Optional[float] = None
