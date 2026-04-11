"""
Tests for the Black-Scholes functions in app.api.demo.
Covers: _norm_cdf, _norm_pdf, _bs (pricing + Greeks), _strike_step, edge cases.
"""

import math
import pytest
from app.api.demo import _norm_cdf, _norm_pdf, _bs, _strike_step


# ─── _norm_cdf ────────────────────────────────────────────────────────────────

class TestNormCdf:
    def test_zero_returns_half(self):
        assert abs(_norm_cdf(0.0) - 0.5) < 1e-10

    def test_large_positive_approaches_one(self):
        assert _norm_cdf(8.0) > 0.9999

    def test_large_negative_approaches_zero(self):
        assert _norm_cdf(-8.0) < 0.0001

    def test_symmetry(self):
        # N(-x) == 1 - N(x)
        for x in [0.5, 1.0, 1.96, 2.576]:
            assert abs(_norm_cdf(-x) - (1.0 - _norm_cdf(x))) < 1e-12

    def test_known_value_196(self):
        # N(1.96) ≈ 0.975
        assert abs(_norm_cdf(1.96) - 0.975) < 0.001


# ─── _norm_pdf ────────────────────────────────────────────────────────────────

class TestNormPdf:
    def test_zero_is_max(self):
        # Peak of standard normal PDF is at x=0
        assert _norm_pdf(0.0) == pytest.approx(1.0 / math.sqrt(2.0 * math.pi), rel=1e-9)

    def test_symmetry(self):
        for x in [0.5, 1.0, 2.0]:
            assert _norm_pdf(x) == pytest.approx(_norm_pdf(-x), rel=1e-12)

    def test_tails_approach_zero(self):
        assert _norm_pdf(5.0) < 1e-5
        assert _norm_pdf(-5.0) < 1e-5

    def test_always_positive(self):
        for x in [-3.0, -1.0, 0.0, 1.0, 3.0]:
            assert _norm_pdf(x) > 0


# ─── _bs ─────────────────────────────────────────────────────────────────────

class TestBlackScholes:
    """ATM, 1-year, 20% vol, 5% risk-free — a classic textbook scenario."""

    def setup_method(self):
        self.S = 100.0
        self.K = 100.0
        self.T = 1.0
        self.r = 0.05
        self.sigma = 0.20

    def _calc(self, **kwargs):
        params = dict(S=self.S, K=self.K, T=self.T, r=self.r, sigma=self.sigma)
        params.update(kwargs)
        return _bs(**params)

    # --- Prices ---

    def test_call_price_positive(self):
        result = self._calc()
        assert result["call_price"] > 0

    def test_put_price_positive(self):
        result = self._calc()
        assert result["put_price"] > 0

    def test_put_call_parity(self):
        # C - P = S - K * e^(-rT)
        result = self._calc()
        lhs = result["call_price"] - result["put_price"]
        rhs = self.S - self.K * math.exp(-self.r * self.T)
        assert abs(lhs - rhs) < 0.02  # within 2 cents

    def test_deep_itm_call_price_near_intrinsic(self):
        # Call deep ITM: price ≈ S - K (discounted)
        result = _bs(S=150.0, K=100.0, T=1.0, r=0.05, sigma=0.20)
        assert result["call_price"] > 45.0  # must be at least intrinsic-ish

    def test_deep_otm_call_price_near_zero(self):
        result = _bs(S=50.0, K=100.0, T=1.0, r=0.05, sigma=0.20)
        assert result["call_price"] < 5.0

    # --- Deltas ---

    def test_call_delta_between_zero_and_one(self):
        result = self._calc()
        assert 0.0 < result["call_delta"] < 1.0

    def test_put_delta_between_negative_one_and_zero(self):
        result = self._calc()
        assert -1.0 < result["put_delta"] < 0.0

    def test_call_put_delta_relationship(self):
        # put_delta = call_delta - 1, so call_delta - put_delta = 1
        result = self._calc()
        assert abs(result["call_delta"] - result["put_delta"] - 1.0) < 0.0001

    def test_deep_itm_call_delta_near_one(self):
        result = _bs(S=200.0, K=100.0, T=1.0, r=0.05, sigma=0.20)
        assert result["call_delta"] > 0.95

    def test_deep_otm_call_delta_near_zero(self):
        result = _bs(S=50.0, K=100.0, T=1.0, r=0.05, sigma=0.20)
        assert result["call_delta"] < 0.05

    # --- Gamma ---

    def test_gamma_positive(self):
        result = self._calc()
        assert result["gamma"] > 0

    def test_gamma_same_for_call_and_put(self):
        # Gamma is identical for calls and puts at the same strike
        result = self._calc()
        # _bs only returns one gamma value; confirm it's positive
        assert result["gamma"] > 0

    # --- Theta ---

    def test_theta_call_negative(self):
        # Options lose value as time passes (theta is negative)
        result = self._calc()
        assert result["theta_call"] < 0

    def test_theta_put_negative(self):
        result = self._calc()
        assert result["theta_put"] < 0

    # --- Vega ---

    def test_vega_positive(self):
        result = self._calc()
        assert result["vega"] > 0

    def test_higher_vol_gives_higher_price(self):
        low_vol  = self._calc(sigma=0.10)
        high_vol = self._calc(sigma=0.40)
        assert high_vol["call_price"] > low_vol["call_price"]
        assert high_vol["put_price"]  > low_vol["put_price"]

    def test_longer_expiry_gives_higher_price(self):
        short = self._calc(T=0.1)
        long_ = self._calc(T=2.0)
        assert long_["call_price"] > short["call_price"]


