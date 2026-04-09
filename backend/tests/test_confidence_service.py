"""
Unit tests for ConfidenceService (pure / non-network functions)
"""

import json
import math
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.services.confidence_service import (
    ConfidenceService,
    RULE_WEIGHTS,
    FEATURE_KEYS,
    FITTED_THRESHOLD,
    _sigmoid,
    _safe_log,
)


def _make_service():
    """Create a ConfidenceService with mocked dependencies and no disk state."""
    stocktwits = MagicMock()
    fmp = MagicMock()
    with patch.object(ConfidenceService, "_load_state"):
        svc = ConfidenceService(stocktwits=stocktwits, fmp=fmp)
    return svc


# ─── _sigmoid ────────────────────────────────────────────────────────────────

class TestSigmoid:
    def test_zero_input_returns_half(self):
        assert abs(_sigmoid(0) - 0.5) < 1e-9

    def test_large_positive_approaches_one(self):
        assert _sigmoid(100) > 0.99

    def test_large_negative_approaches_zero(self):
        assert _sigmoid(-100) < 0.01

    def test_positive_input_above_half(self):
        assert _sigmoid(1.0) > 0.5

    def test_negative_input_below_half(self):
        assert _sigmoid(-1.0) < 0.5

    def test_output_bounded_between_zero_and_one(self):
        for x in [-50, -1, 0, 1, 50]:
            result = _sigmoid(x)
            assert 0 <= result <= 1


# ─── _safe_log ────────────────────────────────────────────────────────────────

class TestSafeLog:
    def test_positive_value(self):
        assert abs(_safe_log(math.e) - 1.0) < 1e-9

    def test_zero_returns_fallback(self):
        assert _safe_log(0) == 0.0

    def test_negative_returns_fallback(self):
        assert _safe_log(-5) == 0.0

    def test_custom_fallback(self):
        assert _safe_log(0, fallback=-99.0) == -99.0


# ─── _build_fvec ─────────────────────────────────────────────────────────────

class TestBuildFvec:
    def setup_method(self):
        self.svc = _make_service()

    def test_all_values_present(self):
        fvec = self.svc._build_fvec(0.5, 0.1, 0.02, 1.0, 0.05, 0.3)
        assert fvec["sent_score"] == 0.5
        assert fvec["sent_change"] == 0.1
        assert fvec["recent_return_5d"] == 0.02
        assert fvec["market_regime"] == 1.0
        assert fvec["vrp_proxy"] == 0.05
        assert fvec["sent_dispersion"] == 0.3

    def test_none_values_default_to_zero(self):
        fvec = self.svc._build_fvec(None, None, None, None, None, None)
        for key in FEATURE_KEYS:
            assert fvec[key] == 0.0

    def test_all_feature_keys_present(self):
        fvec = self.svc._build_fvec(0, 0, 0, 0, 0, 0)
        for key in FEATURE_KEYS:
            assert key in fvec


# ─── _rule_predict ────────────────────────────────────────────────────────────

class TestRulePredict:
    def setup_method(self):
        self.svc = _make_service()

    def test_all_zeros_returns_half(self):
        fvec = {k: 0.0 for k in RULE_WEIGHTS}
        p = self.svc._rule_predict(fvec)
        assert abs(p - 0.5) < 1e-9

    def test_strong_positive_returns_above_half(self):
        fvec = {k: 1.0 for k in RULE_WEIGHTS}
        p = self.svc._rule_predict(fvec)
        assert p > 0.5

    def test_strong_negative_returns_below_half(self):
        fvec = {k: -1.0 for k in RULE_WEIGHTS}
        p = self.svc._rule_predict(fvec)
        assert p < 0.5

    def test_output_bounded(self):
        fvec = {k: 100.0 for k in RULE_WEIGHTS}
        p = self.svc._rule_predict(fvec)
        assert 0 <= p <= 1

    def test_missing_key_treated_as_zero(self):
        # Should not raise; missing keys default to 0
        p = self.svc._rule_predict({})
        assert abs(p - 0.5) < 1e-9


# ─── _top_drivers ─────────────────────────────────────────────────────────────

