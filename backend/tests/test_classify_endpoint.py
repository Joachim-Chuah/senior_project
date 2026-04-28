"""
Tests for POST /api/sentiment/classify endpoint
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


class TestClassifyEndpoint:

    def test_classify_returns_labels(self, client):
        with patch("app.api.sentiment._finbert") as mock_finbert:
            mock_finbert.classify_texts.return_value = ["Bullish", "Bearish"]
            res = client.post("/api/sentiment/classify", json={"texts": ["stock is up", "market crash"]})
        assert res.status_code == 200
        assert res.json() == {"labels": ["Bullish", "Bearish"]}

    def test_classify_empty_texts(self, client):
        with patch("app.api.sentiment._finbert") as mock_finbert:
            mock_finbert.classify_texts.return_value = []
            res = client.post("/api/sentiment/classify", json={"texts": []})
        assert res.status_code == 200
        assert res.json() == {"labels": []}

    def test_classify_calls_finbert_with_texts(self, client):
        with patch("app.api.sentiment._finbert") as mock_finbert:
            mock_finbert.classify_texts.return_value = ["Neutral"]
            client.post("/api/sentiment/classify", json={"texts": ["uncertain outlook"]})
            mock_finbert.classify_texts.assert_called_once_with(["uncertain outlook"])

    def test_classify_missing_texts_field_returns_422(self, client):
        res = client.post("/api/sentiment/classify", json={})
        assert res.status_code == 422

    def test_classify_neutral_label(self, client):
        with patch("app.api.sentiment._finbert") as mock_finbert:
            mock_finbert.classify_texts.return_value = ["Neutral"]
            res = client.post("/api/sentiment/classify", json={"texts": ["no clear direction"]})
        assert res.json()["labels"] == ["Neutral"]
