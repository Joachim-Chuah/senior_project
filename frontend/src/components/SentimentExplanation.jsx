import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatTime, safePercentage, getRegimeColor } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';
import { AlertCircle, TrendingUp, TrendingDown, Info, MessageSquare, Newspaper, Calculator } from 'lucide-react';

const SentimentExplanation = ({ ticker }) => {
    const [explanation, setExplanation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchExplanation = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/sentiment/explanation/${ticker}`);
                setExplanation(response.data);
                setError(null);
            } catch (err) {
                console.error('Error fetching sentiment explanation:', err);
                const errorMsg = getErrorMessage(err);
                setError(errorMsg);
            } finally {
                setLoading(false);
            }
        };

        if (ticker) {
            fetchExplanation();
        }
    }, [ticker]);

    if (loading) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800 animate-pulse">
                <div className="h-6 w-48 bg-slate-800 rounded mb-4"></div>
                <div className="space-y-3">
                    <div className="h-4 w-full bg-slate-800 rounded"></div>
                    <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !explanation) {
        return (
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-800">
                <div className="flex items-center gap-2 text-slate-400">
                    <AlertCircle size={20} />
                    <p>{error || 'No explanation data available'}</p>
                </div>
            </div>
        );
    }

    const getSentimentIcon = (score) => {
        if (score > 0.1) return <TrendingUp size={16} className="text-emerald-400" />;
        if (score < -0.1) return <TrendingDown size={16} className="text-rose-400" />;
        return <Info size={16} className="text-slate-400" />;
    };

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-800/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">Why This Sentiment?</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRegimeColor(explanation.regime)}`}>
                            {explanation.regime.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500">
                        {formatTime(explanation.timestamp)}
                    </p>
                </div>
                <p className="mt-2 text-sm text-slate-300 italic">
                    "{explanation.regime_reasoning}"
                </p>
            </div>

            <div className="p-6 space-y-8">
                {/* Fusion Calculation Breakdown */}
                <section>
                    <div className="flex items-center gap-2 mb-4 text-slate-200 font-medium">
                        <Calculator size={18} className="text-indigo-400" />
                        <h4>Fusion Calculation</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400">Reddit ({(explanation.reddit_weight * 100).toFixed(0)}%)</span>
                                {getSentimentIcon(explanation.reddit_score)}
                            </div>
                            <p className="text-xl font-bold font-mono text-white">{explanation.reddit_score.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center justify-center text-slate-600">
                            <span className="text-xl font-bold">+</span>
                        </div>
                        <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-400">GDELT ({(explanation.gdelt_weight * 100).toFixed(0)}%)</span>
                                {getSentimentIcon(explanation.gdelt_score)}
                            </div>
                            <p className="text-xl font-bold font-mono text-white">{explanation.gdelt_score.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                        <span className="text-sm font-medium text-indigo-300">Final Fusion Score</span>
                        <span className="text-lg font-bold text-white font-mono">{explanation.fusion_score.toFixed(2)}</span>
                    </div>
                </section>

                {/* Key Contributing Factors */}
                <section>
                    <div className="flex items-center gap-2 mb-3 text-slate-200 font-medium">
                        <Info size={18} className="text-amber-400" />
                        <h4>Key Factors</h4>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {explanation.key_factors.map((factor, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300 border border-slate-700">
                                {factor}
                            </span>
                        ))}
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Reddit Detail */}
                    <div className="bg-slate-800/20 rounded-xl border border-slate-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <MessageSquare size={18} className="text-orange-400" />
                            <h5 className="font-medium text-white">Reddit Insight</h5>
                        </div>
                        {explanation.reddit_explanation ? (
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Volume</span>
                                    <span className="text-slate-200">{explanation.reddit_explanation.total_posts} posts</span>
                                </div>
                                <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-700">
                                    <div className="bg-emerald-500" style={{ width: `${safePercentage(explanation.reddit_explanation.positive_count, explanation.reddit_explanation.total_posts)}%` }}></div>
                                    <div className="bg-slate-500" style={{ width: `${safePercentage(explanation.reddit_explanation.neutral_count, explanation.reddit_explanation.total_posts)}%` }}></div>
                                    <div className="bg-rose-500" style={{ width: `${safePercentage(explanation.reddit_explanation.negative_count, explanation.reddit_explanation.total_posts)}%` }}></div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 block">Top Buzzwords</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {explanation.reddit_explanation.top_keywords.map((kw, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-slate-800/50 rounded text-[10px] text-slate-400 border border-slate-700/50">
                                                #{kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-sm text-slate-500">No Reddit data found.</p>
                                <p className="text-[10px] text-slate-600 mt-2 px-4 italic">Check if your Reddit API keys are set in the .env file.</p>
                            </div>
                        )}
                    </div>

                    {/* News Detail (GDELT) */}
                    <div className="bg-slate-800/20 rounded-xl border border-slate-800 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Newspaper size={18} className="text-blue-400" />
                            <h5 className="font-medium text-white">News Tone</h5>
                        </div>
                        {explanation.gdelt_explanation ? (
                            <div className="space-y-4">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-400">Coverage</span>
                                    <span className="text-slate-200">{explanation.gdelt_explanation.total_articles} articles</span>
                                </div>
                                <div className="flex gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-700">
                                    <div className="bg-emerald-500" style={{ width: `${safePercentage(explanation.gdelt_explanation.positive_count, explanation.gdelt_explanation.total_articles)}%` }}></div>
                                    <div className="bg-slate-500" style={{ width: `${safePercentage(explanation.gdelt_explanation.neutral_count, explanation.gdelt_explanation.total_articles)}%` }}></div>
                                    <div className="bg-rose-500" style={{ width: `${safePercentage(explanation.gdelt_explanation.negative_count, explanation.gdelt_explanation.total_articles)}%` }}></div>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-2 block">Key Sources</span>
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {explanation.gdelt_explanation.top_sources.map((src, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-slate-800/50 rounded text-[10px] text-slate-400 border border-slate-700/50">
                                                {src}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {explanation.gdelt_explanation.articles && explanation.gdelt_explanation.articles.length > 0 && (
                                    <div className="pt-4 border-t border-slate-800">
                                        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-3 block">Latest Articles</span>
                                        <div className="space-y-3">
                                            {explanation.gdelt_explanation.articles.map((article, i) => (
                                                <a
                                                    key={i}
                                                    href={article.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block group"
                                                >
                                                    <div className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/30 border border-transparent group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all">
                                                        <div className={`mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${article.tone > 0.1 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                            article.tone < -0.1 ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                                'bg-slate-500'
                                                            }`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs text-slate-200 group-hover:text-blue-400 font-medium line-clamp-2 transition-colors">
                                                                {article.title}
                                                            </p>
                                                            <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tighter">
                                                                {article.source}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="py-8 text-center">
                                <p className="text-sm text-slate-500">GDELT API temporarily unavailable.</p>
                                <p className="text-[10px] text-slate-600 mt-2 px-4 italic">This usually means the public GDELT server is rate-limiting. Wait 3-5 minutes and it will unlock.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SentimentExplanation;
