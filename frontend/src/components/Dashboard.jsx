import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertCircle, MessageCircle, Users, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const SentimentBadge = ({ signal, score }) => {
    const config = {
        bullish: {
            bg: 'bg-green-500/20',
            border: 'border-green-500/50',
            text: 'text-green-400',
            icon: TrendingUp,
            label: 'BULLISH'
        },
        bearish: {
            bg: 'bg-red-500/20',
            border: 'border-red-500/50',
            text: 'text-red-400',
            icon: TrendingDown,
            label: 'BEARISH'
        },
        neutral: {
            bg: 'bg-yellow-500/20',
            border: 'border-yellow-500/50',
            text: 'text-yellow-400',
            icon: Minus,
            label: 'NEUTRAL'
        }
    };

    const { bg, border, text, icon: Icon, label } = config[signal] || config.neutral;

    return (
        <div className={`${bg} ${border} border-2 rounded-2xl p-6 flex items-center gap-4`}>
            <div className={`${text} p-3 rounded-xl bg-gray-900/50`}>
                <Icon size={32} />
            </div>
            <div>
                <p className={`${text} text-3xl font-bold`}>{label}</p>
                <p className="text-gray-400 text-sm">Score: {(score * 100).toFixed(0)}%</p>
            </div>
        </div>
    );
};

const PostCard = ({ post, type }) => {
    const borderColor = type === 'bullish' ? 'border-green-500/30' : 'border-red-500/30';
    const badgeColor = type === 'bullish' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400';

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

    return (
        <div className={`bg-gray-800/50 border ${borderColor} rounded-lg p-4 hover:bg-gray-800 transition-colors`}>
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                    {post.avatar_url ? (
                        <img src={post.avatar_url} alt="" className="w-6 h-6 rounded-full" />
                    ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center">
                            <Users size={12} className="text-gray-400" />
                        </div>
                    )}
                    <span className="text-gray-400 text-sm">@{post.username}</span>
                </div>
                <span className={`${badgeColor} text-xs px-2 py-1 rounded-full font-medium`}>
                    {type === 'bullish' ? 'BULL' : 'BEAR'}
                </span>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">{post.body}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                <span>{formatTime(post.created_at)}</span>
                <span className="flex items-center gap-1">
                    <Users size={12} />
                    {post.followers.toLocaleString()} followers
                </span>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const [signal, setSignal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [ticker, setTicker] = useState('AAPL');
    const [searchInput, setSearchInput] = useState('AAPL');
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
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error('Error fetching sentiment signal:', err);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        fetchData();

        // Refresh every 2 minutes
        const interval = setInterval(() => {
            if (!isFetchingRef.current) {
                fetchData();
            }
        }, 120000);

        return () => clearInterval(interval);
    }, [ticker]);

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white">Sentiment Dashboard</h2>
                    <p className="text-gray-400 mt-2">
                        Real-time social sentiment for{' '}
                        <span className="text-indigo-400 font-mono font-bold tracking-wider">{ticker}</span>
                        {signal?.company_name && signal.company_name !== ticker && (
                            <span className="text-gray-500"> ({signal.company_name})</span>
                        )}
                    </p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value.toUpperCase());
                                setValidationError(null);
                            }}
                            placeholder="Enter Ticker"
                            className={`bg-gray-800 border ${validationError ? 'border-red-500' : 'border-gray-700'} text-white rounded-lg px-4 py-2 w-32 focus:outline-none focus:border-indigo-500 uppercase font-mono`}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Search
                        </button>
                        <button
                            type="button"
                            onClick={fetchData}
                            disabled={loading}
                            className={`bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Refresh"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    {validationError && (
                        <p className="text-red-400 text-sm">{validationError}</p>
                    )}
                </form>
            </header>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-400" size={20} />
                    <div>
                        <p className="text-red-400 font-medium">Error Loading Data</p>
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && !signal ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : signal ? (
                <>
                    {/* Signal Header */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SentimentBadge signal={signal.signal} score={signal.score} />

                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <p className="text-gray-400 text-sm mb-1">Posts Analyzed</p>
                            <p className="text-2xl font-bold text-white">{signal.total_posts}</p>
                            <div className="flex gap-4 mt-2 text-sm">
                                <span className="text-green-400">{signal.bullish_count} bullish</span>
                                <span className="text-red-400">{signal.bearish_count} bearish</span>
                                <span className="text-gray-400">{signal.neutral_count} neutral</span>
                            </div>
                        </div>

                        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                            <p className="text-gray-400 text-sm mb-1">Source</p>
                            <p className="text-xl font-bold text-white flex items-center gap-2">
                                <MessageCircle size={20} className="text-indigo-400" />
                                StockTwits
                            </p>
                            {lastRefresh && (
                                <p className="text-gray-500 text-sm mt-2">
                                    Updated {lastRefresh.toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Bull vs Bear Cases */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Bull Case */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="p-4 bg-green-500/10 border-b border-green-500/20">
                                <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
                                    <TrendingUp size={20} />
                                    Bull Case ({signal.bullish_count})
                                </h3>
                            </div>
                            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                                {signal.bullish_posts.length > 0 ? (
                                    signal.bullish_posts.map((post) => (
                                        <PostCard key={post.id} post={post} type="bullish" />
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No bullish posts found</p>
                                )}
                            </div>
                        </div>

                        {/* Bear Case */}
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="p-4 bg-red-500/10 border-b border-red-500/20">
                                <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
                                    <TrendingDown size={20} />
                                    Bear Case ({signal.bearish_count})
                                </h3>
                            </div>
                            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                                {signal.bearish_posts.length > 0 ? (
                                    signal.bearish_posts.map((post) => (
                                        <PostCard key={post.id} post={post} type="bearish" />
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-8">No bearish posts found</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-500 mt-20">
                    <p>Enter a ticker to view sentiment data</p>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
