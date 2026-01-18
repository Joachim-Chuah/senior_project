"""
Tests for API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestAPIEndpoints:
    """Test API endpoints"""

    def test_root_endpoint(self):
        """Test root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "service" in data

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data

    def test_scenario_analysis_endpoint(self):
        """Test scenario analysis endpoint"""
        payload = {
            "ticker": "AAPL",
            "strike": 150,
            "expiration": "2024-12-31",
            "option_type": "call",
            "spot_price": 150,
            "volatility": 0.3,
            "price_change": 5,
            "volatility_change": 0.05,
            "time_change": -1
        }

        response = client.post("/api/options/scenario", params=payload)
        assert response.status_code == 200
        data = response.json()

        assert "base_price" in data
        assert "adjusted_price" in data
        assert "base_greeks" in data
        assert "adjusted_greeks" in data

    def test_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.get("/api/options/chain/INVALIDTICKER123")
        # Should either return 500 or handle gracefully
        assert response.status_code in [404, 500]
