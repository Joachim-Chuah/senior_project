import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, MessageCircle, Users, RefreshCw, Search } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const SentimentBadge = ({ signal, score }) => {
    const config = {
        bullish: {
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            border: 'border-emerald-300 dark:border-emerald-500/30',
            text: 'text-emerald-700 dark:text-emerald-400',
            icon: TrendingUp,
            label: 'Bullish'
        },
        bearish: {
            bg: 'bg-red-50 dark:bg-red-500/10',
            border: 'border-red-300 dark:border-red-500/30',
            text: 'text-red-700 dark:text-red-400',
            icon: TrendingDown,
            label: 'Bearish'
        },
        neutral: {
            bg: 'bg-amber-50 dark:bg-amber-500/10',
            border: 'border-amber-300 dark:border-amber-500/30',
            text: 'text-amber-700 dark:text-amber-400',
            icon: Minus,
            label: 'Neutral'
        }
    };

    const { bg, border, text, icon: Icon, label } = config[signal] || config.neutral;

    return (
        <div className={`${bg} border border-dashed ${border} rounded-xl p-5 flex items-center gap-4`}>
            <div className={`${text}`}>
                <Icon size={26} />
            </div>
            <div>
                <p className={`${text} text-xl font-bold`}>{label}</p>
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">
                    Confidence {(score * 100).toFixed(0)}%
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
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
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
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                            @{post.username}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border border-dashed ${badge} ml-auto flex-shrink-0`}>
                            {type === 'bullish' ? 'Bull' : 'Bear'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">{post.body}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                        <span>{formatTime(post.created_at)}</span>
                        <span className="flex items-center gap-1">
                            <Users size={10} />
                            {post.followers.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [signal, setSignal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticker, setTicker] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [lastRefresh, setLastRefresh] = useState(null);
    const isFetchingRef = useRef(false);

    const handleSearch = (e) => {
        e.preventDefault();
        setValidationError(null);
        const validation = validateTicker(searchInput);
        if (!validation.isValid) {
            setValidationError(validation.error);
            return;
        }
        setTicker(validation.ticker);
    };

    const fetchData = async () => {
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
            console.error('Error fetching sentiment signal:', err);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        if (!ticker) return;
        fetchData();
        const interval = setInterval(() => {
            if (!isFetchingRef.current) fetchData();
        }, 120000);
        return () => clearInterval(interval);
    }, [ticker]);

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-dashed border-gray-300 dark:border-gray-700">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Sentiment Dashboard
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
                        <span className="font-mono font-semibold text-gray-800 dark:text-indigo-400">{ticker}</span>
                        {signal?.company_name && signal.company_name !== ticker && (
                            <span className="text-gray-400 dark:text-gray-500"> · {signal.company_name}</span>
                        )}
                    </p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => {
                                    setSearchInput(e.target.value.toUpperCase());
                                    setValidationError(null);
                                }}
                                placeholder="Search Stocks & ETFs"
                                className={`bg-white dark:bg-gray-800 border border-dashed ${validationError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-white rounded-lg pl-8 pr-3 py-2 w-52 focus:outline-none focus:ring-2 focus:ring-gray-400/20 focus:border-gray-400 uppercase font-mono text-sm theme-transition`}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            onClick={fetchData}
                            disabled={loading}
                            className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
                </form>
            </header>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={17} />
                    <div>
                        <p className="text-red-700 dark:text-red-400 font-medium text-sm">Error Loading Data</p>
                        <p className="text-red-500 dark:text-red-300 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {loading && !signal ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 dark:border-white"></div>
                </div>
            ) : signal ? (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <SentimentBadge signal={signal.signal} score={signal.score} />

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-5 theme-transition">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Posts Analyzed</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white">{signal.total_posts}</p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <span className="text-xs px-2 py-1 rounded border border-dashed border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-400">
                                    {signal.bullish_count} bull
                                </span>
                                <span className="text-xs px-2 py-1 rounded border border-dashed border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-400">
                                    {signal.bearish_count} bear
                                </span>
                                <span className="text-xs px-2 py-1 rounded border border-dashed border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-400">
                                    {signal.neutral_count} neutral
                                </span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-5 theme-transition">
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Data Source</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <MessageCircle size={17} className="text-gray-500 dark:text-gray-400" />
                                StockTwits
                            </p>
                            {lastRefresh && (
                                <p className="text-gray-400 dark:text-gray-500 text-xs mt-2">
                                    Updated {lastRefresh.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Feed Columns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Bull */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
                            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <TrendingUp size={15} className="text-emerald-600 dark:text-emerald-400" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bull Case</h3>
                                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{signal.bullish_count} posts</span>
                            </div>
                            <div className="max-h-[520px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-800">
                                {signal.bullish_posts.length > 0 ? (
                                    signal.bullish_posts.map((post) => (
                                        <PostCard key={post.id} post={post} type="bullish" />
                                    ))
                                ) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No bullish posts found</p>
                                )}
                            </div>
                        </div>

                        {/* Bear */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
                            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700 flex items-center gap-2">
                                <TrendingDown size={15} className="text-red-600 dark:text-red-400" />
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bear Case</h3>
                                <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{signal.bearish_count} posts</span>
                            </div>
                            <div className="max-h-[520px] overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-gray-800">
                                {signal.bearish_posts.length > 0 ? (
                                    signal.bearish_posts.map((post) => (
                                        <PostCard key={post.id} post={post} type="bearish" />
                                    ))
                                ) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-10">No bearish posts found</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-400 dark:text-gray-500 mt-20 text-sm">
                    <p>Enter a ticker to view sentiment data</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
