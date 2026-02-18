import React, { useState } from 'react';
import { Search, ArrowRight, AlertCircle, Calendar, ChevronDown } from 'lucide-react';
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
    const [selectedExpiration, setSelectedExpiration] = useState('');

    const fetchOptions = async (tickerToFetch, expiration = null) => {
        setLoading(true);
        setError(null);
        try {
            const url = expiration
                ? `/options/chain/${tickerToFetch}?expiration=${expiration}`
                : `/options/chain/${tickerToFetch}`;
            const res = await api.get(url);
            setData(res.data);
            if (res.data.expiration_date) setSelectedExpiration(res.data.expiration_date);
        } catch (err) {
            setError(getErrorMessage(err));
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
        setSelectedExpiration('');
        fetchOptions(validation.ticker);
    };

    const handleExpirationChange = (e) => {
        const newExpiration = e.target.value;
        setSelectedExpiration(newExpiration);
        fetchOptions(ticker, newExpiration);
    };

    return (
        <div className="p-6 lg:p-8">
            {/* Header */}
            <header className="mb-6 pb-6 border-b border-dashed border-gray-300 dark:border-gray-700">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Options Chain</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            Real-time options data for{' '}
                            <span className="font-mono font-semibold text-gray-800 dark:text-indigo-400">{ticker}</span>
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                        <div className="flex gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    value={searchInput}
                                    onChange={(e) => {
                                        setSearchInput(e.target.value.toUpperCase());
                                        setValidationError(null);
                                    }}
                                    onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                    className={`bg-white dark:bg-gray-800 border border-dashed ${validationError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-white pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400/20 font-mono uppercase text-sm w-32 theme-transition`}
                                    placeholder="Ticker"
                                />
                            </div>
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className="bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Load <ArrowRight size={13} />
                            </button>
                        </div>
                        {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/30 rounded-lg p-4 flex items-center gap-3">
                        <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={17} />
                        <div>
                            <p className="text-red-700 dark:text-red-400 font-medium text-sm">Error Loading Options Chain</p>
                            <p className="text-red-500 dark:text-red-300 text-xs mt-0.5">{error}</p>
                        </div>
                    </div>
                )}
            </header>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-800 dark:border-white"></div>
                </div>
            ) : data ? (
                <>
                    {/* Info Bar */}
                    <div className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 flex items-center justify-between theme-transition">
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Current Price</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                                ${data.current_price?.toFixed(2) || 'N/A'}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Expiration</p>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
                                <select
                                    value={selectedExpiration}
                                    onChange={handleExpirationChange}
                                    disabled={loading}
                                    className="bg-stone-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white pl-8 pr-7 py-2 rounded-lg focus:outline-none appearance-none cursor-pointer min-w-[160px] text-sm theme-transition"
                                >
                                    {data.available_expirations?.map((exp) => (
                                        <option key={exp} value={exp}>{exp}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" size={13} />
                            </div>
                        </div>
                    </div>

                    {/* Tables */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Calls */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
                            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">Calls</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 dark:bg-gray-800/60">
                                            {['Strike', 'Last', 'Bid', 'Ask', 'Vol', 'Delta'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-gray-800">
                                        {data.calls && data.calls.length > 0 ? (
                                            data.calls.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-stone-50 dark:hover:bg-gray-800/60 transition-colors">
                                                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white font-mono">${row.strike?.toFixed(2)}</td>
                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">${row.last_price?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-2.5 text-emerald-700 dark:text-emerald-400 font-mono">${row.bid?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-2.5 text-red-700 dark:text-red-400 font-mono">${row.ask?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">{row.volume?.toLocaleString() || '0'}</td>
                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">{row.delta?.toFixed(3) || 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No call options available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Puts */}
                        <div className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 overflow-hidden theme-transition">
                            <div className="px-4 py-3 border-b border-dashed border-gray-200 dark:border-gray-700">
                                <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Puts</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-stone-50 dark:bg-gray-800/60">
                                            {['Strike', 'Last', 'Bid', 'Ask', 'Vol', 'Delta'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 dark:divide-gray-800">
                                        {data.puts && data.puts.length > 0 ? (
                                            data.puts.slice(0, 10).map((row, i) => (
                                                <tr key={i} className="hover:bg-stone-50 dark:hover:bg-gray-800/60 transition-colors">
                                                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-white font-mono">${row.strike?.toFixed(2)}</td>
                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">${row.last_price?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-2.5 text-emerald-700 dark:text-emerald-400 font-mono">${row.bid?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-2.5 text-red-700 dark:text-red-400 font-mono">${row.ask?.toFixed(2) || '0.00'}</td>
                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">{row.volume?.toLocaleString() || '0'}</td>
                                                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300 font-mono">{row.delta?.toFixed(3) || 'N/A'}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-400 dark:text-gray-500 text-sm">No put options available</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="text-center text-gray-400 dark:text-gray-500 mt-20 text-sm">
                    <p>Enter a ticker and click "Load" to view options data</p>
                </div>
            )}
        </div>
    );
};

export default OptionsChain;
