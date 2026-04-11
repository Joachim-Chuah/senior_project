"""
Demo Mode API Router
GET /api/demo/options/{ticker}?days=5

Generates a realistic options chain using real Black-Scholes math.
Underlying prices and IV are hardcoded mock values — no external API calls.
"""

import math
from datetime import date, timedelta
from fastapi import APIRouter, HTTPException

router = APIRouter()

# ─── Mock market data ──────────────────────────────────────────────────────────

_SPOT = {
    "AAPL":  224.80,
    "MSFT":  418.30,
    "NVDA":  876.40,
    "META":  618.20,
    "GOOGL": 175.60,
    "AMZN":  205.40,
    "TSLA":  248.70,
}

_IV = {
    "AAPL":  0.30,
    "MSFT":  0.28,
    "NVDA":  0.55,
    "META":  0.40,
    "GOOGL": 0.32,
    "AMZN":  0.38,
    "TSLA":  0.65,
}

# Strike step sizes by stock price range
def _strike_step(spot: float) -> float:
    if spot >= 500:
        return 10.0
    if spot >= 200:
        return 5.0
    return 2.5


RISK_FREE_RATE = 0.045  # 4.5%


# ─── Black-Scholes ─────────────────────────────────────────────────────────────

def _norm_cdf(x: float) -> float:
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0


def _norm_pdf(x: float) -> float:
    return math.exp(-0.5 * x * x) / math.sqrt(2.0 * math.pi)


def _bs(S: float, K: float, T: float, r: float, sigma: float) -> dict:
    """Return call/put prices and Greeks for given inputs."""
    if T <= 0:
        intrinsic_call = max(S - K, 0.0)
        intrinsic_put  = max(K - S, 0.0)
        return {
            "call_price": round(intrinsic_call, 2),
            "put_price":  round(intrinsic_put, 2),
            "call_delta": 1.0 if S > K else (0.5 if S == K else 0.0),
            "put_delta":  -1.0 if S < K else (-0.5 if S == K else 0.0),
            "gamma": 0.0, "theta_call": 0.0, "theta_put": 0.0, "vega": 0.0,
        }

    d1 = (math.log(S / K) + (r + 0.5 * sigma ** 2) * T) / (sigma * math.sqrt(T))
    d2 = d1 - sigma * math.sqrt(T)

    call_price = S * _norm_cdf(d1) - K * math.exp(-r * T) * _norm_cdf(d2)
    put_price  = K * math.exp(-r * T) * _norm_cdf(-d2) - S * _norm_cdf(-d1)

    call_delta = _norm_cdf(d1)
    put_delta  = call_delta - 1.0

    gamma = _norm_pdf(d1) / (S * sigma * math.sqrt(T))
    vega  = S * _norm_pdf(d1) * math.sqrt(T) / 100.0  # per 1% change in vol

    theta_call = (
        -(S * _norm_pdf(d1) * sigma) / (2.0 * math.sqrt(T))
        - r * K * math.exp(-r * T) * _norm_cdf(d2)
    ) / 365.0
    theta_put = (
        -(S * _norm_pdf(d1) * sigma) / (2.0 * math.sqrt(T))
        + r * K * math.exp(-r * T) * _norm_cdf(-d2)
    ) / 365.0

    return {
        "call_price": round(max(call_price, 0.01), 2),
        "put_price":  round(max(put_price,  0.01), 2),
        "call_delta": round(call_delta,  4),
        "put_delta":  round(put_delta,   4),
        "gamma":      round(gamma,       6),
        "theta_call": round(theta_call,  4),
        "theta_put":  round(theta_put,   4),
        "vega":       round(vega,        4),
    }


# ─── Endpoint ─────────────────────────────────────────────────────────────────

MAG7 = list(_SPOT.keys())

@router.get("/options/{ticker}")
async def get_demo_options(
    ticker: str,
    days: int = 5,
):
    """
    Return a mock options chain for a Mag-7 ticker.
    `days` is the number of calendar days until expiration (1, 5, 14, 30, 60).
    """
    symbol = ticker.upper()
    if symbol not in _SPOT:
        raise HTTPException(
            status_code=404,
            detail=f"{symbol} is not available in demo mode. Choose from: {', '.join(MAG7)}",
        )

    S     = _SPOT[symbol]
    sigma = _IV[symbol]
    T     = days / 365.0
    step  = _strike_step(S)

    # Generate 8 strikes below ATM and 8 above, plus ATM
    atm = round(S / step) * step
    strikes = [round(atm + i * step, 2) for i in range(-8, 9)]

    chain = []
    for K in strikes:
        greeks = _bs(S, K, T, RISK_FREE_RATE, sigma)
        moneyness = "ATM" if abs(S - K) < step * 0.5 else ("ITM" if S > K else "OTM")
        chain.append({
            "strike":      K,
            "moneyness":   moneyness,
            **greeks,
        })

    return {
        "ticker":     symbol,
        "spot":       S,
        "iv":         sigma,
        "days":       days,
        "risk_free":  RISK_FREE_RATE,
        "chain":      chain,
    }


@router.get("/live-price/{ticker}")
async def get_live_price(
    ticker: str,
    strike: float,
    days: int = 14,
):
    """
    Fetch the real market mid-price for the closest available option
    using yfinance. Returns both call and put for the nearest expiry to `days`.
    """
    import yfinance as yf

    symbol = ticker.upper()
    t = yf.Ticker(symbol)

    try:
        exps = t.options
    except Exception:
        raise HTTPException(503, detail="Could not fetch options data from market")

    if not exps:
        raise HTTPException(404, detail=f"No options data available for {symbol}")

    # Find expiry date closest to `days` from today
    target = date.today() + timedelta(days=days)
    exp = min(exps, key=lambda e: abs((date.fromisoformat(e) - target).days))
    days_found = (date.fromisoformat(exp) - date.today()).days

    try:
        chain = t.option_chain(exp)
    except Exception:
        raise HTTPException(503, detail="Could not fetch options chain")

    def _mid(opts):
        if opts is None or opts.empty:
            return None, None, None
        idx = (opts["strike"] - strike).abs().idxmin()
        row = opts.loc[idx]
        bid = float(row.get("bid") or 0)
        ask = float(row.get("ask") or 0)
        price = round((bid + ask) / 2, 2) if bid > 0 and ask > 0 else round(float(row.get("lastPrice") or 0), 2)
        iv    = round(float(row.get("impliedVolatility") or 0) * 100, 1)
        k     = float(row["strike"])
        return price, k, iv

    call_price, call_k, call_iv = _mid(chain.calls)
    put_price,  put_k,  put_iv  = _mid(chain.puts)

    return {
        "ticker":           symbol,
        "strike_requested": round(strike, 2),
        "expiry":           exp,
        "days_to_expiry":   days_found,
        "call": {"market_price": call_price, "strike_found": call_k, "implied_vol": call_iv},
        "put":  {"market_price": put_price,  "strike_found": put_k,  "implied_vol": put_iv},
    }
