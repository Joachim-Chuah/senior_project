"""
Sector rotation service — computes YTD/1M returns via yfinance batch download,
derives phase/rotation labels, and generates AI narratives via Groq + Tavily.
"""

import logging
import statistics
import time
from datetime import datetime, date, timezone

import yfinance as yf
import pandas as pd

logger = logging.getLogger(__name__)

TICKER_NAMES: dict[str, str] = {
    "NVDA": "NVIDIA", "AMD": "AMD", "INTC": "Intel", "MU": "Micron", "ARM": "Arm Holdings",
    "MRVL": "Marvell", "AVGO": "Broadcom", "QCOM": "Qualcomm", "TXN": "Texas Instruments",
    "AMAT": "Applied Materials", "LRCX": "Lam Research", "KLAC": "KLA Corp",
    "ADI": "Analog Devices", "ASML": "ASML", "TSM": "TSMC",
    "AAPL": "Apple", "MSFT": "Microsoft", "GOOGL": "Alphabet", "META": "Meta",
    "AMZN": "Amazon", "ORCL": "Oracle", "CRM": "Salesforce", "ADBE": "Adobe", "CSCO": "Cisco",
    "DELL": "Dell", "HPE": "Hewlett Packard Enterprise",
    "CRWD": "CrowdStrike", "PANW": "Palo Alto Networks", "ZS": "Zscaler", "FTNT": "Fortinet",
    "OKTA": "Okta", "S": "SentinelOne", "CYBR": "CyberArk", "TENB": "Tenable",
    "NET": "Cloudflare", "CHKP": "Check Point",
    "XOM": "ExxonMobil", "CVX": "Chevron", "COP": "ConocoPhillips", "EOG": "EOG Resources",
    "SLB": "SLB", "MPC": "Marathon Petroleum", "PSX": "Phillips 66",
    "VLO": "Valero Energy", "HAL": "Halliburton", "OXY": "Occidental Petroleum",
    "JPM": "JPMorgan Chase", "BAC": "Bank of America", "GS": "Goldman Sachs",
    "MS": "Morgan Stanley", "WFC": "Wells Fargo", "BLK": "BlackRock",
    "SCHW": "Charles Schwab", "C": "Citigroup", "AXP": "American Express", "V": "Visa",
    "JNJ": "Johnson & Johnson", "UNH": "UnitedHealth", "PFE": "Pfizer", "ABBV": "AbbVie",
    "MRK": "Merck", "LLY": "Eli Lilly", "BMY": "Bristol-Myers Squibb",
    "CVS": "CVS Health", "TMO": "Thermo Fisher", "DHR": "Danaher",
    "MRNA": "Moderna", "BIIB": "Biogen", "REGN": "Regeneron", "VRTX": "Vertex",
    "GILD": "Gilead Sciences", "SGEN": "Seagen", "ALNY": "Alnylam",
    "BMRN": "BioMarin", "IONS": "Ionis", "FATE": "Fate Therapeutics",
    "CAT": "Caterpillar", "DE": "Deere & Co", "GE": "GE Aerospace", "HON": "Honeywell",
    "MMM": "3M", "UPS": "UPS", "FDX": "FedEx", "EMR": "Emerson Electric",
    "ETN": "Eaton", "ITW": "Illinois Tool Works",
    "LMT": "Lockheed Martin", "RTX": "RTX Corp", "NOC": "Northrop Grumman",
    "GD": "General Dynamics", "BA": "Boeing", "AXON": "Axon", "KTOS": "Kratos",
    "RKLB": "Rocket Lab", "HII": "HII", "L3H": "L3Harris",
    "ENPH": "Enphase Energy", "FSLR": "First Solar", "PLUG": "Plug Power",
    "SEDG": "SolarEdge", "RUN": "Sunrun", "NOVA": "Sunnova", "ARRY": "Array Technologies",
    "CSIQ": "Canadian Solar", "HASI": "HA Sustainable Infrastructure", "NEE": "NextEra Energy",
    "TSLA": "Tesla", "RIVN": "Rivian", "NIO": "NIO", "LCID": "Lucid Motors",
    "GM": "General Motors", "F": "Ford", "CHPT": "ChargePoint",
    "BLNK": "Blink Charging", "XPEV": "XPeng", "LI": "Li Auto",
    "HD": "Home Depot", "MCD": "McDonald's", "NKE": "Nike", "SBUX": "Starbucks",
    "LOW": "Lowe's", "TGT": "Target", "BKNG": "Booking Holdings", "CMG": "Chipotle",
    "AMT": "American Tower", "PLD": "Prologis", "CCI": "Crown Castle",
    "EQIX": "Equinix", "SPG": "Simon Property", "O": "Realty Income",
    "AVB": "AvalonBay", "EQR": "Equity Residential", "DLR": "Digital Realty", "PSA": "Public Storage",
    "LIN": "Linde", "APD": "Air Products", "SHW": "Sherwin-Williams",
    "FCX": "Freeport-McMoRan", "NEM": "Newmont", "NUE": "Nucor",
    "MOS": "Mosaic", "ALB": "Albemarle", "CF": "CF Industries", "VMC": "Vulcan Materials",
}

