"""
Sector rotation API
GET /api/sectors          — all sector summaries ranked by YTD
GET /api/sectors/{id}     — sector detail with individual stocks + AI narrative
"""

from fastapi import APIRouter, HTTPException
import logging

from app.models.sector import SectorSummary, SectorDetail
from app.services.fmp_service import FMPService
from app.services.sector_service import SectorService
from app.utils.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

settings = get_settings()
_fmp = FMPService(api_key=settings.FMP_API_KEY)
_sector_service = SectorService(fmp_service=_fmp, settings=settings)


@router.get("", response_model=list[SectorSummary])
async def get_sectors():
    """All sector summaries ranked by YTD return."""
    import asyncio
    loop = asyncio.get_event_loop()
    try:
        summaries = await loop.run_in_executor(None, _sector_service.get_all_summaries)
        return summaries
    except Exception as e:
        logger.error(f"Failed to fetch sector summaries: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sector data")


@router.get("/{sector_id}", response_model=SectorDetail)
async def get_sector_detail(sector_id: str):
    """Sector detail: individual stocks, winners/losers, AI narrative, news articles."""
    import asyncio
    loop = asyncio.get_event_loop()
    try:
        detail = await loop.run_in_executor(None, _sector_service.get_detail, sector_id)
        if detail is None:
            raise HTTPException(status_code=404, detail=f"Sector '{sector_id}' not found")
        return detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch sector detail for {sector_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sector detail")
