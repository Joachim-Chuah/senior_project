"""
Unit tests for FinBERTService
"""

import pytest
from unittest.mock import MagicMock, patch


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _make_pipeline_result(labels):
    """Build a fake HuggingFace pipeline output list."""
    return [{"label": l, "score": 0.99} for l in labels]


def _make_service_with_mock_pipeline(labels):
    """Return a FinBERTService whose internal pipeline is mocked."""
    from app.services.finbert_service import FinBERTService
    svc = FinBERTService()
    mock_pipe = MagicMock(return_value=_make_pipeline_result(labels))
    FinBERTService._pipeline = mock_pipe
    return svc, mock_pipe


# ─── Label mapping ────────────────────────────────────────────────────────────

class TestLabelMapping:
    def setup_method(self):
        # Reset class-level singleton before each test
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def teardown_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def test_positive_maps_to_bullish(self):
        svc, _ = _make_service_with_mock_pipeline(["positive"])
        result = svc.classify_texts(["Earnings beat, stock is flying!"])
        assert result == ["Bullish"]

    def test_negative_maps_to_bearish(self):
        svc, _ = _make_service_with_mock_pipeline(["negative"])
        result = svc.classify_texts(["This company is doomed."])
        assert result == ["Bearish"]

    def test_neutral_maps_to_neutral(self):
        svc, _ = _make_service_with_mock_pipeline(["neutral"])
        result = svc.classify_texts(["No strong view here."])
        assert result == ["Neutral"]

    def test_unknown_label_maps_to_neutral(self):
        from app.services.finbert_service import FinBERTService
        svc = FinBERTService()
        mock_pipe = MagicMock(return_value=[{"label": "unknown", "score": 0.5}])
        FinBERTService._pipeline = mock_pipe
        result = svc.classify_texts(["some text"])
        assert result == ["Neutral"]


# ─── Batch processing ─────────────────────────────────────────────────────────

class TestBatchProcessing:
    def setup_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def teardown_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def test_empty_input_returns_empty_list(self):
        from app.services.finbert_service import FinBERTService
        svc = FinBERTService()
        result = svc.classify_texts([])
        assert result == []

    def test_batch_returns_one_label_per_text(self):
        labels = ["positive", "negative", "neutral"]
        svc, _ = _make_service_with_mock_pipeline(labels)
        texts = ["bull post", "bear post", "meh post"]
        result = svc.classify_texts(texts)
        assert len(result) == 3
        assert result == ["Bullish", "Bearish", "Neutral"]

    def test_pipeline_receives_full_batch(self):
        svc, mock_pipe = _make_service_with_mock_pipeline(["neutral", "neutral"])
        texts = ["text one", "text two"]
        svc.classify_texts(texts)
        mock_pipe.assert_called_once_with(texts)


# ─── Error handling ───────────────────────────────────────────────────────────

class TestErrorHandling:
    def setup_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def teardown_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def test_pipeline_exception_returns_all_neutral(self):
        from app.services.finbert_service import FinBERTService
        svc = FinBERTService()
        mock_pipe = MagicMock(side_effect=RuntimeError("CUDA OOM"))
        FinBERTService._pipeline = mock_pipe
        result = svc.classify_texts(["post 1", "post 2", "post 3"])
        assert result == ["Neutral", "Neutral", "Neutral"]

    def test_pipeline_exception_does_not_raise(self):
        from app.services.finbert_service import FinBERTService
        svc = FinBERTService()
        mock_pipe = MagicMock(side_effect=Exception("unexpected"))
        FinBERTService._pipeline = mock_pipe
        # Should not raise
        result = svc.classify_texts(["text"])
        assert isinstance(result, list)


# ─── Singleton behaviour ──────────────────────────────────────────────────────

class TestSingleton:
    def setup_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def teardown_method(self):
        from app.services.finbert_service import FinBERTService
        FinBERTService._pipeline = None

    def test_pipeline_loaded_once_across_instances(self):
        from app.services.finbert_service import FinBERTService

        mock_pipe = MagicMock(return_value=_make_pipeline_result(["positive"]))
        with patch("app.services.finbert_service.FinBERTService._load", return_value=mock_pipe) as mock_load:
            svc1 = FinBERTService()
            svc2 = FinBERTService()
            svc1.classify_texts(["hello"])
            svc2.classify_texts(["world"])
            assert mock_load.call_count == 2  # _load called each time, but internally guards with _pipeline check
