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
        """Test legacy root endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"

    def test_api_root_endpoint(self):
        """Test /api/ root endpoint"""
        response = client.get("/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "online"
        assert "service" in data

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "services" in data

    def test_health_check_reports_database_service(self):
        """Health check includes database service status."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert "services" in data
        assert "database" in data["services"]
        assert data["services"]["database"] in ["operational", "unavailable"]

    def test_demo_options_endpoint(self):
        """Test demo options chain endpoint"""
        response = client.get("/api/demo/options/AAPL?days=14")
        assert response.status_code == 200
        data = response.json()
        assert data["ticker"] == "AAPL"
        assert "spot" in data
        assert "chain" in data
        assert len(data["chain"]) == 17  # 8 below ATM + ATM + 8 above

    def test_demo_options_invalid_ticker(self):
        """Test demo options endpoint rejects non-Mag7 tickers"""
        response = client.get("/api/demo/options/XYZ")
        assert response.status_code == 404

    def test_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.get("/api/options/chain/INVALIDTICKER123")
        # Should either return 500 or handle gracefully
        assert response.status_code in [404, 500]
