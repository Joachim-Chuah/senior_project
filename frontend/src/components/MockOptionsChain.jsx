import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const MAG7 = ['AAPL', 'MSFT', 'NVDA', 'META', 'GOOGL', 'AMZN', 'TSLA'];

const EXPIRATIONS = [
    { label: '1d',  days: 1  },
    { label: '5d',  days: 5  },
    { label: '14d', days: 14 },
    { label: '30d', days: 30 },
    { label: '60d', days: 60 },
];

function fmt(val, decimals = 2) {
    if (val == null) return '—';
    return Number(val).toFixed(decimals);
}

function pct(val) {
    if (val == null) return '—';
    return `${(Number(val) * 100).toFixed(1)}%`;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function deltaColor(delta) {
    const abs = Math.abs(delta);
    if (abs >= 0.6) return 'text-emerald-600 dark:text-emerald-400';
    if (abs >= 0.4) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-500 dark:text-gray-400';
}

function thetaColor(theta) {
    if (theta < -0.05) return 'text-red-600 dark:text-red-400';
    if (theta < -0.02) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-500 dark:text-gray-400';
}

// ─── Greek tooltip labels ─────────────────────────────────────────────────────

const GREEK_LABELS = {
    delta: 'Delta — price change per $1 move in the stock',
    gamma: 'Gamma — rate of change of delta',
    theta: 'Theta — daily time decay ($ lost per day)',
    vega:  'Vega — price change per 1% move in implied vol',
};

function Th({ children, title }) {
    return (
        <th title={title} className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide cursor-help">
            {children}
        </th>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MockOptionsChain() {
    const [ticker, setTicker]       = useState('AAPL');
    const [days, setDays]           = useState(5);
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    async function load(sym, d) {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/demo/options/${sym}?days=${d}`);
            setData(res.data);
        } catch (e) {
            setError('Failed to load options chain.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(ticker, days); }, [ticker, days]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Options Chain</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Prices and Greeks calculated with Black-Scholes · Demo mode
                    </p>
                </div>
                <button
                    onClick={() => load(ticker, days)}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Ticker selector */}
            <div className="flex flex-wrap gap-2">
                {MAG7.map(sym => (
                    <button
                        key={sym}
                        onClick={() => setTicker(sym)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-mono font-semibold border transition-all ${
                            ticker === sym
                                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                                : 'bg-white dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        {sym}
                    </button>
                ))}
            </div>

            {/* Expiration tabs */}
            <div className="flex gap-2">
                {EXPIRATIONS.map(exp => (
                    <button
                        key={exp.days}
                        onClick={() => setDays(exp.days)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                            days === exp.days
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                        }`}
                    >
                        {exp.label}
                    </button>
                ))}
            </div>

            {/* Meta bar */}
            {data && (
                <div className="flex flex-wrap gap-6 px-4 py-3 bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                        Spot <span className="font-semibold text-gray-900 dark:text-white font-mono">${fmt(data.spot)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                        IV <span className="font-semibold text-gray-900 dark:text-white font-mono">{pct(data.iv)}</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                        Expiry <span className="font-semibold text-gray-900 dark:text-white font-mono">{data.days}d</span>
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                        Risk-free <span className="font-semibold text-gray-900 dark:text-white font-mono">{pct(data.risk_free)}</span>
                    </span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-500/10 border border-dashed border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
                    ))}
                </div>
            )}

            {/* Options table */}
            {!loading && data && (
                <div className="overflow-x-auto rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-900/60">
                            <tr>
                                {/* Calls side */}
                                <Th title={GREEK_LABELS.vega}>Vega</Th>
                                <Th title={GREEK_LABELS.theta}>Theta</Th>
                                <Th title={GREEK_LABELS.gamma}>Gamma</Th>
                                <Th title={GREEK_LABELS.delta}>Δ Delta</Th>
                                <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Call</th>
                                {/* Strike */}
                                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide bg-gray-100 dark:bg-gray-800">Strike</th>
                                {/* Puts side */}
                                <th className="px-3 py-2 text-left text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide">Put</th>
                                <Th title={GREEK_LABELS.delta}>Δ Delta</Th>
                                <Th title={GREEK_LABELS.gamma}>Gamma</Th>
                                <Th title={GREEK_LABELS.theta}>Theta</Th>
                                <Th title={GREEK_LABELS.vega}>Vega</Th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {data.chain.map(row => {
                                const isATM = row.moneyness === 'ATM';
                                const rowBase = isATM
                                    ? 'bg-indigo-50 dark:bg-indigo-500/10 font-semibold'
                                    : 'bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900';
                                return (
                                    <tr key={row.strike} className={`${rowBase} transition-colors`}>
                                        {/* Call side */}
                                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(row.vega, 4)}</td>
                                        <td className={`px-3 py-2 text-right font-mono ${thetaColor(row.theta_call)}`}>{fmt(row.theta_call, 4)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(row.gamma, 6)}</td>
                                        <td className={`px-3 py-2 text-right font-mono ${deltaColor(row.call_delta)}`}>{fmt(row.call_delta, 4)}</td>
                                        <td className="px-3 py-2 text-right font-mono font-semibold text-emerald-700 dark:text-emerald-400">${fmt(row.call_price)}</td>
                                        {/* Strike */}
                                        <td className={`px-4 py-2 text-center font-mono font-bold bg-gray-100 dark:bg-gray-800 ${isATM ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                            ${fmt(row.strike)}
                                            {isATM && <span className="ml-1 text-xs text-indigo-400">ATM</span>}
                                        </td>
                                        {/* Put side */}
                                        <td className="px-3 py-2 text-left font-mono font-semibold text-red-600 dark:text-red-400">${fmt(row.put_price)}</td>
                                        <td className={`px-3 py-2 text-right font-mono ${deltaColor(row.put_delta)}`}>{fmt(row.put_delta, 4)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(row.gamma, 6)}</td>
                                        <td className={`px-3 py-2 text-right font-mono ${thetaColor(row.theta_put)}`}>{fmt(row.theta_put, 4)}</td>
                                        <td className="px-3 py-2 text-right font-mono text-gray-600 dark:text-gray-400">{fmt(row.vega, 4)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            <p className="text-xs text-gray-400 dark:text-gray-600 text-center">
                Hover column headers for Greek definitions · ATM = at-the-money · ITM = in-the-money · OTM = out-of-the-money
            </p>
        </div>
    );
}
