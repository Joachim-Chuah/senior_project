"""
Unit tests for RAGService
"""

import json
import pytest
from unittest.mock import MagicMock, patch, call

from app.services.rag_service import RAGService, _vec


# ─── _vec ─────────────────────────────────────────────────────────────────────

class TestVec:
    def test_returns_bracket_wrapped_string(self):
        result = _vec([0.1, 0.2, 0.3])
        assert result.startswith("[")
        assert result.endswith("]")

    def test_values_formatted_to_six_decimals(self):
        result = _vec([0.123456789])
        assert "0.123457" in result

    def test_empty_list(self):
        result = _vec([])
        assert result == "[]"

    def test_multiple_values_comma_separated(self):
        result = _vec([1.0, 2.0, 3.0])
        inner = result[1:-1]
        parts = inner.split(",")
        assert len(parts) == 3

    def test_negative_values(self):
        result = _vec([-0.5, 0.5])
        assert "-0.500000" in result


# ─── RAGService lazy init ──────────────────────────────────────────────────────

class TestRAGInit:
    def test_not_ready_before_first_call(self):
        svc = RAGService()
        assert svc._ready is False

    def _mock_st(self):
        """Build a fake sentence_transformers sys.modules entry to avoid numpy recursion."""
        mock_module = MagicMock()
        mock_module.SentenceTransformer = MagicMock(return_value=MagicMock())
        return {"sentence_transformers": mock_module}

    def test_init_returns_false_without_db_url(self):
        svc = RAGService()
        mock_psycopg = MagicMock()
        mocks = {**self._mock_st(), "psycopg": mock_psycopg}
        with patch.dict("sys.modules", mocks), \
             patch.dict("os.environ", {}, clear=True), \
             patch("dotenv.load_dotenv", lambda: None):
            result = svc._init()
        assert result is False
        assert svc._ready is False

    def test_init_returns_false_when_sentence_transformers_unavailable(self):
        svc = RAGService()
        with patch.dict("sys.modules", {"sentence_transformers": None}):
            result = svc._init()
        assert result is False

    def test_init_sets_ready_on_success(self):
        svc = RAGService()
        mock_conn = MagicMock()
        mock_conn.__enter__ = MagicMock(return_value=mock_conn)
        mock_conn.__exit__ = MagicMock(return_value=False)
        mock_psycopg = MagicMock()
        mock_psycopg.connect = MagicMock(return_value=mock_conn)

        mocks = {**self._mock_st(), "psycopg": mock_psycopg}
        with patch.dict("sys.modules", mocks), \
             patch.dict("os.environ", {"DATABASE_URL": "postgresql://localhost/test"}):
            result = svc._init()

        assert result is True
        assert svc._ready is True

    def test_init_idempotent_when_already_ready(self):
        svc = RAGService()
        svc._ready = True
        result = svc._init()
        assert result is True

    def test_init_returns_false_on_db_connect_error(self):
        svc = RAGService()
        mock_psycopg = MagicMock()
        mock_psycopg.connect = MagicMock(side_effect=Exception("connection refused"))
        mocks = {**self._mock_st(), "psycopg": mock_psycopg}
        with patch.dict("sys.modules", mocks), \
             patch.dict("os.environ", {"DATABASE_URL": "postgresql://localhost/test"}):
            result = svc._init()
        assert result is False
        assert svc._ready is False


# ─── RAGService._embed ────────────────────────────────────────────────────────

class TestEmbed:
    def test_returns_list_of_floats(self):
        svc = RAGService()
        svc._ready = True
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock(tolist=MagicMock(return_value=[0.1, 0.2, 0.3]))
        svc._model = mock_model
        result = svc._embed("test text")
        assert result == [0.1, 0.2, 0.3]

    def test_calls_encode_with_normalize(self):
        svc = RAGService()
        svc._ready = True
        mock_model = MagicMock()
        mock_model.encode.return_value = MagicMock(tolist=MagicMock(return_value=[]))
        svc._model = mock_model
        svc._embed("hello")
        mock_model.encode.assert_called_once_with("hello", normalize_embeddings=True)


# ─── RAGService.ingest ────────────────────────────────────────────────────────

