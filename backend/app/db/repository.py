"""
Repository helpers for persisting runtime sentiment/confidence data.
"""

from sqlalchemy.exc import SQLAlchemyError

from app.db.models import ConfidenceScore, SentimentSnapshot
from app.db.session import SessionLocal
from app.models.confidence import ConfidenceResult
from app.models.sentiment import SentimentSignal


def save_sentiment_snapshot(signal: SentimentSignal, source: str = "stocktwits") -> None:
    db = SessionLocal()
    try:
        total = signal.total_posts or 0
        bullish_ratio = (signal.bullish_count / total) if total else 0.0
        bearish_ratio = (signal.bearish_count / total) if total else 0.0
        neutral_ratio = (signal.neutral_count / total) if total else 0.0

        row = SentimentSnapshot(
            ticker=signal.ticker.upper(),
            score=float(signal.score),
            bullish_ratio=float(bullish_ratio),
            bearish_ratio=float(bearish_ratio),
            neutral_ratio=float(neutral_ratio),
            total_posts=int(total),
            source=source,
            captured_at=signal.fetched_at,
        )
        db.add(row)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()


def save_confidence_score(result: ConfidenceResult, model_version: str = "v1") -> None:
    db = SessionLocal()
    try:
        row = ConfidenceScore(
            ticker=result.ticker.upper(),
            horizon_days=int(result.horizon),
            direction=result.direction,
            confidence=float(result.confidence),
            expected_move_pct=float(result.expected_move_pct) if result.expected_move_pct is not None else None,
            model_mode=result.model_mode,
            model_version=model_version,
            brier_score=float(result.brier_score) if result.brier_score is not None else None,
            top_drivers=[d.model_dump() for d in result.top_drivers],
            feature_snapshot=result.features.model_dump(),
            created_at=result.fetched_at,
        )
        db.add(row)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()