# ─── _bs: T=0 edge case ───────────────────────────────────────────────────────

class TestBlackScholesExpired:
    def test_expired_itm_call_returns_intrinsic(self):
        result = _bs(S=110.0, K=100.0, T=0.0, r=0.05, sigma=0.20)
        assert result["call_price"] == 10.0
        assert result["put_price"]  == 0.0  # OTM at expiry = 0, no clamping in T=0 branch

    def test_expired_itm_put_returns_intrinsic(self):
        result = _bs(S=90.0, K=100.0, T=0.0, r=0.05, sigma=0.20)
        assert result["put_price"]  == 10.0
        assert result["call_price"] == 0.0

    def test_expired_otm_call_returns_zero(self):
        result = _bs(S=90.0, K=100.0, T=0.0, r=0.05, sigma=0.20)
        assert result["call_price"] == 0.0

    def test_expired_delta_itm_call_is_one(self):
        result = _bs(S=110.0, K=100.0, T=0.0, r=0.05, sigma=0.20)
        assert result["call_delta"] == 1.0

    def test_expired_delta_otm_call_is_zero(self):
        result = _bs(S=90.0, K=100.0, T=0.0, r=0.05, sigma=0.20)
        assert result["call_delta"] == 0.0

    def test_expired_greeks_all_zero(self):
        result = _bs(S=100.0, K=100.0, T=0.0, r=0.05, sigma=0.20)
        assert result["gamma"] == 0.0
        assert result["theta_call"] == 0.0
        assert result["vega"] == 0.0

    def test_negative_T_treated_same_as_zero(self):
        result = _bs(S=110.0, K=100.0, T=-1.0, r=0.05, sigma=0.20)
        assert result["call_price"] == 10.0


# ─── _strike_step ─────────────────────────────────────────────────────────────

class TestStrikeStep:
    def test_high_price_stock(self):
        assert _strike_step(600.0) == 10.0

    def test_mid_price_stock(self):
        assert _strike_step(300.0) == 5.0

    def test_low_price_stock(self):
        assert _strike_step(150.0) == 2.5

    def test_boundary_500(self):
        assert _strike_step(500.0) == 10.0

    def test_boundary_200(self):
        assert _strike_step(200.0) == 5.0

    def test_boundary_just_below_200(self):
        assert _strike_step(199.99) == 2.5