# Thematic baskets: id → (name, category, proxy_etf, tickers)
BASKETS: dict = {
    "semiconductors":    ("Semiconductors",        "Technology",  "SOXX", ["NVDA","AMD","INTC","MU","ARM","MRVL","AVGO","QCOM","TXN","AMAT","LRCX","KLAC","ADI","ASML","TSM"]),
    "big_tech":          ("Big Tech",               "Technology",  "XLK",  ["AAPL","MSFT","GOOGL","META","AMZN","NVDA","ORCL","CRM","ADBE","CSCO"]),
    "ai_infrastructure": ("AI Infrastructure",      "Technology",  "BOTZ", ["NVDA","AVGO","AMD","MSFT","GOOGL","META","AMZN","ORCL","DELL","HPE"]),
    "cybersecurity":     ("Cybersecurity",          "Technology",  "HACK", ["CRWD","PANW","ZS","FTNT","OKTA","S","CYBR","TENB","NET","CHKP"]),
    "energy":            ("Energy",                 "Energy",      "XLE",  ["XOM","CVX","COP","EOG","SLB","MPC","PSX","VLO","HAL","OXY"]),
    "financials":        ("Financials",             "Financial",   "XLF",  ["JPM","BAC","GS","MS","WFC","BLK","SCHW","C","AXP","V"]),
    "healthcare":        ("Healthcare",             "Healthcare",  "XLV",  ["JNJ","UNH","PFE","ABBV","MRK","LLY","BMY","CVS","TMO","DHR"]),
    "biotech":           ("Biotech & Pharma",       "Healthcare",  "XBI",  ["MRNA","BIIB","REGN","VRTX","GILD","SGEN","ALNY","BMRN","IONS","FATE"]),
    "industrials":       ("Industrials",            "Industrial",  "XLI",  ["CAT","DE","GE","HON","MMM","UPS","FDX","EMR","ETN","ITW"]),
    "defense":           ("Defense & Aerospace",    "Industrial",  "ITA",  ["LMT","RTX","NOC","GD","BA","AXON","KTOS","RKLB","HII","L3H"]),
    "clean_energy":      ("Clean Energy",           "Energy",      "ICLN", ["ENPH","FSLR","PLUG","SEDG","RUN","NOVA","ARRY","CSIQ","HASI","NEE"]),
    "ev":                ("Electric Vehicles",      "Consumer",    "DRIV", ["TSLA","RIVN","NIO","LCID","GM","F","CHPT","BLNK","XPEV","LI"]),
    "consumer":          ("Consumer & Retail",      "Consumer",    "XLY",  ["AMZN","TSLA","HD","MCD","NKE","SBUX","LOW","TGT","BKNG","CMG"]),
    "real_estate":       ("Real Estate",            "Real Estate", "XLRE", ["AMT","PLD","CCI","EQIX","SPG","O","AVB","EQR","DLR","PSA"]),
    "materials":         ("Materials & Commodities","Commodity",   "XLB",  ["LIN","APD","SHW","FCX","NEM","NUE","MOS","ALB","CF","VMC"]),
}


