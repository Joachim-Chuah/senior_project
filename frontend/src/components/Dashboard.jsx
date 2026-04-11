import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, MessageCircle, Users, RefreshCw, ArrowLeft, Newspaper, BrainCircuit, Sparkles } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errorHandler';
import TickerSearch from './TickerSearch';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const SIGNAL_CONFIG = {
    bullish: {
        bg: 'bg-emerald-50 dark:bg-emerald-500/10',
        border: 'border-emerald-300 dark:border-emerald-500/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        icon: TrendingUp,
        label: 'Bullish',
    },
    bearish: {
        bg: 'bg-red-50 dark:bg-red-500/10',
        border: 'border-red-300 dark:border-red-500/30',
        text: 'text-red-700 dark:text-red-400',
        bar: 'bg-red-500',
        icon: TrendingDown,
        label: 'Bearish',
    },
    neutral: {
        bg: 'bg-amber-50 dark:bg-amber-500/10',
        border: 'border-amber-300 dark:border-amber-500/30',
        text: 'text-amber-700 dark:text-amber-400',
        bar: 'bg-amber-400',
        icon: Minus,
        label: 'Neutral',
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
            className="w-full text-left bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-sm transition-all theme-transition"
        >
            <div className="flex items-start justify-between mb-3">
                <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{item.ticker}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate max-w-[120px]">{item.company_name !== item.ticker ? item.company_name : ''}</p>
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${cfg.bg} ${cfg.text} border border-dashed ${cfg.border}`}>
                    <Icon size={11} />
                    {cfg.label}
                </span>
            </div>

            {/* Bull/bear bar */}
            <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex mb-2">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${bullPct}%` }} />
                <div className="bg-red-500 h-full transition-all" style={{ width: `${bearPct}%` }} />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span className="text-emerald-600 dark:text-emerald-400">{bullPct}% bull</span>
                <span className="text-gray-400 dark:text-gray-600">{item.total_posts} posts</span>
                <span className="text-red-600 dark:text-red-400">{bearPct}% bear</span>
            </div>

            {item.error && (
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-2 italic">Data unavailable</p>
            )}
        </button>
    );
};

// ─── Detail view sub-components ───────────────────────────────────────────────

const SentimentBadge = ({ signal, score }) => {
    const { bg, border, text, icon: Icon, label } = SIGNAL_CONFIG[signal] || SIGNAL_CONFIG.neutral;
    return (
        <div className={`${bg} border border-dashed ${border} rounded-xl p-5 flex items-center gap-4`}>
            <div className={text}><Icon size={26} /></div>
            <div>
                <p className={`${text} text-xl font-bold`}>{label}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Confidence {(Math.abs(score) * 100).toFixed(0)}%
                </p>
            </div>
        </div>
    );
};

