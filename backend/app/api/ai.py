"""
API routes for AI-powered analysis
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import logging

from app.services.groq_service import GroqService
from app.services.stocktwits_service import StockTwitsService
from app.utils.validation import validate_ticker
from app.utils.errors import handle_api_error

logger = logging.getLogger(__name__)
router = APIRouter()

groq_service = GroqService()
stocktwits_service = StockTwitsService()


class ChatMessage(BaseModel):
    """Chat message model"""
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str = Field(..., min_length=1, max_length=1000)
    ticker: Optional[str] = None
    history: Optional[List[ChatMessage]] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Chat response model"""
    response: str
    ticker: Optional[str] = None


class AnalysisResponse(BaseModel):
    """Auto-analysis response model"""
    ticker: str
    analysis: str
    signal: str
    score: float


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with the AI about sentiment analysis

    Args:
        request: Chat request with message, optional ticker, and history
    """
    try:
        signal = None

        # If ticker provided, fetch current sentiment for context
        if request.ticker:
            ticker = validate_ticker(request.ticker)
            signal = await stocktwits_service.get_sentiment(ticker)

        # Convert history to dict format
        history = [{"role": m.role, "content": m.content} for m in request.history] if request.history else None

        # Get AI response
        response = await groq_service.chat(
            message=request.message,
            signal=signal,
            conversation_history=history
        )

        return ChatResponse(
            response=response,
            ticker=request.ticker
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in AI chat: {e}")
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/analyze/{ticker}", response_model=AnalysisResponse)
async def analyze_ticker(ticker: str):
    """
    Get an AI-generated analysis of current sentiment for a ticker

    Args:
        ticker: Stock ticker symbol
    """
    try:
        ticker = validate_ticker(ticker)

        # Fetch current sentiment
        signal = await stocktwits_service.get_sentiment(ticker)

        if signal.error:
            raise HTTPException(status_code=502, detail=f"Could not fetch sentiment: {signal.error}")

        # Generate analysis
        analysis = await groq_service.analyze_sentiment(signal)

        return AnalysisResponse(
            ticker=ticker,
            analysis=analysis,
            signal=signal.signal,
            score=signal.score
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing {ticker}: {e}")
        raise handle_api_error(e, ticker, "generating AI analysis")