def _pct_change(series: pd.Series, lookback: int) -> float:
    if len(series) < lookback + 1:
        return 0.0
    start = series.iloc[-lookback - 1]
    end = series.iloc[-1]
    if start == 0 or pd.isna(start) or pd.isna(end):
        return 0.0
    return round((end - start) / start * 100, 2)


def _derive_phase(ytd: float, one_month: float, five_day: float) -> str:
    if ytd < -10:
        return "Bottoming" if five_day > 0 else "Fading"
    if ytd < 5 and one_month > 0:
        return "Early"
    if ytd < 20:
        return "Mature"
    monthly_pace = ytd / 4
    if one_month < monthly_pace * 0.4:
        return "Exhaustion"
    return "Mature"


def _derive_rotation(ytd: float, one_month: float, phase: str) -> str:
    if phase in ("Bottoming", "Fading") and one_month > 0:
        return "Reflex Setup"
    if ytd > 0 and one_month > 0:
        return "Accumulation"
    if ytd > 15 and one_month < 0:
        return "Distribution"
    if one_month < -3:
        return "Fading"
    return "Neutral"


def _fetch_etf_holdings(etf: str, max_n: int = 15) -> tuple[list[str], dict[str, str]]:
    """
    Fetch top N holdings for an ETF via yfinance funds_data.
    Returns (ticker_list, {ticker: name}). Returns ([], {}) on any failure.
    """
    try:
        df = yf.Ticker(etf).funds_data.top_holdings
        if df is None or df.empty:
            return [], {}

        tickers: list[str] = []
        names: dict[str, str] = {}

        # yfinance returns a MultiIndex (symbol, name) or a flat index with a Symbol column
        # depending on version — handle both shapes.
        idx = df.index
        if isinstance(idx, pd.MultiIndex):
            for sym, name in idx[:max_n]:
                sym = str(sym).strip()
                if sym and sym.lower() != "nan":
                    tickers.append(sym)
                    names[sym] = str(name).strip()
        else:
            sym_col = next((c for c in df.columns if c.lower() == "symbol"), None)
            name_col = next((c for c in df.columns if c.lower() in ("name", "holdingname", "security")), None)
            rows = df.reset_index() if sym_col is None else df
            sym_col = sym_col or (df.index.name if df.index.name else None)
            for _, row in df.head(max_n).iterrows():
                sym = str(row[sym_col]).strip() if sym_col and sym_col in row else str(row.name).strip()
                if sym and sym.lower() != "nan":
                    tickers.append(sym)
                    if name_col and name_col in row:
                        names[sym] = str(row[name_col]).strip()

        return tickers, names
    except Exception as e:
        logger.debug(f"ETF holdings fetch skipped for {etf}: {e}")
        return [], {}


def _fetch_prices(tickers: list[str]) -> pd.DataFrame:
    """Batch download ~130 days of closes for a list of tickers."""
    try:
        data = yf.download(
            tickers,
            period="ytd",
            auto_adjust=True,
            progress=False,
            threads=True,
        )
        if data.empty:
            return pd.DataFrame()
        closes = data["Close"] if "Close" in data.columns else data
        # Single ticker returns a Series — normalise to DataFrame
        if isinstance(closes, pd.Series):
            closes = closes.to_frame(name=tickers[0] if len(tickers) == 1 else "price")
        return closes.dropna(how="all")
    except Exception as e:
        logger.warning(f"yfinance batch download failed: {e}")
        return pd.DataFrame()


