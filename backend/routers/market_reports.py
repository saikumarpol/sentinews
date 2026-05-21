# backend/routers/market_reports.py
# Pre-Market Briefing & Post-Market Digest endpoints.
# Aggregates: nsepython (live NSE) → yfinance → news_scraper.
# FIX: removed circular import of app module.

import asyncio
import logging
import math
import os
import re
import httpx
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

import yfinance as yf
from fastapi import APIRouter

logger = logging.getLogger("sentinews.reports")
router = APIRouter(prefix="/reports", tags=["market-reports"])

# --- TTL Caching ---
__report_cache: Dict[str, Dict] = {}

def _get_cached_report(key: str, ttl_seconds: int):
    global __report_cache
    now = datetime.utcnow()
    entry = __report_cache.get(key)
    if entry and entry["expires_at"] > now:
        return entry["data"]
    return None

def _set_cached_report(key: str, data: Any, ttl_seconds: int):
    global __report_cache
    __report_cache[key] = {
        "data": data,
        "expires_at": datetime.utcnow() + timedelta(seconds=ttl_seconds),
    }


# Note: yfinance session removed as it was causing 401s.
# We let yfinance handle its own session/cookies.


def _safe(val) -> Optional[float]:
    try:
        f = float(val)
        return None if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return None


def _yf_quote(symbol: str) -> Dict:
    """Reliable yfinance quote using history (works after hours too)."""
    try:
        t = yf.Ticker(symbol)
        # Try fast_info first
        fi = t.fast_info
        price = _safe(getattr(fi, "last_price", None))
        prev  = _safe(getattr(fi, "previous_close", None))

        # yfinance fast_info can be None after hours — use history as fallback
        if price is None or prev is None:
            h = t.history(period="5d", interval="1d")
            if not h.empty:
                price = price or _safe(h["Close"].iloc[-1])
                prev  = prev  or (_safe(h["Close"].iloc[-2]) if len(h) > 1 else price)

        change_pct = _safe((price - prev) / prev * 100) if price and prev else None
        return {
            "last_price": price,
            "prev_close": prev,
            "change":     _safe(price - prev) if price and prev else None,
            "change_pct": change_pct,
        }
    except Exception as exc:
        logger.debug("yf_quote failed for %s: %s", symbol, exc)
        return {"last_price": None, "prev_close": None, "change": None, "change_pct": None}

