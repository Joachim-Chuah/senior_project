import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, MessageCircle, Users, RefreshCw, ArrowLeft, Newspaper, BrainCircuit, Sparkles, Star, StarOff, X, ChevronRight, ChevronDown } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
import api from '../utils/api';
import { fetchSignal, fetchOverview as fetchStockTwitsOverview, fetchTrendingTickers } from '../utils/stocktwits';
import { getErrorMessage } from '../utils/errorHandler';
import TickerSearch from './TickerSearch';
import { SkeletonCard } from './Skeleton';

// ─── Signal config ────────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
    bullish: { bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.25)',  color: '#16a34a', bar: '#22c55e', icon: TrendingUp,   label: 'Bullish' },
    bearish: { bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.25)',  color: '#dc2626', bar: '#ef4444', icon: TrendingDown, label: 'Bearish' },
    neutral: { bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)',  color: '#d97706', bar: '#f59e0b', icon: Minus,        label: 'Neutral' },
};

// ─── Confidence modal ─────────────────────────────────────────────────────────

const FEATURE_META = {
    sent_score:       { label: 'Sentiment Score',    weight: 0.30,  range: [-1, 1],     how: 'Counts bullish- and bearish-tagged posts from StockTwits, then normalises: (bulls − bears) ÷ total.' },
    sent_change:      { label: 'Sentiment Momentum', weight: 0.15,  range: [-1, 1],     how: 'Current sentiment score minus the rolling average of the last 5 readings for this ticker.' },
    recent_return_5d: { label: '5-Day Price Return',  weight: 0.20,  range: [-0.1, 0.1], how: '(Close today − Close 5 days ago) ÷ Close 5 days ago. Fetched live from yfinance.' },
    market_regime:    { label: 'Market Regime',       weight: 0.15,  range: [-1, 1],     how: "Combines SPY's 5-day return with the current VIX level." },
    vrp_proxy:        { label: 'Vol Risk Premium',    weight: -0.10, range: [-0.2, 0.2], how: 'ATM implied volatility minus 20-day realised volatility. A high VRP is a headwind for bulls.' },
    sent_dispersion:  { label: 'Sentiment Dispersion',weight: -0.10, range: [0, 1],      how: 'Calculated as 1 − |sentiment score|. High when traders are split; the negative weight reduces confidence.' },
};

function featureBar(value, range) {
    if (value == null) return null;
    const [min, max] = range;
    const pct     = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
    const neutral = ((0 - min) / (max - min)) * 100;
    return { pct, neutral, positive: value >= 0 };
}

