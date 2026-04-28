"""
StockTwits proxy — used in local dev (Vite forwards /api/stocktwits here).
In production this route is shadowed by the Vercel serverless function at
frontend/api/stocktwits.js, so Render never handles these requests.
"""

import httpx
from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

_STOCKTWITS_BASE = "https://api.stocktwits.com/api/2"
_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Referer": "https://stocktwits.com/",
    "Origin": "https://stocktwits.com",
}


@router.get("")
async def stocktwits_proxy(
    ticker: str = Query(default=None),
    endpoint: str = Query(default=None),
):
    if endpoint == "trending":
        url = f"{_STOCKTWITS_BASE}/trending/symbols.json"
    elif ticker:
        url = f"{_STOCKTWITS_BASE}/streams/symbol/{ticker.upper()}.json"
    else:
        raise HTTPException(status_code=400, detail="Missing ticker or endpoint param")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(url, headers=_HEADERS, timeout=10)
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail="StockTwits request failed")
        except Exception:
            raise HTTPException(status_code=502, detail="StockTwits proxy failed")
