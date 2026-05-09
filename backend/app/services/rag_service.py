"""
RAG (Retrieval Augmented Generation) service.
Stores and retrieves financial documents using pgvector on the existing
PostgreSQL database — persists across Render deploys with no extra service.
"""

import json
import logging
import hashlib
import os
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_MODEL_NAME = "all-MiniLM-L6-v2"  # 384-dim, 22 MB, fast
_EMBEDDING_DIM = 384

_DDL = """
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
    id        SERIAL PRIMARY KEY,
    doc_id    TEXT UNIQUE NOT NULL,
    ticker    TEXT,
    doc_type  TEXT,
    content   TEXT NOT NULL,
    source    TEXT DEFAULT '',
    metadata  JSONB DEFAULT '{}',
    embedding vector(384),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rag_doc_embedding_idx
ON rag_documents USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS rag_doc_ticker_idx
ON rag_documents (ticker);
"""


def _vec(embedding: list[float]) -> str:
    """Convert a float list to pgvector literal string."""
    return "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"


class RAGService:
    def __init__(self):
        self._model = None
        self._db_url: str = ""
        self._ready = False
        self._ingested_tickers: set[str] = set()

    def _init(self) -> bool:
        """Lazy-init: load embedding model and ensure DB table exists."""
        if self._ready:
            return True
        try:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(_MODEL_NAME)

            from dotenv import load_dotenv
            load_dotenv()
            self._db_url = os.environ.get("DATABASE_URL", "")
            if not self._db_url:
                logger.warning("DATABASE_URL not set — RAG disabled")
                return False

            import psycopg
            with psycopg.connect(self._db_url, autocommit=True) as conn:
                conn.execute(_DDL)

            self._ready = True
            logger.info("RAG service ready (pgvector)")
            return True
        except Exception as e:
            logger.warning(f"RAG init failed (will skip RAG): {e}")
            return False

    def _embed(self, text: str) -> list[float]:
        return self._model.encode(text, normalize_embeddings=True).tolist()

    # ── Ingestion ─────────────────────────────────────────────────────────────

    def ingest(self, doc_id: str, text: str, metadata: dict | None = None) -> None:
        if not self._init():
            return
        try:
            import psycopg
            embedding = self._embed(text)
            meta = metadata or {}
            with psycopg.connect(self._db_url) as conn:
                conn.execute(
                    """
                    INSERT INTO rag_documents
                        (doc_id, ticker, doc_type, content, source, metadata, embedding)
                    VALUES (%s, %s, %s, %s, %s, %s, %s::vector)
                    ON CONFLICT (doc_id) DO UPDATE SET
                        content   = EXCLUDED.content,
                        embedding = EXCLUDED.embedding,
                        metadata  = EXCLUDED.metadata,
                        created_at = NOW()
                    """,
                    (
                        doc_id,
                        meta.get("ticker", ""),
                        meta.get("doc_type", ""),
                        text,
                        meta.get("source", ""),
                        json.dumps(meta),
                        _vec(embedding),
                    ),
                )
                conn.commit()
        except Exception as e:
            logger.warning(f"RAG ingest failed for {doc_id}: {e}")

    def ingest_company_profile(self, ticker: str, fmp_service=None) -> None:
        """Fetch company profile via yfinance and store as a RAG document."""
        ticker = ticker.upper()
        if ticker in self._ingested_tickers:
            return
        try:
            import yfinance as yf
            info = yf.Ticker(ticker).info
            if not info or not info.get("longName"):
                return
            mkt_cap = info.get("marketCap", 0)
            mkt_cap_str = f"${mkt_cap/1e9:.1f}B" if mkt_cap else "N/A"
            officers = info.get("companyOfficers") or []
            ceo = officers[0].get("name", "N/A") if officers else "N/A"
            text = (
                f"{info.get('longName', ticker)} ({ticker}) — {info.get('exchange', '')}\n"
                f"Sector: {info.get('sector', 'N/A')} | Industry: {info.get('industry', 'N/A')}\n"
                f"Market Cap: {mkt_cap_str} | "
                f"P/E (trailing): {info.get('trailingPE', 'N/A')} | "
                f"Beta: {info.get('beta', 'N/A')}\n"
                f"52w High: {info.get('fiftyTwoWeekHigh', 'N/A')} | "
                f"52w Low: {info.get('fiftyTwoWeekLow', 'N/A')}\n"
                f"CEO: {ceo} | Employees: {info.get('fullTimeEmployees', 'N/A')} | "
                f"HQ: {info.get('city', '')}, {info.get('country', '')}\n\n"
                f"Description: {info.get('longBusinessSummary', '')}"
            )
            self.ingest(
                doc_id=f"profile_{ticker}",
                text=text,
                metadata={"ticker": ticker, "doc_type": "company_profile",
                          "ingested_at": datetime.now(timezone.utc).isoformat()},
            )
            self._ingested_tickers.add(ticker)
            logger.info(f"RAG: ingested company profile for {ticker}")
        except Exception as e:
            logger.warning(f"RAG profile ingest failed for {ticker}: {e}")

    def ingest_news_articles(self, ticker: str, articles: list[dict]) -> None:
        """Ingest news articles (title + content) tagged to a ticker."""
        if not self._init():
            return
        ticker = ticker.upper()
        for article in articles:
            title = (article.get("title") or "").strip()
            content = article.get("content") or article.get("summary") or ""
            if not title:
                continue
            text = f"{title}\n{content[:400]}"
            doc_id = "news_" + hashlib.md5(
                (article.get("url") or title).encode()
            ).hexdigest()[:16]
            self.ingest(
                doc_id=doc_id,
                text=text,
                metadata={"ticker": ticker, "doc_type": "news",
                          "source": article.get("source", ""),
                          "ingested_at": datetime.now(timezone.utc).isoformat()},
            )

    # ── Retrieval ─────────────────────────────────────────────────────────────

    def retrieve(
        self,
        query: str,
        ticker: Optional[str] = None,
        top_k: int = 4,
    ) -> list[dict]:
        """Return the top_k most relevant chunks for a query."""
        if not self._init():
            return []
        try:
            import psycopg
            embedding = self._embed(query)
            vec = _vec(embedding)

            with psycopg.connect(self._db_url) as conn:
                if ticker:
                    rows = conn.execute(
                        """
                        SELECT content, doc_type, source, ticker
                        FROM rag_documents
                        WHERE ticker = %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s
                        """,
                        (ticker.upper(), vec, top_k),
                    ).fetchall()
                    # If ticker-specific search returned nothing, fall back to global
                    if not rows:
                        rows = conn.execute(
                            "SELECT content, doc_type, source, ticker "
                            "FROM rag_documents ORDER BY embedding <=> %s::vector LIMIT %s",
                            (vec, top_k),
                        ).fetchall()
                else:
                    rows = conn.execute(
                        "SELECT content, doc_type, source, ticker "
                        "FROM rag_documents ORDER BY embedding <=> %s::vector LIMIT %s",
                        (vec, top_k),
                    ).fetchall()

            return [
                {"text": r[0], "meta": {"doc_type": r[1], "source": r[2], "ticker": r[3]}}
                for r in rows
            ]
        except Exception as e:
            logger.warning(f"RAG retrieve failed: {e}")
            return []

    def format_context(self, chunks: list[dict]) -> str:
        """Format retrieved chunks into a compact context block for the LLM."""
        if not chunks:
            return ""
        lines = ["\n\n--- Retrieved Financial Context ---"]
        for chunk in chunks:
            doc_type = chunk["meta"].get("doc_type", "doc")
            source = chunk["meta"].get("source", "")
            label = f"[{doc_type}{': ' + source if source else ''}]"
            lines.append(f"{label} {chunk['text'][:500]}")
        lines.append("--- End Context ---")
        return "\n".join(lines)
