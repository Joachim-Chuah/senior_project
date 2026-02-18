"""
Confidence API Router
POST /api/confidence/analyze
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.confidence import ConfidenceRequest, ConfidenceResult
from app.services.confidence_service import ConfidenceService
from app.services.stocktwits_service import StockTwitsService
from app.services.fmp_service import FMPService
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()

# Service singletons (module-level so state is preserved across requests)
_stocktwits = StockTwitsService()
_fmp = FMPService(api_key=settings.FMP_API_KEY)
_confidence = ConfidenceService(stocktwits=_stocktwits, fmp=_fmp)


@router.post("/analyze", response_model=ConfidenceResult)
async def analyze_confidence(request: ConfidenceRequest) -> ConfidenceResult:
    """
    Compute a directional confidence signal for a ticker + horizon.

    - **ticker**: stock ticker symbol (e.g. "AAPL")
    - **horizon**: forward-looking days (1, 3, 5, or 14)
    """
    ticker = request.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker symbol is required")

    try:
        result = await _confidence.analyze(ticker, request.horizon)
        return result
    except Exception as e:
        logger.error(f"Confidence analysis failed for {ticker}/{request.horizon}d: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
