"""
Sentiviz Backend - FastAPI Main Application
Real-Time Options & Sentiment Dashboard
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import options, sentiment, fusion
from app.utils.config import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting Sentiviz backend...")
    # Initialize services, connections, etc.
    yield
    logger.info("Shutting down Sentiviz backend...")
    # Cleanup


app = FastAPI(
    title="Sentiviz API",
    description="Real-Time Options & Sentiment Analysis Dashboard",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(options.router, prefix="/api/options", tags=["options"])
app.include_router(sentiment.router, prefix="/api/sentiment", tags=["sentiment"])
app.include_router(fusion.router, prefix="/api/fusion", tags=["fusion"])


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "service": "Sentiviz API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "options": "operational",
            "sentiment": "operational",
            "fusion": "operational"
        }
    }
