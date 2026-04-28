"""
Confidence Service
Computes features, runs rule-based or fitted logistic regression, and
returns a ConfidenceResult for a given ticker + horizon.
"""

import json
import math
import logging
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import numpy as np

from app.models.confidence import (
    ConfidenceResult,
    FeatureSnapshot,
    TopDriver,
)
from app.services.stocktwits_service import StockTwitsService
from app.services.fmp_service import FMPService

logger = logging.getLogger(__name__)

# ─── Domain-knowledge weights (warming-up mode) ───────────────────────────────
RULE_WEIGHTS = {
    "sent_score":        0.30,
    "sent_change":       0.15,
    "recent_return_5d":  0.20,
    "market_regime":     0.15,
    "vrp_proxy":        -0.10,
    "sent_dispersion":  -0.10,
}

DRIVER_LABELS = {
    "sent_score":        ("Strong bullish sentiment",          "Strong bearish sentiment"),
    "sent_change":       ("Sentiment spiking vs. recent avg",  "Sentiment dropping vs. recent avg"),
    "vrp_proxy":         ("Elevated fear premium (IV > RV)",   "Compressed vol premium"),
    "recent_return_5d":  ("5-day price momentum positive",     "5-day price momentum negative"),
    "market_regime":     ("Bullish market backdrop",           "Bearish market backdrop"),
    "sent_dispersion":   ("High disagreement among traders",   "Strong consensus among traders"),
}

FEATURE_KEYS = list(RULE_WEIGHTS.keys())
FITTED_THRESHOLD = 30  # observations needed to switch to fitted mode


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-max(-20, min(20, x))))


def _safe_log(x: float, fallback: float = 0.0) -> float:
    return math.log(x) if x > 0 else fallback


