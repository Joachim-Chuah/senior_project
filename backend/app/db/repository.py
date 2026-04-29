"""
Repository helpers for persisting runtime sentiment/market/confidence data.
"""

from typing import Any

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import select

from app.db.models import ConfidenceScore, Instrument, MarketSnapshot, SentimentSnapshot
from app.db.session import SessionLocal
from app.models.confidence import ConfidenceResult
from app.models.market import MarketMover, MarketQuote
from app.models.sentiment import SentimentSignal


def upsert_instrument(
    ticker: str,
    company_name: str | None = None,
    exchange: str | None = None,
    sector: str | None = None,
) -> None:
    if not ticker:
        return
    db = SessionLocal()
    try:
        normalized_ticker = ticker.upper()
        existing = db.execute(
            select(Instrument).where(Instrument.ticker == normalized_ticker)
        ).scalar_one_or_none()

        if existing is None:
            existing = Instrument(ticker=normalized_ticker)
            db.add(existing)

        if company_name:
            existing.company_name = company_name
        if exchange:
            existing.exchange = exchange
        if sector:
            existing.sector = sector

        db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()


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


def save_market_snapshot(
    ticker: str,
    *,
    price: float | None,
    change_pct: float | None,
    volume: float | None = None,
    vix: float | None = None,
    payload: dict[str, Any] | None = None,
) -> None:
    if not ticker:
        return
    db = SessionLocal()
    try:
        row = MarketSnapshot(
            ticker=ticker.upper(),
            price=price,
            change_pct=change_pct,
            volume=volume,
            vix=vix,
            payload=payload,
        )
        db.add(row)
        db.commit()
    except SQLAlchemyError:
        db.rollback()
    finally:
        db.close()


def save_market_quotes(quotes: list[MarketQuote | MarketMover], *, category: str) -> None:
    for quote in quotes:
        payload = quote.model_dump()
        ticker = payload.get("symbol") or payload.get("ticker") or ""
        if not ticker:
            continue
        upsert_instrument(ticker=ticker, company_name=payload.get("name"))
        save_market_snapshot(
            ticker,
            price=payload.get("price"),
            change_pct=payload.get("changesPercentage"),
            volume=payload.get("volume"),
            payload={"category": category, **payload},
        )


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
