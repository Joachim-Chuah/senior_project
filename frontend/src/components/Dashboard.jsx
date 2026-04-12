import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, MessageCircle, Users, RefreshCw, ArrowLeft, Newspaper, BrainCircuit, Sparkles } from 'lucide-react';

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

// ─── Detail view sub-components ───────────────────────────────────────────────

const SentimentBadge = ({ signal, score }) => {
    const cfg = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral;
    const Icon = cfg.icon;
    return (
        <div
            className="rounded-xl p-5 flex items-center gap-4"
            style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
        >
            <Icon size={26} style={{ color: cfg.color }} />
            <div>
                <p className="text-xl font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                <p className="text-xs t-muted mt-0.5">
                    Confidence {(Math.abs(score) * 100).toFixed(0)}%
                </p>
            </div>
        </div>
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

const OverviewPanel = ({ onSelectTicker, navigateTo }) => {
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

const DetailPanel = ({ ticker, onBack, navigateTo }) => {
    const [signal, setSignal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SentimentBadge signal={signal.signal} score={signal.score} />

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

const Dashboard = ({ navigateTo, crossTabTicker, clearCrossTabTicker }) => {
    const [ticker, setTicker] = useState(null);

    useEffect(() => {
        if (crossTabTicker) {
            setTicker(crossTabTicker);
            clearCrossTabTicker();
        }
    }, [crossTabTicker]);

    if (ticker) {
        return <DetailPanel ticker={ticker} onBack={() => setTicker(null)} navigateTo={navigateTo} />;
    }

    return <OverviewPanel onSelectTicker={(t) => setTicker(t)} navigateTo={navigateTo} />;
};

export default Dashboard;
