"""
RAG (Retrieval Augmented Generation) service.
Stores and retrieves financial documents using ChromaDB + sentence-transformers.
Documents are ingested lazily (on first ticker query) and retrieved to enrich
Groq chat responses with company-specific knowledge.
"""

import logging
import os
import hashlib
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_PERSIST_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "rag_data")
_MODEL_NAME = "all-MiniLM-L6-v2"  # 22 MB, 384-dim, fast


class RAGService:
    def __init__(self, persist_dir: str = _PERSIST_DIR):
        self._persist_dir = persist_dir
        self._client = None
        self._collection = None
        self._ingested_tickers: set[str] = set()

    def _init(self):
        """Lazy-init ChromaDB and embedding function (avoids slow startup)."""
        if self._collection is not None:
            return
        try:
            import chromadb
            from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

            os.makedirs(self._persist_dir, exist_ok=True)
            self._client = chromadb.PersistentClient(path=self._persist_dir)
            ef = SentenceTransformerEmbeddingFunction(model_name=_MODEL_NAME)
            self._collection = self._client.get_or_create_collection(
                name="rylo_financial",
                embedding_function=ef,
                metadata={"hnsw:space": "cosine"},
            )
            logger.info(f"RAG collection ready — {self._collection.count()} docs")
        except Exception as e:
            logger.warning(f"RAG init failed (will skip RAG): {e}")

    # ── Ingestion ─────────────────────────────────────────────────────────────

    def ingest(self, doc_id: str, text: str, metadata: dict | None = None) -> None:
        self._init()
        if self._collection is None:
            return
        try:
            self._collection.upsert(
                ids=[doc_id],
                documents=[text],
                metadatas=[metadata or {}],
            )
        except Exception as e:
            logger.warning(f"RAG ingest failed for {doc_id}: {e}")

    def ingest_company_profile(self, ticker: str, fmp_service) -> None:
        """Fetch company profile from FMP and store as a RAG document."""
        ticker = ticker.upper()
        if ticker in self._ingested_tickers:
            return
        try:
            data = fmp_service._get(f"profile/{ticker}")
            if not isinstance(data, list) or not data:
                return
            p = data[0]
            text = (
                f"{p.get('companyName', ticker)} ({ticker}) — {p.get('exchange', '')}\n"
                f"Sector: {p.get('sector', 'N/A')} | Industry: {p.get('industry', 'N/A')}\n"
                f"Market Cap: ${p.get('mktCap', 0)/1e9:.1f}B | "
                f"P/E: {p.get('pe', 'N/A')} | Beta: {p.get('beta', 'N/A')}\n"
                f"CEO: {p.get('ceo', 'N/A')} | Employees: {p.get('fullTimeEmployees', 'N/A')}\n"
                f"HQ: {p.get('city', '')}, {p.get('country', '')}\n\n"
                f"Description: {p.get('description', '')}"
            )
            self.ingest(
                doc_id=f"profile_{ticker}",
                text=text,
                metadata={"ticker": ticker, "doc_type": "company_profile",
                          "ingested_at": datetime.now(timezone.utc).isoformat()},
            )
            self._ingested_tickers.add(ticker)
            logger.info(f"Ingested company profile for {ticker}")
        except Exception as e:
            logger.warning(f"Profile ingest failed for {ticker}: {e}")

    def ingest_news_articles(self, ticker: str, articles: list[dict]) -> None:
        """Ingest a list of news articles (title + content) for a ticker."""
        self._init()
        ticker = ticker.upper()
        for article in articles:
            title = article.get("title", "").strip()
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
        """
        Return the top_k most relevant document chunks for a query.
        If ticker is set, prefer ticker-specific docs but fall back to all.
        """
        self._init()
        if self._collection is None or self._collection.count() == 0:
            return []
        try:
            where = {"ticker": ticker.upper()} if ticker else None
            results = self._collection.query(
                query_texts=[query],
                n_results=min(top_k, self._collection.count()),
                where=where,
            )
            docs = results.get("documents", [[]])[0]
            metas = results.get("metadatas", [[]])[0]
            return [{"text": d, "meta": m} for d, m in zip(docs, metas)]
        except Exception as e:
            logger.warning(f"RAG retrieve failed: {e}")
            return []

    def format_context(self, chunks: list[dict]) -> str:
        """Format retrieved chunks into a compact context string for the LLM."""
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
