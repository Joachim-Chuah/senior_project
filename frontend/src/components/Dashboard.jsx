import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import SentimentExplanation from './SentimentExplanation';

const StatCard = ({ title, value, change, icon: Icon, trend }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
        <div className="flex justify-between items-start mb-4">
            <div>
                <p className="text-gray-400 text-sm font-medium">{title}</p>
                <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
            </div>
            <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                <Icon size={20} />
            </div>
        </div>
        <div className="flex items-center gap-2">
            {change > 0 ? (
                <ArrowUpRight size={16} className="text-green-500" />
            ) : (
                <ArrowDownRight size={16} className="text-red-500" />
            )}
            <span className={change > 0 ? 'text-green-500' : 'text-red-500'}>
                {Math.abs(change)}%
            </span>
            <span className="text-gray-500 text-sm">vs last 24h</span>
        </div>
    </div>
);

const Dashboard = () => {
    const [health, setHealth] = useState(null);
    const [summary, setSummary] = useState(null);
    const [timeseries, setTimeseries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ticker, setTicker] = useState('AAPL');
    const [searchInput, setSearchInput] = useState('AAPL');

    const handleSearch = (e) => {
        e.preventDefault();
        const cleanTicker = searchInput.trim().toUpperCase();
        if (cleanTicker) {
            setTicker(cleanTicker);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Health
                const healthRes = await axios.get('http://localhost:8000/api/health');
                setHealth(healthRes.data);

                // Fetch Summary
                const summaryRes = await axios.get(`http://localhost:8000/api/sentiment/summary/${ticker}`);
                setSummary(summaryRes.data);

                // Fetch Timeseries
                const tsRes = await axios.get(`http://localhost:8000/api/fusion/timeseries/${ticker}`);
                const formattedData = tsRes.data.data.map(item => {
                    const ts = item.timestamp;
                    const date = new Date(ts.endsWith('Z') || ts.includes('+') ? ts : `${ts}Z`);
                    return {
                        name: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        value: item.fusion_sentiment
                    };
                });
                setTimeseries(formattedData);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        // Optional: Set up polling
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [ticker]);

    return (
        <div className="p-8 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-bold text-white">Market Overview</h2>
                    <p className="text-gray-400 mt-2">Real-time market sentiment and options analysis for <span className="text-indigo-400 font-mono font-bold tracking-wider">{ticker}</span></p>
                </div>

                <form onSubmit={handleSearch} className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Enter Ticker (e.g. TSLA)"
                            className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 w-48 focus:outline-none focus:border-indigo-500 transition-colors uppercase font-mono"
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/20"
                    >
                        Search
                    </button>
                </form>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Sentiment Score"
                    value={summary ? summary.current_fusion_score.toFixed(2) : '0.00'}
                    change={summary ? parseFloat((summary.trend * 100).toFixed(1)) : 0}
                    icon={Activity}
                    trend={summary && summary.trend >= 0 ? 'up' : 'down'}
                />
                <StatCard
                    title="System Status"
                    value={loading && !health ? 'Checking...' : (health?.status || 'Offline')}
                    change={0}
                    icon={Activity}
                    trend="up"
                />
                <StatCard
                    title="Market Regime"
                    value={summary ? summary.regime.toUpperCase() : 'NEUTRAL'}
                    change={0}
                    icon={DollarSign}
                    trend={summary?.regime === 'bullish' ? 'up' : 'down'}
                />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* Trend Chart */}
                <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                    <h3 className="text-xl font-bold text-white mb-6">Sentiment Trend</h3>
                    <div className="h-[400px] w-full">
                        {timeseries.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={timeseries}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="name" stroke="#9CA3AF" />
                                    <YAxis domain={[-1, 1]} stroke="#9CA3AF" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '0.5rem' }}
                                        itemStyle={{ color: '#E5E7EB' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#3B82F6"
                                        strokeWidth={3}
                                        dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500">
                                No historical data available yet.
                            </div>
                        )}
                    </div>
                </div>

                {/* Explanation Card */}
                <SentimentExplanation ticker={ticker} />
            </div>
        </div>
    );
};

export default Dashboard;