class TestIngest:
    def _make_ready_svc(self):
        svc = RAGService()
        svc._ready = True
        svc._db_url = "postgresql://localhost/test"
        svc._model = MagicMock()
        svc._model.encode.return_value = MagicMock(tolist=MagicMock(return_value=[0.1] * 384))
        return svc

    def _make_conn_mock(self):
        conn = MagicMock()
        conn.__enter__ = MagicMock(return_value=conn)
        conn.__exit__ = MagicMock(return_value=False)
        return conn

    def test_calls_insert_on_valid_doc(self):
        svc = self._make_ready_svc()
        conn = self._make_conn_mock()
        with patch("psycopg.connect", return_value=conn):
            svc.ingest("doc1", "Some text", {"ticker": "AAPL", "doc_type": "news"})
        conn.execute.assert_called_once()

    def test_skips_when_not_ready(self):
        svc = RAGService()
        svc._init = MagicMock(return_value=False)
        with patch("psycopg.connect") as mock_connect:
            svc.ingest("doc1", "text")
        mock_connect.assert_not_called()

    def test_handles_db_exception_gracefully(self):
        svc = self._make_ready_svc()
        with patch("psycopg.connect", side_effect=Exception("db error")):
            svc.ingest("doc1", "text")  # should not raise

    def test_metadata_defaults_to_empty_dict(self):
        svc = self._make_ready_svc()
        conn = self._make_conn_mock()
        with patch("psycopg.connect", return_value=conn):
            svc.ingest("doc1", "text")
        args = conn.execute.call_args[0][1]
        # 6th arg is json.dumps(meta) — should be '{}'
        assert args[5] == "{}"

    def test_metadata_fields_used_correctly(self):
        svc = self._make_ready_svc()
        conn = self._make_conn_mock()
        with patch("psycopg.connect", return_value=conn):
            svc.ingest("doc1", "text", {"ticker": "NVDA", "doc_type": "profile", "source": "yfinance"})
        args = conn.execute.call_args[0][1]
        assert args[1] == "NVDA"  # ticker
        assert args[2] == "profile"  # doc_type
        assert args[4] == "yfinance"  # source


# ─── RAGService.ingest_company_profile ───────────────────────────────────────

class TestIngestCompanyProfile:
    def _make_ready_svc(self):
        svc = RAGService()
        svc._ready = True
        svc._db_url = "postgresql://localhost/test"
        svc._model = MagicMock()
        svc._model.encode.return_value = MagicMock(tolist=MagicMock(return_value=[0.0] * 384))
        svc.ingest = MagicMock()
        return svc

    def _make_yf_info(self):
        return {
            "longName": "NVIDIA Corporation", "exchange": "NASDAQ",
            "sector": "Technology", "industry": "Semiconductors",
            "marketCap": 1_000_000_000_000, "trailingPE": 50.0,
            "beta": 1.5, "fiftyTwoWeekHigh": 950.0, "fiftyTwoWeekLow": 400.0,
            "companyOfficers": [{"name": "Jensen Huang"}],
            "fullTimeEmployees": 26000, "city": "Santa Clara", "country": "US",
            "longBusinessSummary": "NVIDIA designs GPUs.",
        }

    def _mock_yf(self, info):
        """Build a fake yfinance sys.modules entry to avoid numpy recursion."""
        mock_ticker_inst = MagicMock()
        mock_ticker_inst.info = info
        mock_yf_module = MagicMock()
        mock_yf_module.Ticker = MagicMock(return_value=mock_ticker_inst)
        return {"yfinance": mock_yf_module}

    def test_skips_if_already_ingested(self):
        svc = self._make_ready_svc()
        svc._ingested_tickers = {"NVDA"}
        svc.ingest_company_profile("NVDA")
        svc.ingest.assert_not_called()

    def test_uppercases_ticker(self):
        svc = self._make_ready_svc()
        with patch.dict("sys.modules", self._mock_yf(self._make_yf_info())):
            svc.ingest_company_profile("nvda")
        assert "NVDA" in svc._ingested_tickers

    def test_skips_if_no_long_name(self):
        svc = self._make_ready_svc()
        with patch.dict("sys.modules", self._mock_yf({})):
            svc.ingest_company_profile("NVDA")
        svc.ingest.assert_not_called()

    def test_calls_ingest_with_profile_text(self):
        svc = self._make_ready_svc()
        with patch.dict("sys.modules", self._mock_yf(self._make_yf_info())):
            svc.ingest_company_profile("NVDA")
        svc.ingest.assert_called_once()
        doc_id = svc.ingest.call_args.kwargs["doc_id"]
        assert doc_id == "profile_NVDA"

    def test_handles_yfinance_exception_gracefully(self):
        svc = self._make_ready_svc()
        mock_yf_module = MagicMock()
        mock_yf_module.Ticker = MagicMock(side_effect=Exception("network error"))
        with patch.dict("sys.modules", {"yfinance": mock_yf_module}):
            svc.ingest_company_profile("NVDA")  # should not raise
        svc.ingest.assert_not_called()

    def test_market_cap_formatted_as_billions(self):
        svc = self._make_ready_svc()
        with patch.dict("sys.modules", self._mock_yf(self._make_yf_info())):
            svc.ingest_company_profile("NVDA")
        text = svc.ingest.call_args.kwargs["text"]
        assert "$1000.0B" in text

    def test_marks_ticker_as_ingested(self):
        svc = self._make_ready_svc()
        with patch.dict("sys.modules", self._mock_yf(self._make_yf_info())):
            svc.ingest_company_profile("AAPL")
        assert "AAPL" in svc._ingested_tickers


