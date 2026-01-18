import React from 'react';
import { MessageCircle, Globe, TrendingUp } from 'lucide-react';

const SentimentCard = ({ source, score, volume, icon: Icon, color }) => (
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
                    <span className="text-white font-medium">{score}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${score > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.abs(score * 100)}%` }}
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

const SentimentView = () => {
    return (
        <div className="p-8">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-white">Sentiment Analysis</h2>
                <p className="text-gray-400 mt-2">Aggregated sentiment from social media and news</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SentimentCard
                    source="Reddit (WSB)"
                    score={0.65}
                    volume="12.5k posts"
                    icon={MessageCircle}
                    color="bg-orange-500/10 text-orange-500"
                />
                <SentimentCard
                    source="GDELT News"
                    score={-0.23}
                    volume="8.2k articles"
                    icon={Globe}
                    color="bg-blue-500/10 text-blue-500"
                />
                <SentimentCard
                    source="Fusion Index"
                    score={0.42}
                    volume="Aggregated"
                    icon={TrendingUp}
                    color="bg-purple-500/10 text-purple-500"
                />
            </div>

            <div className="mt-8 bg-gray-800 p-6 rounded-xl border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-4">Recent Signals</h3>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700/50">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <div>
                                    <p className="text-white font-medium">Bullish Spike Detected</p>
                                    <p className="text-gray-500 text-sm">High volume on $SPY calls correlated with Reddit sentiment</p>
                                </div>
                            </div>
                            <span className="text-gray-500 text-sm">2m ago</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SentimentView;