class SectorService:
    def __init__(self, fmp_service, settings):
        self._fmp = fmp_service
        self._settings = settings
        self._finnhub = None
        self._marketaux = None
        self._summary_cache: dict = {"data": None, "expires_at": 0.0}
        self._detail_cache: dict = {}
        self._holdings_cache: dict = {}  # etf → {tickers, names, expires_at}

    def _get_holdings(self, etf: str, fallback: list[str]) -> tuple[list[str], dict[str, str]]:
        """Return live ETF holdings with 24h cache; falls back to the hardcoded list."""
        entry = self._holdings_cache.get(etf)
        if entry and time.time() < entry["expires_at"]:
            return entry["tickers"], entry["names"]
        tickers, names = _fetch_etf_holdings(etf)
        if tickers:
            logger.info(f"Loaded {len(tickers)} live holdings for {etf}")
            self._holdings_cache[etf] = {"tickers": tickers, "names": names, "expires_at": time.time() + 86400}
            return tickers, names
        logger.debug(f"Using fallback tickers for {etf}")
        return fallback, {}

    def _get_finnhub(self):
        if self._finnhub is None:
            from app.services.finnhub_service import FinnhubService
            self._finnhub = FinnhubService(api_key=self._settings.FINNHUB_API_KEY)
        return self._finnhub

    def _get_marketaux(self):
        if self._marketaux is None:
            from app.services.marketaux_service import MarketauxService
            self._marketaux = MarketauxService(api_key=self._settings.MARKETAUX_API_KEY)
        return self._marketaux

    def get_all_summaries(self) -> list[dict]:
        if self._summary_cache["data"] and time.time() < self._summary_cache["expires_at"]:
            return self._summary_cache["data"]

        # Collect all proxy ETFs in one batch download
        etfs = [info[2] for info in BASKETS.values()]
        prices = _fetch_prices(etfs)

        results = []
        for sector_id, (name, category, etf, tickers) in BASKETS.items():
            try:
                col = etf if etf in prices.columns else None
                if col and len(prices[col].dropna()) >= 5:
                    series = prices[col].dropna()
                    ytd = _pct_change(series, len(series) - 1)
                    one_month = _pct_change(series, min(22, len(series) - 1))
                    five_day = _pct_change(series, min(5, len(series) - 1))
                else:
                    ytd, one_month, five_day = 0.0, 0.0, 0.0

                phase = _derive_phase(ytd, one_month, five_day)
                rotation = _derive_rotation(ytd, one_month, phase)

                results.append({
                    "id": sector_id,
                    "name": name,
                    "etf": etf,
                    "category": category,
                    "ytd_return": ytd,
                    "one_month_return": one_month,
                    "stock_count": len(tickers),
                    "phase": phase,
                    "rotation": rotation,
                })
            except Exception as e:
                logger.warning(f"Failed to compute summary for {sector_id}: {e}")

        results.sort(key=lambda x: x["ytd_return"], reverse=True)
        self._summary_cache["data"] = results
        self._summary_cache["expires_at"] = time.time() + 3600
        return results

    def get_detail(self, sector_id: str) -> dict | None:
        if sector_id in self._detail_cache:
            entry = self._detail_cache[sector_id]
            if time.time() < entry["expires_at"]:
                return entry["data"]

        if sector_id not in BASKETS:
            return None

        name, category, etf, fallback_tickers = BASKETS[sector_id]
        tickers, live_names = self._get_holdings(etf, fallback_tickers)

        # Batch download ETF + all constituent tickers
        all_symbols = [etf] + tickers
        prices = _fetch_prices(all_symbols)

        def get_returns(symbol: str) -> tuple[float, float]:
            col = symbol if symbol in prices.columns else None
            if not col:
                return 0.0, 0.0
            series = prices[col].dropna()
            if len(series) < 5:
                return 0.0, 0.0
            ytd = _pct_change(series, len(series) - 1)
            one_month = _pct_change(series, min(22, len(series) - 1))
            return ytd, one_month

        # ETF-level returns
        ytd_etf, one_month_etf = get_returns(etf)
        five_day_etf = 0.0
        if etf in prices.columns:
            s = prices[etf].dropna()
            five_day_etf = _pct_change(s, 5)

        # Individual stock returns
        stocks = []
        finnhub = self._get_finnhub()
        for ticker in tickers:
            try:
                ytd, one_month = get_returns(ticker)
                company_name = live_names.get(ticker) or TICKER_NAMES.get(ticker, ticker)
                analyst = finnhub.get_analyst_recommendation(ticker)
                stocks.append({
                    "ticker": ticker,
                    "name": company_name,
                    "ytd_return": ytd,
                    "one_month_return": one_month,
                    "weight": None,
                    "analyst_consensus": analyst.get("consensus") if analyst else None,
                    "analyst_buy": analyst.get("buy") if analyst else None,
                    "analyst_sell": analyst.get("sell") if analyst else None,
                    "analyst_hold": analyst.get("hold") if analyst else None,
                })
            except Exception as e:
                logger.warning(f"Failed to get data for {ticker}: {e}")

        stocks.sort(key=lambda x: x["ytd_return"], reverse=True)

        returns = [s["ytd_return"] for s in stocks]
        winner_count = sum(1 for r in returns if r > 0)
        loser_count = sum(1 for r in returns if r <= 0)
        median_return = round(statistics.median(returns), 2) if returns else 0.0
        avg_return = round(sum(returns) / len(returns), 2) if returns else 0.0

        phase = _derive_phase(ytd_etf, one_month_etf, five_day_etf)
        rotation = _derive_rotation(ytd_etf, one_month_etf, phase)

        narrative, articles = self._generate_narrative(sector_id, name, ytd_etf, one_month_etf, stocks)

        detail = {
            "id": sector_id,
            "name": name,
            "etf": etf,
            "category": category,
            "ytd_return": ytd_etf,
            "one_month_return": one_month_etf,
            "winner_count": winner_count,
            "loser_count": loser_count,
            "median_return": median_return,
            "avg_return": avg_return,
            "stocks": stocks,
            "narrative": narrative,
            "articles": articles,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }

        self._detail_cache[sector_id] = {"data": detail, "expires_at": time.time() + 7200}
        return detail

    def _generate_narrative(
        self,
        sector_id: str,
        name: str,
        ytd: float,
        one_month: float,
        stocks: list[dict],
    ) -> tuple[str | None, list[dict]]:
        articles = []
        narrative = None

        _, _, etf, basket_tickers = BASKETS[sector_id]

        # Primary: Marketaux filtered by industry tag + basket symbols.
        # Uses hardcoded basket tickers (not live ETF holdings) to avoid
        # cross-sector bleed from off-sector stocks in multi-theme ETFs.
        try:
            marketaux = self._get_marketaux()
            if self._settings.MARKETAUX_API_KEY:
                articles = marketaux.get_sector_news(
                    sector_id=sector_id,
                    symbols=basket_tickers[:6],
                    max_articles=5,
                    days=7,
                )
        except Exception as e:
            logger.warning(f"Marketaux news failed for {sector_id}: {e}")

        # Fallback: Finnhub company-news for the top basket tickers
        if not articles:
            try:
                finnhub = self._get_finnhub()
                articles = finnhub.get_sector_news(basket_tickers[:5], days=14, max_articles=6)
            except Exception as e:
                logger.warning(f"Finnhub fallback news failed for {sector_id}: {e}")

        try:
            from groq import Groq
            if self._settings.GROQ_API_KEY:
                top_stocks = ", ".join(f"{s['ticker']} ({s['ytd_return']:+.1f}%)" for s in stocks[:5])
                snippets = "\n".join(
                    f"- {a.get('title', '')}: {a.get('summary') or a.get('content', '')}"
                    for a in articles[:3]
                ) if articles else "No recent articles."
                prompt = (
                    f"{name} sector: YTD {ytd:+.1f}%, last month {one_month:+.1f}%.\n"
                    f"Top movers: {top_stocks}.\n\nRecent news:\n{snippets}\n\n"
                    f"In 2-3 sentences, explain what is driving this sector and whether a market rotation is occurring."
                )
                client = Groq(api_key=self._settings.GROQ_API_KEY)
                resp = client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a concise financial markets analyst. Never give buy/sell recommendations."},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=0.4,
                    max_tokens=150,
                )
                narrative = resp.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Groq narrative failed for {sector_id}: {e}")

        return narrative, articles