# ─── RAGService.ingest_news_articles ─────────────────────────────────────────

class TestIngestNewsArticles:
    def _make_ready_svc(self):
        svc = RAGService()
        svc._ready = True
        svc._db_url = "postgresql://localhost/test"
        svc._model = MagicMock()
        svc._model.encode.return_value = MagicMock(tolist=MagicMock(return_value=[0.0] * 384))
        svc.ingest = MagicMock()
        return svc

    def test_skips_articles_without_title(self):
        svc = self._make_ready_svc()
        svc._init = MagicMock(return_value=True)
        svc.ingest_news_articles("NVDA", [{"title": "", "content": "body", "url": "http://example.com"}])
        svc.ingest.assert_not_called()

    def test_ingests_each_article(self):
        svc = self._make_ready_svc()
        svc._init = MagicMock(return_value=True)
        articles = [
            {"title": "NVDA up", "content": "body1", "url": "http://example.com/1"},
            {"title": "NVDA Q4", "content": "body2", "url": "http://example.com/2"},
        ]
        svc.ingest_news_articles("NVDA", articles)
        assert svc.ingest.call_count == 2

    def test_doc_id_uses_url_hash(self):
        svc = self._make_ready_svc()
        svc._init = MagicMock(return_value=True)
        import hashlib
        url = "http://example.com/article1"
        expected_hash = hashlib.md5(url.encode()).hexdigest()[:16]
        svc.ingest_news_articles("NVDA", [{"title": "NVDA rises", "content": "c", "url": url}])
        doc_id = svc.ingest.call_args.kwargs["doc_id"]
        assert doc_id == f"news_{expected_hash}"

    def test_doc_id_uses_title_when_no_url(self):
        svc = self._make_ready_svc()
        svc._init = MagicMock(return_value=True)
        title = "NVDA rises again"
        svc.ingest_news_articles("NVDA", [{"title": title, "content": "c", "url": ""}])
        import hashlib
        expected_hash = hashlib.md5(title.encode()).hexdigest()[:16]
        doc_id = svc.ingest.call_args.kwargs["doc_id"]
        assert doc_id == f"news_{expected_hash}"

    def test_skips_when_not_initialized(self):
        svc = RAGService()
        svc._init = MagicMock(return_value=False)
        svc.ingest = MagicMock()
        svc.ingest_news_articles("NVDA", [{"title": "NVDA", "content": "c", "url": "http://example.com"}])
        svc.ingest.assert_not_called()

    def test_content_uses_summary_as_fallback(self):
        svc = self._make_ready_svc()
        svc._init = MagicMock(return_value=True)
        svc.ingest_news_articles("NVDA", [{"title": "NVDA", "summary": "summary text", "url": "http://x.com"}])
        text = svc.ingest.call_args.kwargs["text"]
        assert "summary text" in text

    def test_ticker_uppercased(self):
        svc = self._make_ready_svc()
        svc._init = MagicMock(return_value=True)
        svc.ingest_news_articles("nvda", [{"title": "NVDA up", "content": "c", "url": "http://x.com"}])
        meta = svc.ingest.call_args.kwargs["metadata"]
        assert meta["ticker"] == "NVDA"


# ─── RAGService.retrieve ──────────────────────────────────────────────────────

