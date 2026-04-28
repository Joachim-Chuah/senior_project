"""Create initial database schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-04-28
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "instruments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("company_name", sa.String(length=255), nullable=True),
        sa.Column("exchange", sa.String(length=64), nullable=True),
        sa.Column("sector", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_instruments_id"), "instruments", ["id"], unique=False)
    op.create_index(op.f("ix_instruments_ticker"), "instruments", ["ticker"], unique=True)

    op.create_table(
        "sentiment_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("bullish_ratio", sa.Float(), nullable=False),
        sa.Column("bearish_ratio", sa.Float(), nullable=False),
        sa.Column("neutral_ratio", sa.Float(), nullable=False),
        sa.Column("total_posts", sa.Integer(), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sentiment_snapshots_captured_at"), "sentiment_snapshots", ["captured_at"], unique=False)
    op.create_index(op.f("ix_sentiment_snapshots_id"), "sentiment_snapshots", ["id"], unique=False)
    op.create_index(op.f("ix_sentiment_snapshots_ticker"), "sentiment_snapshots", ["ticker"], unique=False)

    op.create_table(
        "market_snapshots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("price", sa.Float(), nullable=True),
        sa.Column("change_pct", sa.Float(), nullable=True),
        sa.Column("volume", sa.Float(), nullable=True),
        sa.Column("vix", sa.Float(), nullable=True),
        sa.Column("payload", sa.JSON(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_market_snapshots_captured_at"), "market_snapshots", ["captured_at"], unique=False)
    op.create_index(op.f("ix_market_snapshots_id"), "market_snapshots", ["id"], unique=False)
    op.create_index(op.f("ix_market_snapshots_ticker"), "market_snapshots", ["ticker"], unique=False)

    op.create_table(
        "confidence_scores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ticker", sa.String(length=16), nullable=False),
        sa.Column("horizon_days", sa.Integer(), nullable=False),
        sa.Column("direction", sa.String(length=8), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("expected_move_pct", sa.Float(), nullable=True),
        sa.Column("model_mode", sa.String(length=32), nullable=False),
        sa.Column("model_version", sa.String(length=64), nullable=False),
        sa.Column("brier_score", sa.Float(), nullable=True),
        sa.Column("top_drivers", sa.JSON(), nullable=True),
        sa.Column("feature_snapshot", sa.JSON(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_confidence_scores_created_at"), "confidence_scores", ["created_at"], unique=False)
    op.create_index(op.f("ix_confidence_scores_id"), "confidence_scores", ["id"], unique=False)
    op.create_index(op.f("ix_confidence_scores_ticker"), "confidence_scores", ["ticker"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_confidence_scores_ticker"), table_name="confidence_scores")
    op.drop_index(op.f("ix_confidence_scores_id"), table_name="confidence_scores")
    op.drop_index(op.f("ix_confidence_scores_created_at"), table_name="confidence_scores")
    op.drop_table("confidence_scores")

    op.drop_index(op.f("ix_market_snapshots_ticker"), table_name="market_snapshots")
    op.drop_index(op.f("ix_market_snapshots_id"), table_name="market_snapshots")
    op.drop_index(op.f("ix_market_snapshots_captured_at"), table_name="market_snapshots")
    op.drop_table("market_snapshots")

    op.drop_index(op.f("ix_sentiment_snapshots_ticker"), table_name="sentiment_snapshots")
    op.drop_index(op.f("ix_sentiment_snapshots_id"), table_name="sentiment_snapshots")
    op.drop_index(op.f("ix_sentiment_snapshots_captured_at"), table_name="sentiment_snapshots")
    op.drop_table("sentiment_snapshots")

    op.drop_index(op.f("ix_instruments_ticker"), table_name="instruments")
    op.drop_index(op.f("ix_instruments_id"), table_name="instruments")
    op.drop_table("instruments")
