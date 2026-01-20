"""
Sentiviz Backend - FastAPI Main Application
Real-Time Options & Sentiment Dashboard
"""

from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import options, sentiment, fusion, ai
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
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

# Health Router to match frontend /api/health
health_router = APIRouter()

@health_router.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "options": "operational",
            "sentiment": "operational",
            "fusion": "operational",
            "ai": "operational"
        }
    }

@health_router.get("/")
async def root():
    """Root health check"""
    return {
        "status": "online",
        "service": "Sentiviz API",
        "version": "1.0.0"
    }

app.include_router(health_router, prefix="/api", tags=["health"])

# Legacy root for backward compatibility
@app.get("/")
async def legacy_root():
    return {"status": "online"}