class ConfidenceService:
    """
    Singleton-style service that accumulates observations and trains
    a logistic regression model per (ticker, horizon) pair.
    """

    _STATE_PATH = Path(__file__).parent.parent.parent / "data" / "confidence_state.json"

    def __init__(self, stocktwits: StockTwitsService, fmp: FMPService):
        self._stocktwits = stocktwits
        self._fmp = fmp

        # Sentiment history: ticker → deque of last 5 sent_score readings
        self._sent_history: dict[str, deque] = defaultdict(lambda: deque(maxlen=5))

        # Training data: (ticker, horizon) → list of (feature_vector, outcome)
        self._observations: dict[tuple, list] = defaultdict(list)

        # Fitted models: (ticker, horizon) → (model, brier_score)
        # Not persisted — retrained from observations on demand
        self._models: dict[tuple, tuple] = {}

        self._load_state()

    # ─── State persistence ────────────────────────────────────────────────────

    def _load_state(self):
        """Load observations and sentiment history from disk if available."""
        if not self._STATE_PATH.exists():
            return
        try:
            with self._STATE_PATH.open("r") as f:
                data = json.load(f)

            for ticker, vals in data.get("sent_history", {}).items():
                self._sent_history[ticker] = deque(vals, maxlen=5)

            for key_str, obs in data.get("observations", {}).items():
                ticker, horizon_str = key_str.rsplit("_", 1)
                key = (ticker, int(horizon_str))
                self._observations[key] = [(entry[0], entry[1]) for entry in obs]

            total_obs = sum(len(v) for v in self._observations.values())
            logger.info(f"Loaded confidence state: {total_obs} observations across {len(self._observations)} keys")
        except Exception as e:
            logger.warning(f"Could not load confidence state: {e}")

    def _save_state(self):
        """Persist observations and sentiment history to disk."""
        try:
            self._STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
            data = {
                "sent_history": {
                    ticker: list(vals)
                    for ticker, vals in self._sent_history.items()
                },
                "observations": {
                    f"{ticker}_{horizon}": obs
                    for (ticker, horizon), obs in self._observations.items()
                },
            }
            with self._STATE_PATH.open("w") as f:
                json.dump(data, f)
        except Exception as e:
            logger.warning(f"Could not save confidence state: {e}")

    # ─── Public entry point ───────────────────────────────────────────────────

    async def analyze(
        self,
        ticker: str,
        horizon: int,
        sent_score: Optional[float] = None,
        total_posts: Optional[int] = None,
    ) -> ConfidenceResult:
        ticker = ticker.upper()

        # 1. Pull sentiment — use caller-supplied values when available so the
        #    server never needs to hit StockTwits directly (avoids IP bans).
        if sent_score is not None:
            sent_score = float(sent_score)
            sent_volume = float(_safe_log((total_posts or 0) + 1))
            company_name_fallback = ticker
        else:
            sentiment = await self._stocktwits.get_sentiment(ticker)
            sent_score = float(sentiment.score)
            sent_volume = float(_safe_log(sentiment.total_posts + 1))
            company_name_fallback = sentiment.company_name or ticker

        sent_dispersion = 1.0 - abs(sent_score)

        history = self._sent_history[ticker]
        sent_change = (
            sent_score - float(np.mean(list(history))) if history else 0.0
        )
        history.append(sent_score)
        self._save_state()

        # 2. Market / price features (yfinance)
        recent_return_5d, realized_vol_20d, market_regime = await self._price_features(ticker)

        # 3. Options features (best-effort)
        iv_atm, implied_move_pct, vrp_proxy = await self._options_features(
            ticker, horizon, realized_vol_20d
        )

        # 4. Company name
        company_name = self._fmp.get_company_name(ticker)
        if company_name == ticker:
            company_name = company_name_fallback

        # 5. Build feature snapshot
        features = FeatureSnapshot(
            sent_score=round(sent_score, 4),
            sent_volume=round(sent_volume, 4),
            sent_dispersion=round(sent_dispersion, 4),
            sent_change=round(sent_change, 4),
            recent_return_5d=round(recent_return_5d, 4) if recent_return_5d is not None else None,
            realized_vol_20d=round(realized_vol_20d, 4) if realized_vol_20d is not None else None,
            market_regime=round(market_regime, 4) if market_regime is not None else None,
            iv_atm=round(iv_atm, 4) if iv_atm is not None else None,
            implied_move_pct=round(implied_move_pct, 4) if implied_move_pct is not None else None,
            vrp_proxy=round(vrp_proxy, 4) if vrp_proxy is not None else None,
        )

        # 6. Feature vector for inference (only RULE_WEIGHTS keys)
        fvec = self._build_fvec(
            sent_score, sent_change, recent_return_5d, market_regime, vrp_proxy, sent_dispersion
        )

        # 7. Determine model mode and compute confidence
        key = (ticker, horizon)
        obs = self._observations[key]

        if len(obs) >= FITTED_THRESHOLD:
            p_up, brier, weights = self._fitted_predict(key, fvec)
            model_mode = "fitted"
        else:
            p_up = self._rule_predict(fvec)
            brier = None
            weights = RULE_WEIGHTS
            model_mode = "warming_up"

        direction = "up" if p_up >= 0.5 else "down"
        confidence = round(p_up * 100, 1)

        # 8. Top 3 drivers
        top_drivers = self._top_drivers(fvec, weights)

        # 9. Expected move
        expected_move_pct = round(implied_move_pct * 100, 2) if implied_move_pct else (
            round(realized_vol_20d * math.sqrt(horizon / 252) * 100, 2)
            if realized_vol_20d else None
        )

        return ConfidenceResult(
            ticker=ticker,
            horizon=horizon,
            direction=direction,
            confidence=confidence,
            expected_move_pct=expected_move_pct,
            top_drivers=top_drivers,
            features=features,
            model_mode=model_mode,
            brier_score=brier,
            company_name=company_name,
            fetched_at=datetime.now(timezone.utc),
        )

    # ─── Observation recording (called externally after outcomes are known) ───

    def record_outcome(self, ticker: str, horizon: int, fvec: dict, outcome: int):
        """Store a (features, outcome) pair for future model training."""
        key = (ticker.upper(), horizon)
        self._observations[key].append((fvec, outcome))
        # Invalidate cached model so it gets retrained on next call
        self._models.pop(key, None)
        self._save_state()

    # ─── Feature helpers ──────────────────────────────────────────────────────

    def _build_fvec(
        self,
        sent_score, sent_change, recent_return_5d, market_regime, vrp_proxy, sent_dispersion
    ) -> dict:
        def safe(v, fallback=0.0):
            return float(v) if v is not None else fallback

        return {
            "sent_score":        safe(sent_score),
            "sent_change":       safe(sent_change),
            "recent_return_5d":  safe(recent_return_5d),
            "market_regime":     safe(market_regime),
            "vrp_proxy":         safe(vrp_proxy),
            "sent_dispersion":   safe(sent_dispersion),
        }

    async def _price_features(self, ticker: str):
        """Return (recent_return_5d, realized_vol_20d, market_regime)."""
        try:
            import yfinance as yf

            t = yf.Ticker(ticker)
            hist = t.history(period="30d")
            if hist.empty or len(hist) < 6:
                raise ValueError("Not enough price history")

            closes = hist["Close"].values
            recent_return_5d = (closes[-1] - closes[-6]) / closes[-6] if len(closes) >= 6 else 0.0

            log_rets = np.diff(np.log(closes[-21:])) if len(closes) >= 21 else np.diff(np.log(closes))
            realized_vol_20d = float(np.std(log_rets) * math.sqrt(252)) if len(log_rets) > 1 else 0.05

            # SPY regime
            spy = yf.Ticker("SPY")
            spy_hist = spy.history(period="10d")
            spy_ret = 0.0
            if not spy_hist.empty and len(spy_hist) >= 6:
                sc = spy_hist["Close"].values
                spy_ret = (sc[-1] - sc[-6]) / sc[-6]

            # VIX level
            vix = yf.Ticker("^VIX")
            vix_hist = vix.history(period="5d")
            vix_level = float(vix_hist["Close"].iloc[-1]) if not vix_hist.empty else 20.0

            if spy_ret > 0.01 and vix_level < 20:
                market_regime = 1.0
            elif spy_ret < -0.01 or vix_level > 30:
                market_regime = -1.0
            else:
                market_regime = 0.0

            return float(recent_return_5d), float(realized_vol_20d), market_regime

        except Exception as e:
            logger.warning(f"Price features failed for {ticker}: {e}")
            # Fallback to FMP closes
            closes = self._fmp.get_historical_closes(ticker, days=25)
            if len(closes) >= 6:
                r5d = (closes[-1] - closes[-6]) / closes[-6]
                log_rets = np.diff(np.log(closes[-21:])) if len(closes) >= 21 else np.diff(np.log(closes))
                rvol = float(np.std(log_rets) * math.sqrt(252)) if len(log_rets) > 1 else 0.05
                return r5d, rvol, 0.0
            return None, None, None

    async def _options_features(self, ticker: str, horizon: int, realized_vol_20d: Optional[float]):
        """Return (iv_atm, implied_move_pct, vrp_proxy). All can be None."""
        try:
            import yfinance as yf

            t = yf.Ticker(ticker)
            exps = t.options
            if not exps:
                return None, None, None

            # Pick nearest expiry
            exp = exps[0]
            chain = t.option_chain(exp)
            calls = chain.calls

            if calls.empty:
                return None, None, None

            # Current price
            info = t.fast_info
            spot = getattr(info, "last_price", None) or getattr(info, "previous_close", None)
            if not spot:
                return None, None, None

            # ATM call = minimum |strike - spot|
            calls = calls.dropna(subset=["impliedVolatility"])
            calls = calls[calls["impliedVolatility"] > 0]
            if calls.empty:
                return None, None, None

            atm_idx = (calls["strike"] - spot).abs().idxmin()
            iv_atm = float(calls.loc[atm_idx, "impliedVolatility"])

            T = horizon / 252.0
            implied_move_pct = iv_atm * math.sqrt(T)

            vrp_proxy = (iv_atm - realized_vol_20d) if realized_vol_20d else None

            return iv_atm, implied_move_pct, vrp_proxy

        except Exception as e:
            logger.warning(f"Options features failed for {ticker}: {e}")
            return None, None, None

    # ─── Inference ────────────────────────────────────────────────────────────

    def _rule_predict(self, fvec: dict) -> float:
        """Weighted sum → sigmoid → p_up (warming-up mode)."""
        raw = sum(RULE_WEIGHTS[k] * fvec.get(k, 0.0) for k in RULE_WEIGHTS)
        return _sigmoid(raw * 3)  # scale so sigmoid is meaningful

    def _fitted_predict(self, key: tuple, fvec: dict) -> tuple:
        """
        Fit (or retrieve cached) LogisticRegression + CalibratedClassifierCV.
        Returns (p_up, brier_score, feature_weights_dict).
        """
        if key not in self._models:
            self._models[key] = self._train(key)

        model, brier = self._models[key]
        if model is None:
            return self._rule_predict(fvec), None, RULE_WEIGHTS

        X = np.array([[fvec.get(k, 0.0) for k in FEATURE_KEYS]])
        p_up = float(model.predict_proba(X)[0, 1])

        # Extract weights from underlying LR estimator
        try:
            base = model.calibrated_classifiers_[0].estimator
            coefs = dict(zip(FEATURE_KEYS, base.coef_[0]))
        except Exception:
            coefs = RULE_WEIGHTS

        return p_up, brier, coefs

    def _train(self, key: tuple) -> tuple:
        """Train LogisticRegression + isotonic calibration. Returns (model, brier)."""
        try:
            from sklearn.linear_model import LogisticRegression
            from sklearn.calibration import CalibratedClassifierCV
            from sklearn.metrics import brier_score_loss
            from sklearn.preprocessing import StandardScaler
            from sklearn.pipeline import Pipeline

            obs = self._observations[key]
            X = np.array([[v.get(k, 0.0) for k in FEATURE_KEYS] for v, _ in obs])
            y = np.array([o for _, o in obs])

            if len(np.unique(y)) < 2:
                return None, None  # Can't train with only one class

            base = LogisticRegression(max_iter=500, C=1.0)
            cal = CalibratedClassifierCV(base, method="isotonic", cv=min(3, len(y) // 10 + 1))
            pipe = Pipeline([("scaler", StandardScaler()), ("cal", cal)])
            pipe.fit(X, y)

            p_pred = pipe.predict_proba(X)[:, 1]
            brier = round(float(brier_score_loss(y, p_pred)), 4)

            return pipe, brier

        except Exception as e:
            logger.error(f"Model training failed for {key}: {e}")
            return None, None

    # ─── Driver explanation ────────────────────────────────────────────────────

    def _top_drivers(self, fvec: dict, weights: dict) -> list:
        contribs = {}
        for feat, w in weights.items():
            val = fvec.get(feat, 0.0)
            contribs[feat] = w * val

        sorted_feats = sorted(contribs, key=lambda k: abs(contribs[k]), reverse=True)
        drivers = []
        for feat in sorted_feats[:3]:
            c = contribs[feat]
            if feat not in DRIVER_LABELS:
                continue
            bull_label, bear_label = DRIVER_LABELS[feat]
            label = bull_label if c >= 0 else bear_label
            direction = "bullish" if c >= 0 else "bearish"
            drivers.append(TopDriver(label=label, direction=direction, weight=round(c, 4)))

        return drivers
