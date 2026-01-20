import React, { useState } from 'react';
import { Search, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const OptionsChain = () => {
    const [ticker, setTicker] = useState('SPY');
    const [searchInput, setSearchInput] = useState('SPY');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);

    const fetchOptions = async (tickerToFetch) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/options/chain/${tickerToFetch}`);
            setData(res.data);
        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error('Error fetching options chain:', err);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setValidationError(null);

        const validation = validateTicker(searchInput);
        if (!validation.isValid) {
            setValidationError(validation.error);
            return;
        }

        setTicker(validation.ticker);
        fetchOptions(validation.ticker);
    };

    return (
        <div className="p-8">
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-white">Options Chain</h2>
                        <p className="text-gray-400 mt-2">Real-time options data and Greeks for <span className="text-indigo-400 font-mono font-bold tracking-wider">{ticker}</span></p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => {
                                        setSearchInput(e.target.value.toUpperCase());
                                        setValidationError(null);
                                    }}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSearch();
                                        }
                                    }}
                                    className={`bg-gray-800 border ${validationError ? 'border-red-500' : 'border-gray-700'} text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-mono uppercase`}
                                    placeholder="Enter Ticker"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className={`bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Load Chain <ArrowRight size={16} />
                            </button>
                        </div>
                        {validationError && (
                            <p className="text-red-400 text-sm">{validationError}</p>
                        )}
                    </div>
                </div>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="text-red-400" size={20} />
                        <div>
                            <p className="text-red-400 font-medium">Error Loading Options Chain</p>
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    </div>
                )}
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : data ? (
                <>
                    <div className="mb-6 bg-gray-800/50 rounded-lg p-4 flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Current Price</p>
                            <p className="text-2xl font-bold text-white">${data.current_price?.toFixed(2) || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Expiration</p>
                            <p className="text-lg font-medium text-white">{data.expiration_date || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                                <h3 className="text-lg font-bold text-green-400">Calls</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900/30 text-gray-400">
                                        <tr>
                                            <th className="p-3">Strike</th>
                                            <th className="p-3">Last</th>
                                            <th className="p-3">Bid</th>
                                            <th className="p-3">Ask</th>
                                            <th className="p-3">Vol</th>
                                            <th className="p-3">Delta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-300">
                                        {data.calls && data.calls.length > 0 ? (
                                            data.calls.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                                    <td className="p-3 font-medium">${row.strike?.toFixed(2)}</td>
                                                    <td className="p-3">${row.last_price?.toFixed(2) || '0.00'}</td>
                                                    <td className="p-3 text-green-400">${row.bid?.toFixed(2) || '0.00'}</td>
                                                    <td className="p-3 text-red-400">${row.ask?.toFixed(2) || '0.00'}</td>
                                                    <td className="p-3">{row.volume?.toLocaleString() || '0'}</td>
                                                    <td className="p-3">{row.delta?.toFixed(3) || 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-500">
                                                    No call options available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                            <div className="p-4 bg-gray-900/50 border-b border-gray-700">
                                <h3 className="text-lg font-bold text-red-400">Puts</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-900/30 text-gray-400">
                                        <tr>
                                            <th className="p-3">Strike</th>
                                            <th className="p-3">Last</th>
                                            <th className="p-3">Bid</th>
                                            <th className="p-3">Ask</th>
                                            <th className="p-3">Vol</th>
                                            <th className="p-3">Delta</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-300">
                                        {data.puts && data.puts.length > 0 ? (
                                            data.puts.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                                                    <td className="p-3 font-medium">${row.strike?.toFixed(2)}</td>
                                                    <td className="p-3">${row.last_price?.toFixed(2) || '0.00'}</td>
                                                    <td className="p-3 text-green-400">${row.bid?.toFixed(2) || '0.00'}</td>
                                                    <td className="p-3 text-red-400">${row.ask?.toFixed(2) || '0.00'}</td>
                                                    <td className="p-3">{row.volume?.toLocaleString() || '0'}</td>
                                                    <td className="p-3">{row.delta?.toFixed(3) || 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="p-8 text-center text-gray-500">
                                                    No put options available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-500 mt-20">
                    <p>Enter a ticker and click "Load Chain" to view options data</p>
                </div>
            )}
        </div>
    );
};

export default OptionsChain;
