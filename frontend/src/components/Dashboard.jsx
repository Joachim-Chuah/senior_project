import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, MessageCircle, Users, RefreshCw, ArrowLeft, Newspaper, BrainCircuit, Sparkles, Star, StarOff, X, Info, ChevronRight } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errorHandler';
import TickerSearch from './TickerSearch';

// ─── Signal config ────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
    bullish: {
        bg:     'rgba(22,163,74,0.08)',
        border: 'rgba(22,163,74,0.3)',
        color:  '#16a34a',
        bar:    '#22c55e',
        icon:   TrendingUp,
        label:  'Bullish',
    },
    bearish: {
        bg:     'rgba(220,38,38,0.08)',
        border: 'rgba(220,38,38,0.3)',
        color:  '#dc2626',
        bar:    '#ef4444',
        icon:   TrendingDown,
        label:  'Bearish',
    },
    neutral: {
        bg:     'rgba(217,119,6,0.08)',
        border: 'rgba(217,119,6,0.3)',
        color:  '#d97706',
        bar:    '#f59e0b',
        icon:   Minus,
        label:  'Neutral',
    },
};

// ─── Overview grid card ───────────────────────────────────────────────────────

const SentimentCard = ({ item, onClick }) => {
    const cfg = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.neutral;
    const Icon = cfg.icon;
    const bullPct = item.total_posts > 0 ? Math.round((item.bullish_count / item.total_posts) * 100) : 0;
    const bearPct = item.total_posts > 0 ? Math.round((item.bearish_count / item.total_posts) * 100) : 0;

    return (
        <button
            onClick={() => onClick(item.ticker)}
            className="w-full text-left rounded-xl p-4 transition-all theme-transition"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-sm font-bold t-primary font-mono">{item.ticker}</p>
                    <p className="text-xs t-muted mt-0.5 truncate max-w-[120px]" style={{ opacity: 0.6 }}>
                        {item.company_name !== item.ticker ? item.company_name : ''}
                    </p>
                </div>
                <span
                    className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                >
                    <Icon size={11} />
                    {cfg.label}
                </span>
            </div>

            {/* Bull/bear bar */}
            <div className="h-1.5 rounded-full overflow-hidden flex mb-2" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full transition-all" style={{ width: `${bullPct}%`, background: '#22c55e' }} />
                <div className="h-full transition-all" style={{ width: `${bearPct}%`, background: '#ef4444' }} />
            </div>

            <div className="flex items-center justify-between text-xs">
                <span style={{ color: '#16a34a' }}>{bullPct}% bull</span>
                <span className="t-muted" style={{ opacity: 0.6 }}>{item.total_posts} posts</span>
                <span style={{ color: '#dc2626' }}>{bearPct}% bear</span>
            </div>

            {item.error && (
                <p className="text-xs t-muted mt-2 italic" style={{ opacity: 0.6 }}>Data unavailable</p>
            )}
        </button>
    );
};

// ─── Confidence breakdown modal ───────────────────────────────────────────────

const FEATURE_META = {
    sent_score: {
        label: 'Sentiment Score',
        weight: 0.30,
        range: [-1, 1],
        how: 'Counts bullish- and bearish-tagged posts from StockTwits, then normalises: (bulls − bears) ÷ total. Ranges from −1 (fully bearish) to +1 (fully bullish). This is the single strongest input — it directly measures what retail traders think right now.',
    },
    sent_change: {
        label: 'Sentiment Momentum',
        weight: 0.15,
        range: [-1, 1],
        how: 'Current sentiment score minus the rolling average of the last 5 readings for this ticker. Positive = sentiment is accelerating bullish vs. its recent baseline. Captures trend in crowd opinion, not just the level.',
    },
    recent_return_5d: {
        label: '5-Day Price Return',
        weight: 0.20,
        range: [-0.1, 0.1],
        how: '(Close today − Close 5 days ago) ÷ Close 5 days ago. Fetched live from yfinance. Checks whether price momentum agrees with sentiment — when both are bullish, conviction is higher.',
    },
    market_regime: {
        label: 'Market Regime',
        weight: 0.15,
        range: [-1, 1],
        how: 'Combines SPY\'s 5-day return with the current VIX level. Bullish (+1) if SPY > +1% AND VIX < 20. Bearish (−1) if SPY < −1% OR VIX > 30. Neutral (0) otherwise. Reduces confidence in bullish signals during broad market stress.',
    },
    vrp_proxy: {
        label: 'Vol Risk Premium',
        weight: -0.10,
        range: [-0.2, 0.2],
        how: 'ATM implied volatility (from the nearest options expiry) minus 20-day realised volatility. A high VRP means the options market is pricing in more fear than recent price action justifies — a headwind for bulls. The negative weight means a high VRP pulls the confidence score down.',
    },
    sent_dispersion: {
        label: 'Sentiment Dispersion',
        weight: -0.10,
        range: [0, 1],
        how: 'Calculated as 1 − |sentiment score|. High when traders are split roughly 50/50 (score near 0), low when they agree strongly. The negative weight means high disagreement reduces confidence — a divided crowd is a less reliable signal.',
    },
};

