import React, { useState, useEffect } from 'react';
import { MessageCircle, Globe, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { validateTicker, formatSentiment } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const SentimentCard = ({ source, score, volume, icon: Icon, color }) => {
    const displayScore = score !== null && score !== undefined ? formatSentiment(score) : '0.00';
    const scoreValue = score || 0;
    const barWidth = Math.min(Math.abs(scoreValue * 50) + 50, 100); // Center at 50%, range 0-100%

    return (
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">{source}</h3>
                    <p className="text-gray-400 text-sm">Real-time analysis</p>
                </div>
            </div>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Sentiment Score</span>
                        <span className={`font-medium ${scoreValue > 0.1 ? 'text-green-400' : scoreValue < -0.1 ? 'text-red-400' : 'text-gray-400'}`}>
                            {displayScore}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden relative">
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600"></div>
                        <div
                            className={`h-full transition-all ${scoreValue > 0 ? 'bg-green-500' : scoreValue < 0 ? 'bg-red-500' : 'bg-gray-600'}`}
                            style={{ width: `${barWidth}%` }}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400 text-sm">Volume</span>
                    <span className="text-white font-bold">{volume}</span>
                </div>
            </div>
        </div>
    );
};

const SentimentView = () => {
    const [ticker, setTicker] = useState('AAPL');
    const [searchInput, setSearchInput] = useState('AAPL');
    const [summary, setSummary] = useState(null);
    const [spikes, setSpikes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);

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

    useEffect(() => {
        const fetchSentimentData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Fetch sentiment summary
                const summaryRes = await api.get(`/sentiment/summary/${ticker}`);
                setSummary(summaryRes.data);

                // Fetch sentiment spikes
                try {
                    const spikesRes = await api.get(`/fusion/spikes/${ticker}`);
                    setSpikes(spikesRes.data.spikes || []);
                } catch (spikeErr) {
                    console.warn('Spikes data not available:', spikeErr);
                    setSpikes([]);
                }

            } catch (err) {
                const errorMsg = getErrorMessage(err);
                setError(errorMsg);
                console.error('Error fetching sentiment data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSentimentData();

        // Poll for updates every 60 seconds
        const interval = setInterval(fetchSentimentData, 60000);
        return () => clearInterval(interval);
    }, [ticker]);

    return (
        <div className="p-8">
            <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white">Sentiment Analysis</h2>
                    <p className="text-gray-400 mt-2">Aggregated sentiment from social media and news for <span className="text-indigo-400 font-mono font-bold tracking-wider">{ticker}</span></p>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setValidationError(null);
                            }}
                            placeholder="Enter Ticker (e.g. TSLA)"
                            className={`bg-gray-800 border ${validationError ? 'border-red-500' : 'border-gray-700'} text-white rounded-lg px-4 py-2 w-48 focus:outline-none focus:border-indigo-500 transition-colors uppercase font-mono`}
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            Search
                        </button>
                    </div>
                    {validationError && (
                        <p className="text-red-400 text-sm">{validationError}</p>
                    )}
                </form>
            </header>

            {error && (
                <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                    <AlertCircle className="text-red-400" size={20} />
                    <div>
                        <p className="text-red-400 font-medium">Error Loading Data</p>
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {loading && !summary ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : summary ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <SentimentCard
                            source="Reddit"
                            score={summary.reddit_score}
                            volume={`${summary.reddit_posts || 0} posts`}
                            icon={MessageCircle}
                            color="bg-orange-500/10 text-orange-500"
                        />
                        <SentimentCard
                            source="GDELT News"
                            score={summary.gdelt_score}
                            volume={`${summary.gdelt_articles || 0} articles`}
                            icon={Globe}
                            color="bg-blue-500/10 text-blue-500"
                        />
                        <SentimentCard
                            source="Fusion Index"
                            score={summary.current_fusion_score}
                            volume="Aggregated"
                            icon={TrendingUp}
                            color="bg-purple-500/10 text-purple-500"
                        />
                    </div>

                    <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Recent Sentiment Spikes</h3>
                        {spikes.length > 0 ? (
                            <div className="space-y-4">
                                {spikes.slice(0, 5).map((spike, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-2 h-2 rounded-full ${spike.spike_type === 'positive' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="text-white font-medium">
                                                    {spike.spike_type === 'positive' ? 'Bullish' : 'Bearish'} Spike Detected
                                                </p>
                                                <p className="text-gray-500 text-sm">
                                                    Sentiment: {formatSentiment(spike.sentiment_value)} | Z-Score: {spike.z_score.toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-gray-500 text-sm">
                                            {new Date(spike.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No significant sentiment spikes detected recently
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="text-center py-20 text-gray-500">
                    Enter a ticker symbol to view sentiment analysis
                </div>
            )}
        </div>
    );
};

export default SentimentView;