function formatFeatureValue(key, value) {
    if (value == null) return 'N/A';
    if (key === 'market_regime') return value > 0.3 ? 'Bullish' : value < -0.3 ? 'Bearish' : 'Neutral';
    if (['sent_score', 'sent_change', 'sent_dispersion'].includes(key)) return `${(value * 100).toFixed(1)}%`;
    if (['recent_return_5d', 'vrp_proxy'].includes(key)) return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}%`;
    return value.toFixed(3);
}

const ConfidenceModal = ({ ticker, sentScore, totalPosts, onClose }) => {
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    useEffect(() => {
        api.post('/confidence/analyze', { ticker, horizon: 5, sent_score: sentScore ?? null, total_posts: totalPosts ?? null })
            .then(res => setData(res.data))
            .catch(() => setError('Failed to load confidence breakdown.'))
            .finally(() => setLoading(false));
    }, [ticker]);

    const cfg = data ? (SIGNAL_CONFIG[data.direction === 'up' ? 'bullish' : 'bearish'] || SIGNAL_CONFIG.neutral) : null;

    return (
        <div
            className="fixed inset-0 flex items-center justify-center z-50 px-4"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-md theme-transition"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>

                <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Confidence Breakdown</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{ticker} · 5-day horizon</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-sm transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <X size={14} />
                    </button>
                </div>

                <div className="px-5 py-4 space-y-4">
                    {loading && <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--text-muted)' }} /></div>}
                    {error && <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>{error}</p>}
                    {data && cfg && (
                        <>
                            <div className="rounded-md p-4 flex items-center justify-between" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                <div className="flex items-center gap-3">
                                    <cfg.icon size={20} style={{ color: cfg.color }} />
                                    <div>
                                        <p className="text-base font-semibold" style={{ color: cfg.color }}>{cfg.label}</p>
                                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Confidence {data.confidence}%</p>
                                    </div>
                                </div>
                                {data.expected_move_pct != null && (
                                    <div className="text-right">
                                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>±{data.expected_move_pct}%</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>expected move</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded font-medium"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                    {data.model_mode === 'fitted' ? 'Fitted model' : 'Warming up'}
                                </span>
                                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {data.model_mode === 'fitted'
                                        ? `Logistic regression${data.brier_score != null ? ` · Brier ${data.brier_score}` : ''}`
                                        : 'Needs 30+ observations to fit'}
                                </p>
                            </div>

                            {data.top_drivers.length > 0 && (
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Top Drivers</p>
                                    <div className="space-y-1.5">
                                        {data.top_drivers.map((d, i) => {
                                            const dCfg = SIGNAL_CONFIG[d.direction] || SIGNAL_CONFIG.neutral;
                                            return (
                                                <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-md"
                                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                                    <dCfg.icon size={13} style={{ color: dCfg.color, flexShrink: 0 }} />
                                                    <p className="text-sm flex-1" style={{ color: 'var(--text)' }}>{d.label}</p>
                                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: dCfg.bg, color: dCfg.color }}>{d.direction}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Feature Inputs</p>
                                <div className="space-y-2">
                                    {Object.entries(FEATURE_META).map(([key, meta]) => {
                                        const value = data.features[key];
                                        const bar   = featureBar(value, meta.range);
                                        const isPos = value != null && value >= 0;
                                        return (
                                            <div key={key} className="rounded-md p-3 space-y-2"
                                                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{meta.label}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                                                            style={{ background: 'var(--surface-2)', color: meta.weight > 0 ? '#16a34a' : '#dc2626', border: '1px solid var(--border)' }}>
                                                            {meta.weight > 0 ? '+' : ''}{(meta.weight * 100).toFixed(0)}%
                                                        </span>
                                                        <span className="text-xs font-mono font-semibold"
                                                            style={{ color: value == null ? 'var(--text-muted)' : isPos ? '#16a34a' : '#dc2626' }}>
                                                            {formatFeatureValue(key, value)}
                                                        </span>
                                                    </div>
                                                </div>
                                                {bar ? (
                                                    <div className="h-1 rounded-full overflow-hidden relative" style={{ background: 'var(--surface-2)' }}>
                                                        <div className="absolute top-0 h-full rounded-full"
                                                            style={{ left: `${Math.min(bar.pct, bar.neutral)}%`, width: `${Math.abs(bar.pct - bar.neutral)}%`, background: bar.positive ? '#22c55e' : '#ef4444' }} />
                                                    </div>
                                                ) : <div className="h-1 rounded-full" style={{ background: 'var(--surface-2)' }} />}
                                                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{meta.how}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Post card ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

const PostCard = ({ post, type }) => {
    const isBull = type === 'bullish';
    const dotColor = isBull ? '#22c55e' : '#ef4444';

    return (
        <div className="px-4 py-3 transition-colors"
            style={{ borderBottom: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div className="flex items-start gap-3">
                {post.avatar_url
                    ? <img src={post.avatar_url} alt="" className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
                    : <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: 'var(--surface-2)' }}>
                        <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                            {post.username?.slice(0, 2).toUpperCase() ?? '??'}
                        </span>
                      </div>
                }
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                        <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>@{post.username}</span>
                        <span className="text-xs ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(post.created_at)}</span>
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'var(--text-muted)' }}>{post.body}</p>
                    <span className="text-xs mt-1.5 inline-flex items-center gap-1" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        <Users size={9} />{(post.followers ?? 0).toLocaleString()} followers
                    </span>
                </div>
            </div>
        </div>
    );
};

// ─── Reddit post card ─────────────────────────────────────────────────────────

const REDDIT_SENTIMENT_COLOR = { Bullish: '#16a34a', Bearish: '#dc2626', Neutral: '#d97706' };

const RedditPostCard = ({ post }) => {
    const dotColor = REDDIT_SENTIMENT_COLOR[post.sentiment] || 'var(--text-muted)';
    return (
        <a href={post.url} target="_blank" rel="noopener noreferrer"
            className="flex items-start gap-3 px-4 py-3 transition-colors"
            style={{ borderBottom: '1px solid var(--border)', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>r/{post.subreddit}</span>
                    <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>u/{post.username}</span>
                    <span className="text-xs ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{timeAgo(post.created_at)}</span>
                </div>
                <p className="text-sm leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>{post.title}</p>
                {post.body && (
                    <p className="text-xs mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{post.body}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                    <span>↑ {post.score}</span>
                    <span>{post.num_comments} comments</span>
                </div>
            </div>
        </a>
    );
};

// ─── News feed ────────────────────────────────────────────────────────────────

const NewsItem = ({ item }) => (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
        className="flex items-start gap-3 py-2.5 -mx-2 px-2 rounded-sm transition-colors"
        style={{ borderBottom: '1px solid var(--border)' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
        onMouseLeave={e => e.currentTarget.style.background = ''}>
        <div className="flex-1 min-w-0">
            <p className="text-sm leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>{item.title}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>{item.source}</span>
                <span>·</span>
                <span>{timeAgo(item.publishedDate)}</span>
            </div>
        </div>
    </a>
);

const NewsFeed = () => {
    const [news, setNews]         = useState([]);
    const [loading, setLoading]   = useState(true);
    const [expanded, setExpanded] = useState(false);

    useEffect(() => {
        api.get('/sentiment/news?limit=30').then(res => setNews(res.data)).catch(() => {}).finally(() => setLoading(false));
    }, []);

    const top  = news.slice(0, 5);
    const rest = news.slice(5);

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <Newspaper size={13} style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Financial News</p>
            </div>
            {loading
                ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 rounded skeleton mb-3" style={{ width: `${70 + (i % 3) * 10}%` }} />)
                : news.length === 0
                    ? <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No news available</p>
                    : <>
                        {top.map((item, i) => <NewsItem key={i} item={item} />)}
                        {rest.length > 0 && (
                            <>
                                {expanded && rest.map((item, i) => <NewsItem key={i + 5} item={item} />)}
                                <button onClick={() => setExpanded(p => !p)}
                                    className="flex items-center gap-1.5 w-full py-2 text-xs transition-colors -mx-2 px-2 rounded-sm"
                                    style={{ color: 'var(--text-muted)' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                                    <ChevronDown size={12} style={{ transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                                    {expanded ? 'Show less' : `${rest.length} more articles`}
                                </button>
                            </>
                        )}
                      </>
            }
        </div>
    );
};

// ─── Ticker row (overview table) ──────────────────────────────────────────────

const TickerRow = ({ item, onClick }) => {
    const cfg     = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.neutral;
    const Icon    = cfg.icon;
    const bullPct = item.total_posts > 0 ? Math.round((item.bullish_count / item.total_posts) * 100) : 0;
    const bearPct = item.total_posts > 0 ? Math.round((item.bearish_count / item.total_posts) * 100) : 0;

    return (
        <button onClick={() => onClick(item.ticker)}
            className="w-full flex items-center gap-4 px-3 py-2.5 text-left transition-colors"
            style={{ borderBottom: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = ''}>

            {/* Ticker + name */}
            <div className="w-36 flex-shrink-0">
                <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{item.ticker}</span>
                {item.company_name && item.company_name !== item.ticker && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.company_name}</p>
                )}
            </div>

            {/* Signal badge */}
            <div className="w-20 flex-shrink-0">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                    <Icon size={10} />{cfg.label}
                </span>
            </div>

            {/* Bull/bear bar */}
            <div className="flex-1 min-w-0">
                <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-2)' }}>
                    <div className="h-full" style={{ width: `${bullPct}%`, background: '#22c55e' }} />
                    <div className="h-full" style={{ width: `${bearPct}%`, background: '#ef4444' }} />
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-shrink-0 text-xs font-mono">
                <span style={{ color: '#16a34a', minWidth: 36 }}>{bullPct}%↑</span>
                <span style={{ color: '#dc2626', minWidth: 36 }}>{bearPct}%↓</span>
                <span style={{ color: 'var(--text-muted)', minWidth: 52 }}>{item.total_posts} posts</span>
            </div>

            <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.4 }} />
        </button>
    );
};

// ─── Overview panel ───────────────────────────────────────────────────────────

const OverviewPanel = ({ onSelectTicker, watchlist = [], removeFromWatchlist }) => {
    const [overview, setOverview]             = useState([]);
    const [overviewLoading, setOverviewLoading] = useState(true);
    const [overviewError, setOverviewError]   = useState(null);
    const [filter, setFilter]                 = useState('all');

    const fetchOverview = useCallback(async () => {
        setOverviewLoading(true);
        setOverviewError(null);
        try {
            const tickers = await fetchTrendingTickers(10);
            const data    = await fetchStockTwitsOverview(api, tickers);
            setOverview(data);
        } catch {
            setOverviewError('Failed to load market sentiment.');
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    const filtered = overview.filter(i => filter === 'all' || i.signal === filter);

    // Aggregate mood
    const totalBull    = overview.reduce((s, i) => s + (i.bullish_count  || 0), 0);
    const totalBear    = overview.reduce((s, i) => s + (i.bearish_count  || 0), 0);
    const totalNeutral = overview.reduce((s, i) => s + (i.neutral_count  || 0), 0);
    const total        = totalBull + totalBear + totalNeutral || 1;
    const bullPct      = Math.round((totalBull / total) * 100);
    const bearPct      = Math.round((totalBear / total) * 100);
    const neutralPct   = 100 - bullPct - bearPct;
    const mood         = bullPct > bearPct + 10 ? 'Bullish' : bearPct > bullPct + 10 ? 'Bearish' : 'Mixed';
    const moodColor    = mood === 'Bullish' ? '#16a34a' : mood === 'Bearish' ? '#dc2626' : '#d97706';

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Dashboard</h1>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Market sentiment via StockTwits</p>
                </div>
                <div className="flex items-center gap-2">
                    <TickerSearch onSelect={onSelectTicker} />
                    <button onClick={fetchOverview} disabled={overviewLoading} title="Refresh"
                        className="p-2 rounded-sm transition-colors disabled:opacity-40"
                        style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                        <RefreshCw size={13} className={overviewLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Watchlist chips */}
            {watchlist.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Star size={11} /> Watchlist
                    </span>
                    {watchlist.map(t => (
                        <button key={t} onClick={() => onSelectTicker(t)}
                            className="px-2.5 py-1 rounded-sm text-xs font-mono font-medium transition-colors"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                            {t}
                        </button>
                    ))}
                </div>
            )}

            {overviewError && (
                <div className="flex items-center gap-2 rounded-md px-4 py-3 text-sm"
                    style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {overviewError}
                </div>
            )}

            {/* Mood bar */}
            {!overviewLoading && overview.length > 0 && (
                <div className="rounded-md px-4 py-3 space-y-2" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--text-muted)' }}>Overall Market Mood</span>
                        <span className="font-semibold" style={{ color: moodColor }}>{mood}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-2)' }}>
                        <div style={{ width: `${bullPct}%`, background: '#22c55e' }} />
                        <div style={{ width: `${neutralPct}%`, background: 'var(--border)' }} />
                        <div style={{ width: `${bearPct}%`, background: '#ef4444' }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                        <span style={{ color: '#16a34a' }}>{bullPct}% bullish</span>
                        <span style={{ color: 'var(--text-muted)' }}>{neutralPct}% neutral</span>
                        <span style={{ color: '#dc2626' }}>{bearPct}% bearish</span>
                    </div>
                </div>
            )}

            {/* Filter pills */}
            {!overviewLoading && overview.length > 0 && (() => {
                const counts = { all: overview.length, bullish: overview.filter(i => i.signal === 'bullish').length, bearish: overview.filter(i => i.signal === 'bearish').length, neutral: overview.filter(i => i.signal === 'neutral').length };
                return (
                    <div className="flex items-center gap-1.5">
                        {[
                            { id: 'all',     label: 'All' },
                            { id: 'bullish', label: 'Bullish', color: '#16a34a' },
                            { id: 'bearish', label: 'Bearish', color: '#dc2626' },
                            { id: 'neutral', label: 'Neutral', color: '#d97706' },
                        ].map(p => (
                            <button key={p.id} onClick={() => setFilter(p.id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs transition-colors"
                                style={{
                                    background: filter === p.id ? 'var(--surface-2)' : 'transparent',
                                    border: `1px solid ${filter === p.id ? 'var(--border-hover)' : 'var(--border)'}`,
                                    color: filter === p.id && p.color ? p.color : filter === p.id ? 'var(--text)' : 'var(--text-muted)',
                                }}>
                                {p.label}
                                <span style={{ opacity: 0.6 }}>{counts[p.id]}</span>
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* Ticker table */}
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>

                {/* Table header */}
                <div className="flex items-center gap-4 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <span className="w-36 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ticker</span>
                    <span className="w-20 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Signal</span>
                    <span className="flex-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sentiment</span>
                    <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)', minWidth: 156 }}>Stats</span>
                    <span className="w-4 flex-shrink-0" />
                </div>

                {overviewLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                            <div className="h-4 skeleton rounded w-16 flex-shrink-0" />
                            <div className="h-4 skeleton rounded w-14 flex-shrink-0" />
                            <div className="h-1.5 skeleton rounded flex-1" />
                            <div className="h-4 skeleton rounded w-32 flex-shrink-0" />
                        </div>
                    ))
                    : filtered.map(item => <TickerRow key={item.ticker} item={item} onClick={onSelectTicker} />)
                }
            </div>

            {/* Bottom: news + most discussed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <NewsFeed />
                </div>

                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <MessageCircle size={13} style={{ color: 'var(--text-muted)' }} />
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Most Discussed</p>
                    </div>
                    {overviewLoading
                        ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-8 skeleton rounded-sm mb-2" />)
                        : [...overview]
                            .sort((a, b) => (b.total_posts || 0) - (a.total_posts || 0))
                            .slice(0, 7)
                            .map((item, i) => {
                                const cfg    = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.neutral;
                                const Icon   = cfg.icon;
                                const maxP   = overview.reduce((m, x) => Math.max(m, x.total_posts || 0), 1);
                                const barPct = Math.round(((item.total_posts || 0) / maxP) * 100);
                                return (
                                    <button key={item.ticker} onClick={() => onSelectTicker(item.ticker)}
                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-sm text-left transition-colors mb-1"
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                                        onMouseLeave={e => e.currentTarget.style.background = ''}>
                                        <span className="text-xs w-4 text-right flex-shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>{i + 1}</span>
                                        <span className="text-sm font-semibold font-mono w-12 flex-shrink-0" style={{ color: 'var(--text)' }}>{item.ticker}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                                                <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: cfg.bar }} />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Icon size={10} style={{ color: cfg.color }} />
                                            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{item.total_posts}</span>
                                        </div>
                                    </button>
                                );
                            })
                    }
                </div>
            </div>
        </div>
    );
};

// ─── Detail panel ─────────────────────────────────────────────────────────────

const DetailPanel = ({ ticker, onBack, navigateTo, watchlist = [], addToWatchlist, removeFromWatchlist }) => {
    const [signal, setSignal]             = useState(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState(null);
    const [lastRefresh, setLastRefresh]   = useState(null);
    const [showConfidence, setShowConfidence] = useState(false);
    const isFetchingRef                   = useRef(false);

    const fetchData = useCallback(async () => {
        if (isFetchingRef.current) return;
        try {
            isFetchingRef.current = true;
            setLoading(true);
            setError(null);
            const data = await fetchSignal(api, ticker);
            setSignal(data);
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

    const cfg = signal ? (SIGNAL_CONFIG[signal.signal] || SIGNAL_CONFIG.neutral) : null;

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onBack}
                        className="flex items-center gap-1 text-sm transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                        <ArrowLeft size={13} />
                        Dashboard
                    </button>
                    <span style={{ color: 'var(--border)' }}>/</span>
                    <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{ticker}</span>
                    {signal?.company_name && signal.company_name !== ticker && (
                        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{signal.company_name}</span>
                    )}
                </div>
                <button onClick={fetchData} disabled={loading} title="Refresh"
                    className="p-2 rounded-sm transition-colors disabled:opacity-40"
                    style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-md px-4 py-3 text-sm"
                    style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {error}
                </div>
            )}

            {loading && !signal ? (
                <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--text-muted)' }} />
                </div>
            ) : signal && cfg ? (
                <>
                    {showConfidence && (
                        <ConfidenceModal ticker={ticker} sentScore={signal?.score ?? null} totalPosts={signal?.total_posts ?? null} onClose={() => setShowConfidence(false)} />
                    )}

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Signal */}
                        <button onClick={() => setShowConfidence(true)}
                            className="rounded-md p-4 text-left transition-colors group"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: cfg.color, opacity: 0.8 }}>Signal</p>
                            <div className="flex items-center gap-2">
                                <cfg.icon size={18} style={{ color: cfg.color }} />
                                <span className="text-lg font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                            </div>
                            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: cfg.color, opacity: 0.7 }}>
                                Confidence {(Math.abs(signal.score) * 100).toFixed(0)}%
                                <ChevronRight size={11} className="transition-transform group-hover:translate-x-0.5" />
                            </p>
                        </button>

                        {/* Posts */}
                        <div className="rounded-md p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Posts Analyzed</p>
                            <p className="text-2xl font-semibold font-mono" style={{ color: 'var(--text)' }}>{signal.total_posts}</p>
                            <div className="flex gap-2 mt-2 text-xs font-mono">
                                <span style={{ color: '#16a34a' }}>{signal.bullish_count}↑</span>
                                <span style={{ color: '#d97706' }}>{signal.neutral_count}–</span>
                                <span style={{ color: '#dc2626' }}>{signal.bearish_count}↓</span>
                            </div>
                        </div>

                        {/* Source */}
                        <div className="rounded-md p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                            <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Sources</p>
                            <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text)' }}>
                                <MessageCircle size={14} style={{ color: 'var(--text-muted)' }} />
                                StockTwits
                            </p>
                            {signal.reddit_total_posts > 0 && (
                                <p className="text-sm font-medium flex items-center gap-2 mt-1" style={{ color: 'var(--text)' }}>
                                    <MessageCircle size={14} style={{ color: 'var(--text-muted)' }} />
                                    Reddit <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>({signal.reddit_total_posts} posts)</span>
                                </p>
                            )}
                            {lastRefresh && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Updated {lastRefresh.toLocaleTimeString()}</p>}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                        {watchlist.includes(ticker) ? (
                            <button onClick={() => removeFromWatchlist(ticker)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                <StarOff size={12} /> Remove from watchlist
                            </button>
                        ) : (
                            <button onClick={() => addToWatchlist(ticker)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                <Star size={12} /> Add to watchlist
                            </button>
                        )}
                        {!DEMO_MODE && (
                            <button onClick={() => navigateTo('confidence', ticker)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                                <BrainCircuit size={12} /> Run confidence analysis
                            </button>
                        )}
                        <button onClick={() => navigateTo('ai', ticker)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-sm transition-colors"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                            <Sparkles size={12} /> Ask AI about {ticker}
                        </button>
                    </div>

                    {/* Bull / Bear posts — StockTwits */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[
                            { label: 'Bull Case', type: 'bullish', count: signal.bullish_count, posts: signal.bullish_posts, color: '#16a34a', Icon: TrendingUp },
                            { label: 'Bear Case', type: 'bearish', count: signal.bearish_count, posts: signal.bearish_posts, color: '#dc2626', Icon: TrendingDown },
                        ].map(({ label, type, count, posts, color, Icon }) => (
                            <div key={type} className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                    <Icon size={13} style={{ color }} />
                                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{label}</p>
                                    <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{count} posts</span>
                                </div>
                                <div className="max-h-[480px] overflow-y-auto scrollbar-thin">
                                    {posts.length > 0
                                        ? posts.map(p => <PostCard key={p.id} post={p} type={type} />)
                                        : <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>No {type} posts found</p>
                                    }
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Reddit posts */}
                    {signal.reddit_posts?.length > 0 && (
                        <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                                <MessageCircle size={13} style={{ color: 'var(--text-muted)' }} />
                                <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Reddit</p>
                                <span className="text-xs px-1.5 py-0.5 rounded font-mono ml-1"
                                    style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                                    wsb · stocks · investing
                                </span>
                                <span className="ml-auto text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                                    {signal.reddit_bullish_count}↑ {signal.reddit_bearish_count}↓
                                </span>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
                                {signal.reddit_posts.map(p => <RedditPostCard key={p.id} post={p} />)}
                            </div>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

const Dashboard = ({ navigateTo, crossTabTicker, clearCrossTabTicker, watchlist = [], addToWatchlist, removeFromWatchlist, onTickerSelect }) => {
    const [ticker, setTicker] = useState(null);

    function openTicker(t) {
        setTicker(t);
        onTickerSelect?.(t);
        window.history.pushState({ ...(window.history.state || {}), detailTicker: t }, '');
    }

    function closeTicker() {
        setTicker(null);
        onTickerSelect?.(null);
        const { detailTicker, ...rest } = window.history.state || {};
        window.history.pushState(rest, '');
    }

    useEffect(() => {
        const handlePop = (e) => { if (!e.state?.detailTicker) setTicker(null); };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }, []);

    useEffect(() => {
        if (crossTabTicker) { openTicker(crossTabTicker); clearCrossTabTicker(); }
    }, [crossTabTicker]);

    if (ticker) {
        return <DetailPanel ticker={ticker} onBack={closeTicker} navigateTo={navigateTo} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} />;
    }

    return <OverviewPanel onSelectTicker={openTicker} watchlist={watchlist} removeFromWatchlist={removeFromWatchlist} />;
};

export default Dashboard;