const PostCard = ({ post, type }) => {
    const dot = type === 'bullish' ? 'bg-emerald-500' : 'bg-red-500';
    const badge = type === 'bullish'
        ? 'border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
        : 'border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400';

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
        <div className="py-3 px-4 hover:bg-stone-50 dark:hover:bg-gray-800/40 transition-colors">
            <div className="flex items-start gap-3">
                {post.avatar_url ? (
                    <img src={post.avatar_url} alt="" className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5" />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-gray-600 dark:text-gray-300 text-xs font-semibold">{initials}</span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${dot} flex-shrink-0`} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">@{post.username}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border border-dashed ${badge} ml-auto flex-shrink-0`}>
                            {type === 'bullish' ? 'Bull' : 'Bear'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{post.body}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
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
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <Newspaper size={15} className="text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Financial News</h3>
                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">Yahoo Finance · MarketWatch · Reuters</span>
            </div>
            {loading ? (
                <div className="p-4 space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-4 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" style={{ width: `${70 + (i % 3) * 10}%` }} />
                    ))}
                </div>
            ) : news.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-8">No news available</p>
            ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
                    {news.map((item, i) => (
                        <li key={i}>
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 dark:hover:bg-gray-800/40 transition-colors group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium leading-snug line-clamp-2">
                                        {item.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 dark:text-gray-500">
                                        <span>{item.source}</span>
                                        <span>·</span>
                                        <span>{timeAgo(item.publishedDate)}</span>
                                    </div>
                                </div>
                            </a>
                        </li>
                    ))}
                </ul>
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
        } catch (err) {
            setOverviewError('Failed to load market sentiment.');
        } finally {
            setOverviewLoading(false);
        }
    }, []);

    useEffect(() => { fetchOverview(); }, [fetchOverview]);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dashed border-gray-300 dark:border-gray-700">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Sentiment Dashboard</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Market sentiment via StockTwits</p>
                </div>
                <div className="flex items-center gap-2">
                    <TickerSearch onSelect={onSelectTicker} />
                    <button
                        type="button"
                        onClick={fetchOverview}
                        disabled={overviewLoading}
                        className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh"
                    >
                        <RefreshCw size={15} className={overviewLoading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {overviewError && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0" size={17} />
                    <p className="text-red-700 dark:text-red-400 text-sm">{overviewError}</p>
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
                const moodColor    = mood === 'Bullish' ? 'text-emerald-600 dark:text-emerald-400' : mood === 'Bearish' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
                return (
                    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-500 dark:text-gray-400">Overall Market Mood</span>
                            <span className={`font-bold ${moodColor}`}>{mood}</span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden flex">
                            <div className="bg-emerald-500 h-full transition-all" style={{ width: `${bullPct}%` }} />
                            <div className="bg-gray-200 dark:bg-gray-700 h-full transition-all" style={{ width: `${neutralPct}%` }} />
                            <div className="bg-red-500 h-full transition-all" style={{ width: `${bearPct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className="text-emerald-600 dark:text-emerald-400">{bullPct}% bullish</span>
                            <span>{neutralPct}% neutral</span>
                            <span className="text-red-600 dark:text-red-400">{bearPct}% bearish</span>
                        </div>
                    </div>
                );
            })()}

            {overviewLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
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
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dashed border-gray-300 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                        <ArrowLeft size={15} />
                        Overview
                    </button>
                    <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white font-mono">{ticker}</h2>
                        {signal?.company_name && signal.company_name !== ticker && (
                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-0.5">{signal.company_name}</p>
                        )}
                    </div>
                </div>

                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50 self-start md:self-auto"
                    title="Refresh"
                >
                    <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500 flex-shrink-0" size={17} />
                    <div>
                        <p className="text-red-700 dark:text-red-400 font-medium text-sm">Error Loading Data</p>
                        <p className="text-red-500 dark:text-red-300 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {loading && !signal ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 dark:border-white" />
                </div>
            ) : signal ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SentimentBadge signal={signal.signal} score={signal.score} />

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-5 theme-transition">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Posts Analyzed</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{signal.total_posts}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-xs px-2 py-1 rounded border border-dashed border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400">{signal.bullish_count} bull</span>
                                <span className="text-xs px-2 py-1 rounded border border-dashed border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400">{signal.bearish_count} bear</span>
                                <span className="text-xs px-2 py-1 rounded border border-dashed border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400">{signal.neutral_count} neutral</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-5 theme-transition">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Data Source</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageCircle size={17} className="text-gray-500 dark:text-gray-400" />
                                StockTwits
                            </p>
                            {lastRefresh && (
                                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">Updated {lastRefresh.toLocaleTimeString()}</p>
                            )}
                        </div>
                    </div>

                    {/* Cross-tab navigation */}
                    {navigateTo && (
                        <div className="flex flex-wrap gap-2">
                            {!DEMO_MODE && (
                                <button
                                    onClick={() => navigateTo('confidence', ticker)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-dashed border-indigo-300 dark:border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                                >
                                    <BrainCircuit size={14} />
                                    Run Confidence Analysis for {ticker}
                                </button>
                            )}
                            <button
                                onClick={() => navigateTo('ai', ticker)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <Sparkles size={14} />
                                Ask AI about {ticker}
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
                            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bull Case</h3>
                                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{signal.bullish_count} posts</span>
                            </div>
                            <div className="max-h-[520px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-800">
                                {signal.bullish_posts.length > 0 ? signal.bullish_posts.map((p) => (
                                    <PostCard key={p.id} post={p} type="bullish" />
                                )) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No bullish posts found</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
                            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <TrendingDown size={15} className="text-red-600 dark:text-red-400" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bear Case</h3>
                                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{signal.bearish_count} posts</span>
                            </div>
                            <div className="max-h-[520px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-800">
                                {signal.bearish_posts.length > 0 ? signal.bearish_posts.map((p) => (
                                    <PostCard key={p.id} post={p} type="bearish" />
                                )) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No bearish posts found</p>
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
