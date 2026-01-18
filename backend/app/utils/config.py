"""
Configuration management for Sentiviz
"""

from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """Application settings"""

    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # Database
    DATABASE_URL: str = "sqlite:///./sentiviz.db"

    # Redis Cache (optional)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_ENABLED: bool = False

    # Reddit API
    REDDIT_CLIENT_ID: str = ""
    REDDIT_CLIENT_SECRET: str = ""
    REDDIT_USER_AGENT: str = "Sentiviz/1.0"

    # Refresh Intervals (seconds)
    GDELT_REFRESH_INTERVAL: int = 900  # 15 minutes
    REDDIT_REFRESH_INTERVAL: int = 60  # 1 minute
    OPTIONS_REFRESH_INTERVAL: int = 300  # 5 minutes

    # Sentiment Analysis
    SENTIMENT_ALPHA: float = 0.5  # Weight for GDELT vs Reddit fusion
    SENTIMENT_EMA_SPAN: int = 20  # EMA span for rolling sentiment

    # Black-Scholes Defaults
    RISK_FREE_RATE: float = 0.045  # 4.5% default risk-free rate

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
