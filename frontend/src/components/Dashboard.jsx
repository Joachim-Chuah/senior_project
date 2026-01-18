import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkHealth = async () => {
            try {
                const res = await axios.get('/api/health');
                setHealth(res.data);
            } catch (err) {
                console.error('Health check failed:', err);
            } finally {
                setLoading(false);
            }
        };
        checkHealth();
    }, []);

    // Mock data for the chart
    const data = [
        { name: '09:00', value: 4000 },
        { name: '10:00', value: 3000 },
        { name: '11:00', value: 2000 },
        { name: '12:00', value: 2780 },
        { name: '13:00', value: 1890 },
        { name: '14:00', value: 2390 },
        { name: '15:00', value: 3490 },
    ];

    return (
        <div className="p-8">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white">Market Overview</h2>
                <p className="text-gray-400 mt-2">Real-time market sentiment and options analysis</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard
                    title="Sentiment Score"
                    value="0.85"
                    change={12.5}
                    icon={Activity}
                    trend="up"
                />
                <StatCard
                    title="Call/Put Ratio"
                    value="1.24"
                    change={-2.4}
                    icon={DollarSign}
                    trend="down"
                />
                <StatCard
                    title="System Status"
                    value={loading ? 'Checking...' : (health?.status || 'Offline')}
                    change={0}
                    icon={Activity}
                    trend="up"
                />
            </div>

            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-6">Sentiment Trend</h3>
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9CA3AF" />
                            <YAxis stroke="#9CA3AF" />
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
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