def _td_quote(yf_symbol: str) -> Optional[Dict]:
    """Third fallback using TwelveData API for the major indices to ensure reliability."""
    td_key = os.getenv("TWELVEDATA_API_KEY")
    if not td_key:
        return None
        
    td_sym = None
    if yf_symbol == "^NSEI": td_sym = "NIFTY:NSE"
    elif yf_symbol == "^BSESN": td_sym = "SENSEX:BSE"
    elif yf_symbol == "^NSEBANK": td_sym = "BANKNIFTY:NSE"
    elif yf_symbol == "^GSPC" or yf_symbol == "ES=F": td_sym = "SPX"
    elif yf_symbol == "^IXIC" or yf_symbol == "NQ=F": td_sym = "IXIC"
    elif yf_symbol == "^DJI": td_sym = "DJI"
    elif yf_symbol == "^INDIAVIX": td_sym = "VIX:NSE"
    elif yf_symbol == "USDINR=X": td_sym = "USD/INR"
        
    if not td_sym:
        return None
        
    try:
        resp = httpx.get("https://api.twelvedata.com/quote", params={"symbol": td_sym, "apikey": td_key}, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if "close" in data:
                price = _safe(data.get("close"))
                prev  = _safe(data.get("previous_close"))
                if price:
                    return {
                        "last_price": price,
                        "prev_close": prev,
                        "change": _safe(data.get("change")),
                        "change_pct": _safe(data.get("percent_change"))
                    }
    except Exception:
        pass
    return None

REPORT_INDICES = [
    ("NIFTY 50",         "^NSEI",     "indian"),
    ("SENSEX",           "^BSESN",    "indian"),
    ("NIFTY BANK",       "^NSEBANK",  "indian"),
    ("INDIA VIX",        "^INDIAVIX", "indian"),
    ("S&P 500",          "^GSPC",     "global"),
    ("S&P 500 Futures",  "ES=F",      "global"),
    ("NASDAQ",           "^IXIC",     "global"),
    ("NASDAQ Futures",   "NQ=F",      "global"),
    ("Dow Jones",        "^DJI",      "global"),
    ("Hang Seng",        "^HSI",      "global"),
    ("Nikkei 225",       "^N225",     "global"),
    ("GIFT Nifty",       "GIFTY=F",   "global"),
    ("Crude Oil",        "CL=F",      "other"),
    ("Gold",             "GC=F",      "other"),
    ("USD/INR",          "USDINR=X",  "other"),
]

NSE_INDEX_MAP = {
    "NIFTY 50":   "NIFTY 50",
    "NIFTY BANK": "NIFTY BANK",
    "INDIA VIX":  "INDIA VIX",
}


async def _fetch_single_index(name, nse_sym, yf_sym, region):
    price = None
    source = "unavailable"
    q = {}

    if nse_sym:
        try:
            from nsepython import nse_quote_ltp
            ltp = await asyncio.to_thread(nse_quote_ltp, nse_sym, "LTP")
            val = _safe(ltp) if str(ltp) not in ("-", "", "None") else None
            if val:
                price = val
                source = "nsepython"
        except Exception:
            pass

    if not price:
        q = await asyncio.to_thread(_yf_quote, yf_sym)
        price = q.get("last_price")
        if price:
            source = "yfinance"

    if not price:
        q = await asyncio.to_thread(_td_quote, yf_sym) or {}
        price = q.get("last_price")
        if price:
            source = "twelvedata"

    # Specific Fallback for GIFT Nifty: If still empty, use NIFTY 50 as a proxy
    if not price and name == "GIFT Nifty":
        logger.info("GIFT Nifty empty. Attempting NIFTY 50 proxy...")
        try:
            from nsepython import nse_quote_ltp
            # Get Price and pChange
            ltp = await asyncio.to_thread(nse_quote_ltp, "NIFTY 50", "LTP")
            pch = await asyncio.to_thread(nse_quote_ltp, "NIFTY 50", "pChange")
            val = _safe(ltp)
            logger.info(f"NIFTY 50 proxy result: {val}")
            if val:
                price = val
                source = "nse-proxy"
                # Update q for return dict
                q["change_pct"] = _safe(pch)
        except Exception as e:
            logger.error(f"NIFTY 50 proxy fallback failed: {e}")
            pass

    return {
        "name":       name,
        "last_price": price,
        "change":     q.get("change"),
        "change_pct": q.get("change_pct"),
        "region":     region,
        "source":     source,
    }

async def _get_indices_async() -> List[Dict]:
    tasks = []
    for name, yf_sym, region in REPORT_INDICES:
        nse_sym = NSE_INDEX_MAP.get(name)
        tasks.append(_fetch_single_index(name, nse_sym, yf_sym, region))
    return await asyncio.gather(*tasks)


def _get_gainers_losers():
    gainers, losers = [], []
    try:
        from nsepython import nse_get_top_gainers, nse_get_top_losers

        def _df_rows(df, limit=8):
            rows = []
            for _, row in df.head(limit).iterrows():
                rows.append({
                    "symbol":     str(row.get("symbol", "")),
                    "last_price": _safe(row.get("lastPrice")),
                    "change_pct": _safe(row.get("pChange")),
                    "source":     "nsepython",
                })
            return rows

        gainers = _df_rows(nse_get_top_gainers())
        losers  = _df_rows(nse_get_top_losers())
    except Exception as exc:
        logger.warning("nsepython gainers/losers failed: %s", exc)
    return gainers, losers

async def _get_gainers_losers_async():
    return await asyncio.to_thread(_get_gainers_losers)


# Old unmaintained FII/DII scraper removed in favor of `fetch_fii_dii_live` from `app.py`.


def _get_news(limit=6):
    try:
        from news_scraper import get_market_feed
        feed = get_market_feed()
        return [
            {"headline": i.get("headline",""), "source": i.get("source",""),
             "url": i.get("url",""), "summary": i.get("summary","")}
            for i in feed.get("headline_news", [])[:limit]
        ]
    except Exception:
        return []


async def _get_stocks_in_news(date_str: str, limit=50):
    """Fetch specific company buzz for the reports."""
    try:
        from news_scraper import get_daily_stock_news
        news = await get_daily_stock_news(date_str)
        return news[:limit]
    except Exception:
        return []

def _get_commodities_snapshot():
    """Get all commodities data from the dashboard"""
    try:
        from commodities import fetch_market_dashboard
        dash = fetch_market_dashboard()
        return dash.get("commodities", [])
    except Exception as exc:
        logger.warning(f"Commodities fetch failed: {exc}")
        return []

def _get_currencies_snapshot():
    """Get all currencies data from the dashboard"""
    try:
        from commodities import fetch_market_dashboard
        dash = fetch_market_dashboard()
        return dash.get("currencies", [])
    except Exception as exc:
        logger.warning(f"Currencies fetch failed: {exc}")
        return []

def _get_adrs():
    """Get performance of Pre-Market Indian ADRs traded in the US"""
    adrs_symbols = [
        ("HDFC Bank", "HDB"),
        ("ICICI Bank", "IBN"),
        ("Infosys", "INFY"),
        ("Wipro", "WIT"),
        ("MakeMyTrip", "MMYT"),
        ("Dr Reddy's", "RDY")
    ]
    results = []
    for name, sym in adrs_symbols:
        q = _yf_quote(sym)
        if q.get("last_price"):
            results.append({
                "name": name,
                "symbol": sym,
                "last_price": q.get("last_price"),
                "change_pct": q.get("change_pct")
            })
    return results

def _get_events(limit=5):
    """Get key corporate events"""
    try:
        from nsepython import nse_events
        df = nse_events()
        if df is None or df.empty:
            return []
        records = []
        for _, row in df.head(limit).iterrows():
            records.append({
                "company": str(row.get("company", "")),
                "purpose": str(row.get("purpose", "")),
                "date": str(row.get("date", ""))
            })
        return records
    except Exception as exc:
        logger.warning(f"Events fetch failed: {exc}")
        return []

async def _get_events_async(limit=5):
    return await asyncio.to_thread(_get_events, limit)

def _get_categorized_news(limit=5):
    """Fetch and split news into geopolitical / Indian macros based on keywords"""
    try:
        from news_scraper import get_market_feed
        feed = get_market_feed()
        articles = feed.get("headline_news", [])
        
        geo_news = []
        in_news = []
        
        geo_keywords = ["global", "war", "us", "fed", "china", "europe", "oil", "geopolitical", "foreign", "biden", "trump"]
        in_keywords = ["india", "rbi", "sebi", "modi", "rupee", "domestic", "nirmala", "bjp", "congress", "indian"]
        
        for art in articles:
            text = (art.get("headline", "") + " " + art.get("summary", "")).lower()
            item = {"headline": art.get("headline", ""), "source": art.get("source", ""), "url": art.get("url", "")}
            
            if any(k in text for k in geo_keywords):
                geo_news.append(item)
            elif any(k in text for k in in_keywords):
                in_news.append(item)
            else:
                # Default to India news if uncategorized but looks like general market
                in_news.append(item)
                
        return geo_news[:limit], in_news[:limit]
        
    except Exception as exc:
        logger.warning(f"Categorized news fetch failed: {exc}")
        return [], []



def _build_summary(mode: str, indices: List[Dict]) -> str:
    nifty  = next((i for i in indices if i["name"] == "NIFTY 50"), None)
    sp500  = next((i for i in indices if i["name"] == "S&P 500"), None)
    crude  = next((i for i in indices if i["name"] == "Crude Oil"), None)
    lines = []
    if mode == "pre":
        if sp500 and sp500.get("change_pct") is not None:
            d = "gained" if sp500["change_pct"] > 0 else "fell"
            lines.append(f"Wall Street {d} {abs(sp500['change_pct']):.2f}% overnight.")
        if crude and crude.get("change_pct") is not None:
            d = "up" if crude["change_pct"] > 0 else "down"
            lines.append(f"Crude oil is {d} {abs(crude['change_pct']):.2f}%, watch energy stocks.")
        lines.append("Monitor FII/DII pre-open data and global cues for market direction today.")
    else:
        if nifty and nifty.get("change_pct") is not None:
            d = "ended higher" if nifty["change_pct"] > 0 else "closed lower"
            lines.append(f"NIFTY 50 {d} by {abs(nifty['change_pct']):.2f}% in today's session.")
        lines.append("FII/DII flows and global overnight cues will set tomorrow's direction.")
    return " ".join(lines)
    
def _generate_ai_outlook(summary: str, geo: List[Dict], domestic: List[Dict], indices: List[Dict]) -> str:
    """Generate a dynamic AI outlook string based on aggregated context"""
    try:
        from ai_processor import _score_sentiment
        
        # Build context
        context_text = summary + " "
        context_text += " ".join([n["headline"] for n in geo]) + " "
        context_text += " ".join([n["headline"] for n in domestic])
        
        # Get base sentiment
        sentiment = _score_sentiment(context_text)
        
        outlook = "Our AI analysis suggests a "
        if sentiment > 0.3:
            outlook += "**Strongly Bullish** market setup. "
        elif sentiment > 0.1:
            outlook += "**Cautiously Bullish** market setup. "
        elif sentiment < -0.3:
            outlook += "**Strongly Bearish** market setup. "
        elif sentiment < -0.1:
            outlook += "**Cautiously Bearish** market setup. "
        else:
            outlook += "**Neutral/Range-bound** market setup. "
            
        outlook += "Given the mix of global cues and domestic flows, traders should watch key index levels and sector-specific rotation based on the latest corporate buzz."
        return outlook
    except Exception:
        return "Our AI analysis suggests a Neutral/Range-bound market setup. Monitor global cues and FII flows closely."


# ── Sync wrappers (FastAPI sync endpoints) ────────────────────────────────

# Sync wrappers deprecated

@router.get("/pre-market", summary="Pre-market briefing")
async def get_pre_market_report():
    cached = _get_cached_report("pre", 180)  # 3 Min cache
    if cached: return cached

    from app import fetch_fii_dii_live
    
    date_str       = datetime.now().strftime("%Y-%m-%d")
    
    tasks = [
        _get_indices_async(),
        _get_gainers_losers_async(),
        fetch_fii_dii_live(),
        asyncio.to_thread(_get_news, 6),
        asyncio.to_thread(_get_categorized_news, 5),
        _get_events_async(limit=5),
        asyncio.to_thread(_get_commodities_snapshot),
        asyncio.to_thread(_get_currencies_snapshot),
        asyncio.to_thread(_get_adrs),
        _get_stocks_in_news(date_str, limit=50),
    ]
    
    # Run all I/O queries simultaneously
    indices, gl, fii_dii, news, categorized, events, commodities, currencies, adrs, stocks_in_news = await asyncio.gather(*tasks)
    
    gainers, losers = gl
    geo_news, in_news = categorized
    summary        = _build_summary("pre", indices)
    ai_outlook     = asyncio.to_thread(_generate_ai_outlook, summary, geo_news, in_news, indices) # Could be slow via score_sentiment so to_thread
    ai_outlook     = await ai_outlook
    
    res = {
        "mode":         "pre-market",
        "generated_at": datetime.now().isoformat(),
        "summary":      summary,
        "indices":      indices,
        "commodities":  commodities,
        "currencies":   currencies,
        "adrs":         adrs,
        "gainers":      gainers,
        "fii_dii":      fii_dii,
        "geopolitical_news": geo_news,
        "indian_news":  in_news,
        "stocks_in_news": stocks_in_news,
        "events":       events,
        "ai_outlook":   ai_outlook,
        "source":       "nsepython + yfinance + nse-scrape (Parallel Cached)",
    }
    _set_cached_report("pre", res, 180)
    return res


@router.get("/post-market", summary="Post-market digest")
async def get_post_market_report():
    cached = _get_cached_report("post", 180)
    if cached: return cached

    from app import fetch_fii_dii_live
    
    date_str       = datetime.now().strftime("%Y-%m-%d")
    
    tasks = [
        _get_indices_async(),
        _get_gainers_losers_async(),
        fetch_fii_dii_live(),
        asyncio.to_thread(_get_news, 6),
        asyncio.to_thread(_get_categorized_news, 5),
        _get_events_async(limit=5),
        asyncio.to_thread(_get_commodities_snapshot),
        asyncio.to_thread(_get_currencies_snapshot),
        _get_stocks_in_news(date_str, limit=50),
    ]
    
    indices, gl, fii_dii, news, categorized, events, commodities, currencies, stocks_in_news = await asyncio.gather(*tasks)
    
    gainers, losers = gl
    geo_news, in_news = categorized
    summary          = _build_summary("post", indices)
    ai_outlook       = await asyncio.to_thread(_generate_ai_outlook, summary, geo_news, in_news, indices)
    
    res = {
        "mode":         "post-market",
        "generated_at": datetime.now().isoformat(),
        "summary":      summary,
        "indices":      indices,
        "commodities":  commodities,
        "currencies":   currencies,
        "gainers":      gainers,
        "losers":       losers,
        "fii_dii":      fii_dii,
        "geopolitical_news": geo_news,
        "indian_news":  in_news,
        "stocks_in_news": stocks_in_news,
        "events":       events,
        "ai_outlook":   ai_outlook,
        "source":       "nsepython + yfinance + nse-scrape (Parallel Cached)",
    }
    _set_cached_report("post", res, 180)
    return res