class TestTopDrivers:
    def setup_method(self):
        self.svc = _make_service()

    def test_returns_at_most_three(self):
        fvec = {k: 1.0 for k in RULE_WEIGHTS}
        drivers = self.svc._top_drivers(fvec, RULE_WEIGHTS)
        assert len(drivers) <= 3

    def test_highest_contribution_first(self):
        # sent_score has weight 0.30 — with value 1.0, contribution = 0.30 (highest)
        fvec = {k: 1.0 for k in RULE_WEIGHTS}
        drivers = self.svc._top_drivers(fvec, RULE_WEIGHTS)
        # First driver should have the largest abs contribution
        contribs = [abs(d.weight) for d in drivers]
        assert contribs == sorted(contribs, reverse=True)

    def test_positive_contribution_is_bullish(self):
        fvec = {"sent_score": 1.0, **{k: 0.0 for k in RULE_WEIGHTS if k != "sent_score"}}
        drivers = self.svc._top_drivers(fvec, RULE_WEIGHTS)
        sent_driver = next(d for d in drivers if "sentiment" in d.label.lower() and "change" not in d.label.lower())
        assert sent_driver.direction == "bullish"

    def test_negative_contribution_is_bearish(self):
        fvec = {"sent_score": -1.0, **{k: 0.0 for k in RULE_WEIGHTS if k != "sent_score"}}
        drivers = self.svc._top_drivers(fvec, RULE_WEIGHTS)
        sent_driver = next((d for d in drivers if "bearish" in d.direction), None)
        assert sent_driver is not None

    def test_all_zero_fvec_returns_empty_or_zero_weights(self):
        fvec = {k: 0.0 for k in RULE_WEIGHTS}
        drivers = self.svc._top_drivers(fvec, RULE_WEIGHTS)
        assert all(d.weight == 0.0 for d in drivers)


# ─── record_outcome ───────────────────────────────────────────────────────────

class TestRecordOutcome:
    def setup_method(self):
        self.svc = _make_service()

    def test_observation_added(self):
        with patch.object(self.svc, "_save_state"):
            fvec = {k: 0.0 for k in FEATURE_KEYS}
            self.svc.record_outcome("AAPL", 5, fvec, 1)
            assert len(self.svc._observations[("AAPL", 5)]) == 1

    def test_multiple_outcomes_accumulate(self):
        with patch.object(self.svc, "_save_state"):
            fvec = {k: 0.0 for k in FEATURE_KEYS}
            for _ in range(5):
                self.svc.record_outcome("TSLA", 3, fvec, 0)
            assert len(self.svc._observations[("TSLA", 3)]) == 5

    def test_ticker_uppercased(self):
        with patch.object(self.svc, "_save_state"):
            fvec = {k: 0.0 for k in FEATURE_KEYS}
            self.svc.record_outcome("aapl", 1, fvec, 1)
            assert ("AAPL", 1) in self.svc._observations

    def test_model_cache_invalidated(self):
        with patch.object(self.svc, "_save_state"):
            key = ("AAPL", 5)
            self.svc._models[key] = (MagicMock(), 0.25)
            fvec = {k: 0.0 for k in FEATURE_KEYS}
            self.svc.record_outcome("AAPL", 5, fvec, 1)
            assert key not in self.svc._models


# ─── State save / load ────────────────────────────────────────────────────────

class TestStatePersistence:
    def setup_method(self):
        self.svc = _make_service()

    def test_save_and_load_round_trip(self, tmp_path):
        state_file = tmp_path / "confidence_state.json"
        self.svc._STATE_PATH = state_file

        # Seed some observations and history
        with patch.object(self.svc, "_save_state", wraps=self.svc._save_state):
            from collections import deque
            self.svc._sent_history["AAPL"] = deque([0.5, 0.3], maxlen=5)
            self.svc._observations[("AAPL", 5)] = [({k: 0.1 for k in FEATURE_KEYS}, 1)]
            self.svc._save_state()

        assert state_file.exists()

        # Load into a fresh service
        svc2 = _make_service()
        svc2._STATE_PATH = state_file
        svc2._load_state()

        assert "AAPL" in svc2._sent_history
        assert len(svc2._observations[("AAPL", 5)]) == 1

    def test_load_missing_file_does_not_crash(self, tmp_path):
        self.svc._STATE_PATH = tmp_path / "nonexistent.json"
        self.svc._load_state()  # Should not raise

    def test_load_corrupt_file_does_not_crash(self, tmp_path):
        state_file = tmp_path / "corrupt.json"
        state_file.write_text("{ invalid json }")
        self.svc._STATE_PATH = state_file
        self.svc._load_state()  # Should not raise