function featureBar(value, range) {
    if (value === null || value === undefined) return null;
    const [min, max] = range;
    const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const neutral = ((0 - min) / (max - min)) * 100;
    const positive = value >= 0;
    return { pct, neutral, positive };
}

function formatFeatureValue(key, value) {
    if (value === null || value === undefined) return 'N/A';
    if (key === 'market_regime') return value > 0.3 ? 'Bullish' : value < -0.3 ? 'Bearish' : 'Neutral';
    if (key === 'sent_score' || key === 'sent_change' || key === 'sent_dispersion')
        return `${(value * 100).toFixed(1)}%`;
    if (key === 'recent_return_5d' || key === 'vrp_proxy')
        return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
    return value.toFixed(3);
}

const ConfidenceModal = ({ ticker, onClose }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        api.post('/confidence/analyze', { ticker, horizon: 5 })
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load confidence breakdown.'))
            .finally(() => setLoading(false));
    }, [ticker]);

    // Close on backdrop click
    function handleBackdrop(e) {
        if (e.target === e.currentTarget) onClose();
    }

    const cfg = data ? (SIGNAL_CONFIG[data.direction === 'up' ? 'bullish' : 'bearish'] || SIGNAL_CONFIG.neutral) : null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
            onClick={handleBackdrop}
        >
            <div
                className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl theme-transition"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <h2 className="text-base font-bold t-primary">Confidence Breakdown</h2>
                        <p className="text-xs t-muted mt-0.5">{ticker} · 5-day horizon</p>
                    </div>
                    <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg t-muted">
                        <X size={16} />
                    </button>
                </div>

                <div className="px-6 py-5 space-y-6">
                    {loading && (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
                        </div>
                    )}

                    {error && (
                        <p className="text-sm text-center t-muted py-6" style={{ opacity: 0.7 }}>{error}</p>
                    )}

                    {data && cfg && (
                        <>
                            {/* Score */}
                            <div
                                className="rounded-xl p-4 flex items-center justify-between"
                                style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                            >
                                <div className="flex items-center gap-3">
                                    <cfg.icon size={22} style={{ color: cfg.color }} />
                                    <div>
                                        <p className="text-lg font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                                        <p className="text-xs t-muted">Confidence {data.confidence}%</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {data.expected_move_pct !== null && (
                                        <p className="text-sm font-semibold t-primary">±{data.expected_move_pct}%</p>
                                    )}
                                    {data.expected_move_pct !== null && (
                                        <p className="text-xs t-muted">expected move</p>
                                    )}
                                </div>
                            </div>

                            {/* Model mode */}
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-xs px-2 py-1 rounded-lg font-medium"
                                    style={{
                                        background: data.model_mode === 'fitted' ? 'rgba(99,70,229,0.1)' : 'rgba(217,119,6,0.08)',
                                        border: data.model_mode === 'fitted' ? '1px solid rgba(99,70,229,0.3)' : '1px solid rgba(217,119,6,0.3)',
                                        color: data.model_mode === 'fitted' ? '#6346e5' : '#d97706',
                                    }}
                                >
                                    {data.model_mode === 'fitted' ? 'Fitted model' : 'Warming up'}
                                </span>
                                <p className="text-xs t-muted">
                                    {data.model_mode === 'fitted'
                                        ? `Logistic regression trained on historical outcomes${data.brier_score !== null ? ` · Brier score ${data.brier_score}` : ''}`
                                        : 'Using domain-knowledge weights — needs 30+ observations to fit'}
                                </p>
                            </div>

                            {/* Top drivers */}
                            {data.top_drivers.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-3">Top Drivers</p>
                                    <div className="space-y-2">
                                        {data.top_drivers.map((driver, i) => {
                                            const dCfg = SIGNAL_CONFIG[driver.direction] || SIGNAL_CONFIG.neutral;
                                            const DIcon = dCfg.icon;
                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                                >
                                                    <DIcon size={14} style={{ color: dCfg.color, flexShrink: 0 }} />
                                                    <p className="text-sm t-primary flex-1">{driver.label}</p>
                                                    <span
                                                        className="text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0"
                                                        style={{ background: dCfg.bg, color: dCfg.color }}
                                                    >
                                                        {driver.direction}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Feature breakdown */}
                            <div>
                                <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-3">Feature Inputs</p>
                                <div className="space-y-4">
                                    {Object.entries(FEATURE_META).map(([key, meta]) => {
                                        const value = data.features[key];
                                        const bar = featureBar(value, meta.range);
                                        const formatted = formatFeatureValue(key, value);
                                        const isPositive = value !== null && value !== undefined && value >= 0;
                                        const weightPct = `${meta.weight > 0 ? '+' : ''}${(meta.weight * 100).toFixed(0)}%`;
                                        const weightColor = meta.weight > 0 ? '#16a34a' : '#dc2626';

                                        return (
                                            <div
                                                key={key}
                                                className="rounded-xl p-3 space-y-2"
                                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                            >
                                                {/* Row: label + weight + value */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-semibold t-primary">{meta.label}</span>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span
                                                            className="text-xs font-mono px-1.5 py-0.5 rounded"
                                                            style={{ background: 'var(--surface-2)', color: weightColor, border: '1px solid var(--border)' }}
                                                            title="Model weight"
                                                        >
                                                            {weightPct} weight
                                                        </span>
                                                        <span
                                                            className="text-xs font-mono font-bold"
                                                            style={{ color: value === null || value === undefined ? 'var(--text-muted)' : isPositive ? '#16a34a' : '#dc2626' }}
                                                        >
                                                            {formatted}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Bar */}
                                                {bar ? (
                                                    <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: 'var(--surface-2)' }}>
                                                        <div
                                                            className="absolute top-0 h-full rounded-full"
                                                            style={{
                                                                left: `${Math.min(bar.pct, bar.neutral)}%`,
                                                                width: `${Math.abs(bar.pct - bar.neutral)}%`,
                                                                background: bar.positive ? '#22c55e' : '#ef4444',
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-1.5 rounded-full" style={{ background: 'var(--surface-2)' }} />
                                                )}

                                                {/* How it's calculated */}
                                                <p className="text-xs t-muted leading-relaxed" style={{ opacity: 0.75 }}>
                                                    {meta.how}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* How the score is computed */}
                            <div
                                className="rounded-xl p-4 space-y-2"
                                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                            >
                                <p className="text-xs font-semibold t-primary uppercase tracking-wider">How the Score is Computed</p>
                                <p className="text-xs t-muted leading-relaxed" style={{ opacity: 0.8 }}>
                                    Each feature is multiplied by its weight and summed into a raw score. That score is passed through a <span className="font-mono">sigmoid</span> function to produce a probability between 0 and 1, then scaled to 0–100%.
                                </p>
                                <p className="text-xs font-mono t-muted px-3 py-2 rounded-lg" style={{ background: 'var(--surface)', opacity: 0.8 }}>
                                    p = sigmoid( 3 × Σ(weight × feature) )
                                </p>
                                <p className="text-xs t-muted leading-relaxed" style={{ opacity: 0.8 }}>
                                    {data.model_mode === 'fitted'
                                        ? 'This ticker has enough historical observations to use a fitted logistic regression instead of the fixed weights above. The model was calibrated on real outcomes and its accuracy is measured by the Brier score (lower = better).'
                                        : 'Once 30+ price outcomes are recorded for this ticker, the fixed weights are replaced by a logistic regression fitted on real data. Until then, domain-knowledge weights are used.'}
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Detail view sub-components ───────────────────────────────────────────────

const SentimentBadge = ({ signal, score, onClick }) => {
    const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral;
    const Icon = cfg.icon;
    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-xl p-5 flex items-center gap-4 transition-opacity"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
            <Icon size={26} style={{ color: cfg.color }} />
            <div className="flex-1">
                <p className="text-xl font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-xs t-muted mt-0.5">
                    Confidence {(Math.abs(score) * 100).toFixed(0)}%
                </p>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: cfg.color, opacity: 0.7 }}>
                <span>Breakdown</span>
                <ChevronRight size={13} />
            </div>
        </button>
    );
};

const PostCard = ({ post, type }) => {
    const isBull = type === 'bullish';
    const dotColor  = isBull ? '#22c55e' : '#ef4444';
    const badgeColor = isBull ? '#16a34a' : '#dc2626';
    const badgeBorder = isBull ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)';

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const diffMins = Math.floor((Date.now() - date) / 60000);
        const diffHours = Math.floor(diffMins / 60);
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return date.toLocaleDateString();
    };

    const initials = post.username ? post.username.slice(0, 2).toUpperCase() : '??';

    return (
        <div
            className="py-3 px-4 transition-colors"
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}
        >
            <div className="flex items-start gap-3">
                {post.avatar_url ? (
                    <img src={post.avatar_url} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                ) : (
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--surface-2)' }}
                    >
                        <span className="t-primary text-xs font-semibold">{initials}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                        <span className="text-sm font-medium t-primary truncate">@{post.username}</span>
                        <span
                            className="text-xs px-1.5 py-0.5 rounded ml-auto flex-shrink-0"
                            style={{ border: `1px solid ${badgeBorder}`, color: badgeColor }}
                        >
                            {isBull ? 'Bull' : 'Bear'}
                        </span>
                    </div>
                    <p className="text-sm t-muted leading-relaxed line-clamp-3">{post.body}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs t-muted">
                        <span>{formatTime(post.created_at)}</span>
                        <span className="flex items-center gap-1"><Users size={10} />{(post.followers ?? 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── News feed ───────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const NewsFeed = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/sentiment/news?limit=30')
            .then(res => setNews(res.data))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Newspaper size={14} style={{ color: 'var(--text-muted)' }} />
                <h3 className="text-sm font-semibold t-primary">Financial News</h3>
                <span className="ml-auto text-xs t-muted">Yahoo Finance · MarketWatch · Reuters</span>
            </div>
            {loading ? (
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-4 rounded skeleton" style={{ width: `${70 + (i % 3) * 10}%` }} />
                    ))}
                </div>
            ) : news.length === 0 ? (
                <p className="text-sm t-muted text-center py-8" style={{ opacity: 0.6 }}>No news available</p>
            ) : (
                <div>
                    {news.map((item, i) => (
                        <a
                            key={i}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-3 py-3 -mx-2 px-2 rounded-lg transition-colors"
                            style={{ borderBottom: '1px solid var(--border)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = ''}
                        >
                            <div className="flex-1 min-w-0">
                                <p className="text-sm t-primary font-medium leading-snug line-clamp-2">
                                    {item.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1 text-xs t-muted">
                                    <span>{item.source}</span>
                                    <span>·</span>
                                    <span>{timeAgo(item.publishedDate)}</span>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Overview view ────────────────────────────────────────────────────────────

const OverviewPanel = ({ onSelectTicker, navigateTo, watchlist = [], removeFromWatchlist }) => {
    const [overview, setOverview] = useState([]);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewError, setOverviewError] = useState(null);

    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        setOverviewError(null);
        try {
            const res = await api.get('/sentiment/overview');
            setOverview(res.data);
        } catch {
            setOverviewError('Failed to load market sentiment.');
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <header
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <div>
                    <h2 className="text-3xl font-bold gradient-text">Sentiment Dashboard</h2>
                    <p className="t-muted mt-1 text-sm">Market sentiment via StockTwits</p>
                </div>
                <div className="flex items-center gap-2">
                    <TickerSearch onSelect={onSelectTicker} />
                    <button
                        type="button"
                        onClick={fetchOverview}
                        disabled={overviewLoading}
                        className="btn-ghost t-muted p-2 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={15} className={overviewLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {watchlist.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs t-muted flex items-center gap-1" style={{ opacity: 0.6 }}>
                        <Star size={11} />
                        Watchlist
                    </span>
                    {watchlist.map(ticker => (
                        <button
                            key={ticker}
                            onClick={() => onSelectTicker(ticker)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-colors theme-transition"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            {ticker}
                        </button>
                    ))}
                </div>
            )}

            {overviewError && (
                <div
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                    <AlertCircle size={17} style={{ color: '#dc2626' }} className="flex-shrink-0" />
                    <p className="text-sm" style={{ color: '#dc2626' }}>{overviewError}</p>
                </div>
            )}

            {/* Aggregate sentiment bar */}
            {!overviewLoading && overview.length > 0 && (() => {
                const totalBull    = overview.reduce((s, i) => s + (i.bullish_count  || 0), 0);
                const totalBear    = overview.reduce((s, i) => s + (i.bearish_count  || 0), 0);
                const totalNeutral = overview.reduce((s, i) => s + (i.neutral_count  || 0), 0);
                const total        = totalBull + totalBear + totalNeutral || 1;
                const bullPct      = Math.round((totalBull    / total) * 100);
                const bearPct      = Math.round((totalBear    / total) * 100);
                const neutralPct   = 100 - bullPct - bearPct;
                const mood         = bullPct > bearPct + 10 ? 'Bullish' : bearPct > bullPct + 10 ? 'Bearish' : 'Mixed';
                const moodColor    = mood === 'Bullish' ? '#16a34a' : mood === 'Bearish' ? '#dc2626' : '#d97706';
                return (
                    <div
                        className="rounded-xl px-4 py-3 space-y-2 theme-transition"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                    >
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold t-muted">Overall Market Mood</span>
                            <span className="font-bold" style={{ color: moodColor }}>{mood}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex">
                            <div className="h-full transition-all" style={{ width: `${bullPct}%`, background: '#22c55e' }} />
                            <div className="h-full transition-all" style={{ width: `${neutralPct}%`, background: 'var(--border)' }} />
                            <div className="h-full transition-all" style={{ width: `${bearPct}%`, background: '#ef4444' }} />
                        </div>
                        <div className="flex justify-between text-xs">
                            <span style={{ color: '#16a34a' }}>{bullPct}% bullish</span>
                            <span className="t-muted">{neutralPct}% neutral</span>
                            <span style={{ color: '#dc2626' }}>{bearPct}% bearish</span>
                        </div>
                    </div>
                );
            })()}

            {overviewLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-28 rounded-xl skeleton" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {overview.map((item) => (
                        <SentimentCard key={item.ticker} item={item} onClick={onSelectTicker} />
                    ))}
                </div>
            )}

            <NewsFeed />
        </div>
    );
};

// ─── Detail view ─────────────────────────────────────────────────────────────

const DetailPanel = ({ ticker, onBack, navigateTo, watchlist = [], addToWatchlist, removeFromWatchlist }) => {
    const [signal, setSignal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [showConfidence, setShowConfidence] = useState(false);
    const isFetchingRef = useRef(false);

    const fetchData = useCallback(async () => {
        if (isFetchingRef.current) return;
        try {
            isFetchingRef.current = true;
            setLoading(true);
            setError(null);
            const res = await api.get(`/sentiment/signal/${ticker}`);
            setSignal(res.data);
            setLastRefresh(new Date());
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, [ticker]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => { if (!isFetchingRef.current) fetchData(); }, 120000);
        return () => clearInterval(interval);
    }, [fetchData]);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <header
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm t-muted transition-colors"
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = ''}
                    >
                        <ArrowLeft size={15} />
                        Overview
                    </button>
                    <div className="w-px h-5" style={{ background: 'var(--border)' }} />
                    <div>
                        <h2 className="text-3xl font-bold t-primary font-mono">{ticker}</h2>
                        {signal?.company_name && signal.company_name !== ticker && (
                            <p className="t-muted text-sm mt-0.5">{signal.company_name}</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="btn-ghost t-muted p-2 rounded-lg transition-colors disabled:opacity-50 self-start md:self-auto"
                    title="Refresh"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            {error && (
                <div
                    className="flex items-start gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                    <AlertCircle size={17} style={{ color: '#dc2626' }} className="flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-sm" style={{ color: '#dc2626' }}>Error Loading Data</p>
                        <p className="text-xs mt-0.5 t-muted">{error}</p>
                    </div>
                </div>
            )}

            {loading && !signal ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--text)' }} />
                </div>
            ) : signal ? (
                <>
                    {showConfidence && (
                        <ConfidenceModal ticker={ticker} onClose={() => setShowConfidence(false)} />
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SentimentBadge signal={signal.signal} score={signal.score} onClick={() => setShowConfidence(true)} />

                        <div
                            className="rounded-xl p-5 theme-transition"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        >
                            <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-2">Posts Analyzed</p>
                            <p className="text-3xl font-bold t-primary">{signal.total_posts}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-xs px-2 py-1 rounded" style={{ border: '1px solid rgba(22,163,74,0.3)', color: '#16a34a' }}>{signal.bullish_count} bull</span>
                                <span className="text-xs px-2 py-1 rounded" style={{ border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626' }}>{signal.bearish_count} bear</span>
                                <span className="text-xs px-2 py-1 rounded" style={{ border: '1px solid rgba(217,119,6,0.3)', color: '#d97706' }}>{signal.neutral_count} neutral</span>
                            </div>
                        </div>

                        <div
                            className="rounded-xl p-5 theme-transition"
                            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        >
                            <p className="text-xs font-semibold t-muted uppercase tracking-wider mb-2">Data Source</p>
                            <p className="text-lg font-bold t-primary flex items-center gap-2">
                                <MessageCircle size={17} className="t-muted" />
                                StockTwits
                            </p>
                            {lastRefresh && (
                                <p className="t-muted text-xs mt-2">Updated {lastRefresh.toLocaleTimeString()}</p>
                            )}
                        </div>
                    </div>

                    {/* Cross-tab navigation */}
                    {navigateTo && (
                        <div className="flex flex-wrap gap-2">
                            {watchlist.includes(ticker) ? (
                                <button
                                    onClick={() => removeFromWatchlist(ticker)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                    style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.3)', color: '#d97706' }}
                                >
                                    <StarOff size={14} />
                                    Remove from Watchlist
                                </button>
                            ) : (
                                <button
                                    onClick={() => addToWatchlist(ticker)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <Star size={14} />
                                    Add to Watchlist
                                </button>
                            )}
                            {!DEMO_MODE && (
                                <button
                                    onClick={() => navigateTo('confidence', ticker)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                                >
                                    <BrainCircuit size={14} />
                                    Run Confidence Analysis for {ticker}
                                </button>
                            )}
                            <button
                                onClick={() => navigateTo('ai', ticker)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <Sparkles size={14} />
                                Ask AI about {ticker}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div
                            className="rounded-xl overflow-hidden theme-transition"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                        >
                            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                                <TrendingUp size={15} style={{ color: '#16a34a' }} />
                                <h3 className="text-sm font-bold t-primary">Bull Case</h3>
                                <span className="ml-auto text-xs t-muted">{signal.bullish_count} posts</span>
                            </div>
                            <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
                                {signal.bullish_posts.length > 0 ? signal.bullish_posts.map((p) => (
                                    <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <PostCard post={p} type="bullish" />
                                    </div>
                                )) : (
                                    <p className="t-muted text-sm text-center py-10">No bullish posts found</p>
                                )}
                            </div>
                        </div>

                        <div
                            className="rounded-xl overflow-hidden theme-transition"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                        >
                            <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
                                <TrendingDown size={15} style={{ color: '#dc2626' }} />
                                <h3 className="text-sm font-bold t-primary">Bear Case</h3>
                                <span className="ml-auto text-xs t-muted">{signal.bearish_count} posts</span>
                            </div>
                            <div className="max-h-[520px] overflow-y-auto scrollbar-thin">
                                {signal.bearish_posts.length > 0 ? signal.bearish_posts.map((p) => (
                                    <div key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                        <PostCard post={p} type="bearish" />
                                    </div>
                                )) : (
                                    <p className="t-muted text-sm text-center py-10">No bearish posts found</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
};

// ─── Root component ───────────────────────────────────────────────────────────

const Dashboard = ({ navigateTo, crossTabTicker, clearCrossTabTicker, watchlist = [], addToWatchlist, removeFromWatchlist }) => {
    const [ticker, setTicker] = useState(null);

    useEffect(() => {
        if (crossTabTicker) {
            setTicker(crossTabTicker);
            clearCrossTabTicker();
        }
    }, [crossTabTicker]);

    if (ticker) {
        return (
            <DetailPanel
                ticker={ticker}
                onBack={() => setTicker(null)}
                navigateTo={navigateTo}
                watchlist={watchlist}
                addToWatchlist={addToWatchlist}
                removeFromWatchlist={removeFromWatchlist}
            />
        );
    }

    return (
        <OverviewPanel
            onSelectTicker={(t) => setTicker(t)}
            navigateTo={navigateTo}
            watchlist={watchlist}
            removeFromWatchlist={removeFromWatchlist}
        />
    );
};

export default Dashboard;
