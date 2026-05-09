"""
Configuration management for Rylo
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
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@localhost:5432/rylo"
    DB_ECHO: bool = False

    # Redis Cache (optional)
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_ENABLED: bool = False

    # Refresh Intervals (seconds)
    OPTIONS_REFRESH_INTERVAL: int = 300  # 5 minutes

    # Black-Scholes Defaults
    RISK_FREE_RATE: float = 0.045  # 4.5% default risk-free rate

    # Groq AI
    GROQ_API_KEY: str = ""

    # Tavily Web Search
    TAVILY_API_KEY: str = ""

    # Financial Modeling Prep
    FMP_API_KEY: str = ""

    # Finnhub
    FINNHUB_API_KEY: str = ""

    # Demo mode — swaps FMP for realistic mock data (no API key needed)
    DEMO_MODE: bool = False

    # Production frontend URL (e.g. https://your-app.vercel.app) — appended to CORS origins
    FRONTEND_URL: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
