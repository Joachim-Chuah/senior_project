import React, { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import axios from 'axios';

const OptionsChain = () => {
    const [ticker, setTicker] = useState('SPY');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            // In a real scenario, we would fetch from the backend
            // const res = await axios.get(`/api/options/chain/${ticker}`);
            // setData(res.data);

            // Mock data for demo
            await new Promise(resolve => setTimeout(resolve, 1000));
            setData({
                calls: [
                    { strike: 450, last: 12.5, bid: 12.4, ask: 12.6, vol: 1500, oi: 5000 },
                    { strike: 455, last: 8.2, bid: 8.1, ask: 8.3, vol: 2500, oi: 8000 },
                    { strike: 460, last: 5.1, bid: 5.0, ask: 5.2, vol: 4500, oi: 12000 },
                ],
                puts: [
                    { strike: 450, last: 4.2, bid: 4.1, ask: 4.3, vol: 3500, oi: 9000 },
                    { strike: 455, last: 6.8, bid: 6.7, ask: 6.9, vol: 2100, oi: 6000 },
                    { strike: 460, last: 9.5, bid: 9.4, ask: 9.6, vol: 1200, oi: 4000 },
                ]
            });
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-white">Options Chain</h2>
                    <p className="text-gray-400 mt-2">Real-time options data and Greeks</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={ticker}
                            onChange={(e) => setTicker(e.target.value.toUpperCase())}
                            className="bg-gray-800 border border-gray-700 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                            placeholder="Enter Ticker"
                        />
                    </div>
                    <button
                        onClick={fetchOptions}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        Load Chain <ArrowRight size={16} />
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                            <h3 className="text-lg font-bold text-green-400">Calls</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/30 text-gray-400 text-sm">
                                    <tr>
                                        <th className="p-4">Strike</th>
                                        <th className="p-4">Last</th>
                                        <th className="p-4">Bid</th>
                                        <th className="p-4">Ask</th>
                                        <th className="p-4">Vol</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {data.calls.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="p-4 font-medium">{row.strike}</td>
                                            <td className="p-4">{row.last}</td>
                                            <td className="p-4 text-green-400">{row.bid}</td>
                                            <td className="p-4 text-red-400">{row.ask}</td>
                                            <td className="p-4">{row.vol}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                        <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                            <h3 className="text-lg font-bold text-red-400">Puts</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-900/30 text-gray-400 text-sm">
                                    <tr>
                                        <th className="p-4">Strike</th>
                                        <th className="p-4">Last</th>
                                        <th className="p-4">Bid</th>
                                        <th className="p-4">Ask</th>
                                        <th className="p-4">Vol</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-300">
                                    {data.puts.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                            <td className="p-4 font-medium">{row.strike}</td>
                                            <td className="p-4">{row.last}</td>
                                            <td className="p-4 text-green-400">{row.bid}</td>
                                            <td className="p-4 text-red-400">{row.ask}</td>
                                            <td className="p-4">{row.vol}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-20">
                    <p>Enter a ticker and click Load Chain to view options data</p>
                </div>
            )}
        </div>
    );
};

export default OptionsChain;
