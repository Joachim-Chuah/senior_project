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

    # Refresh Intervals (seconds)
    OPTIONS_REFRESH_INTERVAL: int = 300  # 5 minutes

    # Black-Scholes Defaults
    RISK_FREE_RATE: float = 0.045  # 4.5% default risk-free rate

    # Groq AI
    GROQ_API_KEY: str = ""

    # Tavily Web Search
    TAVILY_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
