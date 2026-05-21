from typing import List
import httpx
from fastapi import APIRouter, HTTPException, Query
from src.core.config import settings
from src.schemas.schemas import SearchResult
from src.services.news_service import get_market_feed_async

router = APIRouter()

@router.get("/market-feed")
async def market_feed():
    return await get_market_feed_async()

@router.get("/search", response_model=List[SearchResult])
async def search_symbol(query: str = Query(...)):
    if not settings.TWELVEDATA_API_KEY:
        raise HTTPException(status_code=500, detail="Price API key not configured")
    
    q = query.strip()
    if not q: return []
    
    url = "https://api.twelvedata.com/symbol_search"
    params = {"symbol": q, "apikey": settings.TWELVEDATA_API_KEY}
    
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()
        items = data.get("data") or []
        results = []
        for item in items:
            sym = item.get("symbol")
            name = item.get("instrument_name") or item.get("name") or ""
            if not sym or not name: continue
            results.append(SearchResult(symbol=sym, name=name, exchange=item.get("exchange"), type=item.get("instrument_type")))
        return results[:10]
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Search service unavailable")
