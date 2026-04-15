"""
FinBERT Service — financial text sentiment classification.

Uses ProsusAI/finbert (a BERT model fine-tuned on financial text) to classify
post bodies as Bullish / Bearish / Neutral.  The HuggingFace pipeline is loaded
lazily on first use and stored as a class-level singleton so all
StockTwitsService instances share one copy in memory.
"""

import logging
from typing import List

logger = logging.getLogger(__name__)

_LABEL_MAP = {
    "positive": "Bullish",
    "negative": "Bearish",
    "neutral":  "Neutral",
}


class FinBERTService:
    _pipeline = None  # shared across all instances

    def _load(self):
        if FinBERTService._pipeline is None:
            logger.info("Loading FinBERT model (first-time load, ~500 MB)...")
            from transformers import pipeline as hf_pipeline
            FinBERTService._pipeline = hf_pipeline(
                "text-classification",
                model="ProsusAI/finbert",
                tokenizer="ProsusAI/finbert",
                device=-1,        # CPU
                truncation=True,
                max_length=512,
            )
            logger.info("FinBERT model loaded.")
        return FinBERTService._pipeline

    def classify_texts(self, texts: List[str]) -> List[str]:
        """
        Classify a batch of financial texts.

        Returns a list of 'Bullish', 'Bearish', or 'Neutral' per text.
        Falls back to 'Neutral' for any individual failure.
        """
        if not texts:
            return []
        try:
            pipe = self._load()
            results = pipe(texts)
            return [_LABEL_MAP.get(r["label"], "Neutral") for r in results]
        except Exception as e:
            logger.warning(f"FinBERT classification failed: {e}")
            return ["Neutral"] * len(texts)
