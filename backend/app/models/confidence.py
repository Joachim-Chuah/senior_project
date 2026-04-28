"""
Pydantic models for the Confidence Calculator
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ConfidenceRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10)
    horizon: int = Field(default=1, ge=1, le=14)
    sent_score: Optional[float] = None
    total_posts: Optional[int] = None


class TopDriver(BaseModel):
    label: str
    direction: str  # "bullish" | "bearish"
    weight: float


class FeatureSnapshot(BaseModel):
    sent_score: Optional[float] = None
    sent_volume: Optional[float] = None
    sent_dispersion: Optional[float] = None
    sent_change: Optional[float] = None
    recent_return_5d: Optional[float] = None
    realized_vol_20d: Optional[float] = None
    market_regime: Optional[float] = None
    iv_atm: Optional[float] = None
    implied_move_pct: Optional[float] = None
    vrp_proxy: Optional[float] = None


class ConfidenceResult(BaseModel):
    ticker: str
    horizon: int
    direction: str          # "up" | "down"
    confidence: float       # 0–100
    expected_move_pct: Optional[float] = None
    top_drivers: List[TopDriver] = []
    features: FeatureSnapshot
    model_mode: str         # "warming_up" | "fitted"
    brier_score: Optional[float] = None
    company_name: str
    fetched_at: datetime