class TestRetrieve:
    def _make_ready_svc(self):
        svc = RAGService()
        svc._ready = True
        svc._db_url = "postgresql://localhost/test"
        svc._model = MagicMock()
        svc._model.encode.return_value = MagicMock(tolist=MagicMock(return_value=[0.1] * 384))
        return svc

    def _make_conn_mock(self, rows):
        conn = MagicMock()
        conn.__enter__ = MagicMock(return_value=conn)
        conn.__exit__ = MagicMock(return_value=False)
        conn.execute.return_value.fetchall.return_value = rows
        return conn

    def test_returns_empty_when_not_ready(self):
        svc = RAGService()
        svc._init = MagicMock(return_value=False)
        result = svc.retrieve("test query")
        assert result == []

    def test_returns_top_k_results(self):
        svc = self._make_ready_svc()
        rows = [("content text", "news", "reuters.com", "AAPL")]
        conn = self._make_conn_mock(rows)
        with patch("psycopg.connect", return_value=conn):
            result = svc.retrieve("AAPL earnings", ticker="AAPL", top_k=4)
        assert len(result) == 1
        assert result[0]["text"] == "content text"
        assert result[0]["meta"]["doc_type"] == "news"

    def test_ticker_specific_search_used_when_provided(self):
        svc = self._make_ready_svc()
        conn = self._make_conn_mock([("text", "news", "src", "NVDA")])
        with patch("psycopg.connect", return_value=conn):
            svc.retrieve("query", ticker="NVDA")
        # The executed SQL should include WHERE ticker = %s
        execute_args = conn.execute.call_args[0]
        assert "ticker" in execute_args[0]

    def test_global_search_when_no_ticker(self):
        svc = self._make_ready_svc()
        conn = self._make_conn_mock([("text", "news", "src", "AAPL")])
        with patch("psycopg.connect", return_value=conn):
            svc.retrieve("query")
        execute_args = conn.execute.call_args[0]
        assert "WHERE" not in execute_args[0]

    def test_fallback_to_global_when_ticker_returns_nothing(self):
        svc = self._make_ready_svc()
        conn = MagicMock()
        conn.__enter__ = MagicMock(return_value=conn)
        conn.__exit__ = MagicMock(return_value=False)
        # First call (ticker-specific) returns empty; second (global) returns results
        conn.execute.return_value.fetchall.side_effect = [
            [],  # ticker-specific: empty
            [("global text", "news", "src", "NVDA")],  # global fallback
        ]
        with patch("psycopg.connect", return_value=conn):
            result = svc.retrieve("query", ticker="NVDA")
        assert len(result) == 1
        assert result[0]["text"] == "global text"

    def test_handles_db_exception_gracefully(self):
        svc = self._make_ready_svc()
        with patch("psycopg.connect", side_effect=Exception("db down")):
            result = svc.retrieve("query")
        assert result == []

    def test_meta_fields_mapped_correctly(self):
        svc = self._make_ready_svc()
        rows = [("some content", "company_profile", "yfinance", "TSLA")]
        conn = self._make_conn_mock(rows)
        with patch("psycopg.connect", return_value=conn):
            result = svc.retrieve("TSLA profile")
        meta = result[0]["meta"]
        assert meta["doc_type"] == "company_profile"
        assert meta["source"] == "yfinance"
        assert meta["ticker"] == "TSLA"


# ─── RAGService.format_context ────────────────────────────────────────────────

class TestFormatContext:
    def setup_method(self):
        self.svc = RAGService()

    def test_returns_empty_string_for_no_chunks(self):
        assert self.svc.format_context([]) == ""

    def test_includes_retrieved_context_header(self):
        chunks = [{"text": "NVIDIA is a GPU company.", "meta": {"doc_type": "profile", "source": "", "ticker": "NVDA"}}]
        result = self.svc.format_context(chunks)
        assert "Retrieved Financial Context" in result

    def test_includes_doc_type_label(self):
        chunks = [{"text": "Some news.", "meta": {"doc_type": "news", "source": "Reuters", "ticker": "AAPL"}}]
        result = self.svc.format_context(chunks)
        assert "[news: Reuters]" in result

    def test_source_omitted_when_empty(self):
        chunks = [{"text": "text", "meta": {"doc_type": "profile", "source": "", "ticker": "AAPL"}}]
        result = self.svc.format_context(chunks)
        assert "[profile]" in result

    def test_text_truncated_to_500_chars(self):
        long_text = "x" * 600
        chunks = [{"text": long_text, "meta": {"doc_type": "news", "source": "", "ticker": "AAPL"}}]
        result = self.svc.format_context(chunks)
        # The truncated text should be present, not the full 600
        assert "x" * 500 in result
        assert "x" * 501 not in result

    def test_multiple_chunks_all_included(self):
        chunks = [
            {"text": f"text{i}", "meta": {"doc_type": "news", "source": "", "ticker": "AAPL"}}
            for i in range(3)
        ]
        result = self.svc.format_context(chunks)
        for i in range(3):
            assert f"text{i}" in result

    def test_end_context_footer_present(self):
        chunks = [{"text": "content", "meta": {"doc_type": "news", "source": "", "ticker": "AAPL"}}]
        result = self.svc.format_context(chunks)
        assert "End Context" in result
