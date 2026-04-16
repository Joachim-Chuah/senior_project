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

function deltaColor(delta) {
    const abs = Math.abs(delta);
    if (abs >= 0.6) return 'text-emerald-600 dark:text-emerald-400';
    if (abs >= 0.4) return 'text-amber-600 dark:text-amber-400';
    return '';
}

function thetaColor(theta) {
    if (theta < -0.05) return 'text-red-500';
    if (theta < -0.02) return 'text-amber-500';
    return '';
}

const GREEK_LABELS = {
    delta: 'Delta — price change per $1 move in the stock',
    gamma: 'Gamma — rate of change of delta',
    theta: 'Theta — daily time decay ($ lost per day)',
    vega:  'Vega — price change per 1% move in implied vol',
};

function Th({ children, title, align = 'right' }) {
    return (
        <th
            title={title}
            className={`px-4 py-4 text-${align} text-sm font-semibold uppercase tracking-wide cursor-help`}
            style={{ color: 'var(--text-muted)' }}
        >
            {children}
        </th>
    );
}

export default function MockOptionsChain() {
    const [ticker, setTicker]   = useState('AAPL');
    const [days, setDays]       = useState(5);
    const [data, setData]       = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState(null);

    async function load(sym, d) {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/demo/options/${sym}?days=${d}`);
            setData(res.data);
        } catch {
            setError('Failed to load options chain.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(ticker, days); }, [ticker, days]);

    return (
        <div className="max-w-screen-2xl mx-auto px-8 py-10 space-y-8">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-bold" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
                        Options Chain
                    </h1>
                    <p className="text-base mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        Black-Scholes pricing · Demo mode
                    </p>
                </div>
                <button
                    onClick={() => load(ticker, days)}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 text-base rounded-xl transition-all duration-200"
                    style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Ticker selector */}
            <div className="flex flex-wrap gap-3">
                {MAG7.map(sym => (
                    <button
                        key={sym}
                        onClick={() => setTicker(sym)}
                        className="px-5 py-2.5 rounded-lg text-base font-mono font-semibold transition-all duration-200"
                        style={ticker === sym ? {
                            backgroundColor: 'var(--accent)',
                            color: 'var(--accent-text)',
                            border: '1px solid var(--accent)',
                        } : {
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                        }}
                        onMouseEnter={e => { if (ticker !== sym) e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                        onMouseLeave={e => { if (ticker !== sym) e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        {sym}
                    </button>
                ))}
            </div>

            {/* Expiration tabs */}
            <div className="flex gap-3">
                {EXPIRATIONS.map(exp => (
                    <button
                        key={exp.days}
                        onClick={() => setDays(exp.days)}
                        className="px-5 py-2.5 rounded-lg text-base font-semibold transition-all duration-200"
                        style={days === exp.days ? {
                            backgroundColor: 'var(--accent)',
                            color: 'var(--accent-text)',
                            border: '1px solid var(--accent)',
                        } : {
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-muted)',
                        }}
                        onMouseEnter={e => { if (days !== exp.days) e.currentTarget.style.borderColor = 'var(--border-hover)'; }}
                        onMouseLeave={e => { if (days !== exp.days) e.currentTarget.style.borderColor = 'var(--border)'; }}
                    >
                        {exp.label}
                    </button>
                ))}
            </div>

            {/* Meta bar */}
            {data && (
                <div
                    className="flex flex-wrap gap-8 px-6 py-4 rounded-xl text-base theme-transition"
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                    {[
                        ['Spot',      `$${fmt(data.spot)}`],
                        ['IV',        pct(data.iv)],
                        ['Expiry',    `${data.days}d`],
                        ['Risk-free', pct(data.risk_free)],
                    ].map(([label, value]) => (
                        <span key={label} style={{ color: 'var(--text-muted)' }}>
                            {label}{' '}
                            <span className="font-semibold font-mono" style={{ color: 'var(--text)' }}>
                                {value}
                            </span>
                        </span>
                    ))}
                </div>
            )}

            {/* Error */}
            {error && (
                <div
                    className="flex items-center gap-2 p-4 rounded-xl text-sm"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444' }}
                >
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}

            {/* Loading skeleton */}
            {loading && (
                <div className="space-y-2">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="h-10 rounded-lg skeleton" />
                    ))}
                </div>
            )}

            {/* Options table */}
            {!loading && data && (
                <div
                    className="overflow-x-auto rounded-2xl"
                    style={{ border: '1px solid var(--border)' }}
                >
                    <table className="w-full text-base">
                        <thead>
                            <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                <Th title={GREEK_LABELS.vega}>Vega</Th>
                                <Th title={GREEK_LABELS.theta}>Theta</Th>
                                <Th title={GREEK_LABELS.gamma}>Gamma</Th>
                                <Th title={GREEK_LABELS.delta}>Δ Delta</Th>
                                <th className="px-4 py-4 text-right text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                                    Call
                                </th>
                                <th
                                    className="px-5 py-4 text-center text-sm font-semibold uppercase tracking-wide"
                                    style={{ color: 'var(--text)', background: 'var(--surface-2)' }}
                                >
                                    Strike
                                </th>
                                <th className="px-4 py-4 text-left text-sm font-semibold uppercase tracking-wide text-red-500">
                                    Put
                                </th>
                                <Th title={GREEK_LABELS.delta}>Δ Delta</Th>
                                <Th title={GREEK_LABELS.gamma}>Gamma</Th>
                                <Th title={GREEK_LABELS.theta}>Theta</Th>
                                <Th title={GREEK_LABELS.vega}>Vega</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.chain.map((row, idx) => {
                                const isATM = row.moneyness === 'ATM';
                                return (
                                    <tr
                                        key={row.strike}
                                        className="transition-colors duration-150"
                                        style={isATM ? {
                                            background: 'rgba(212,170,125,0.15)',
                                            fontWeight: 600,
                                            borderBottom: '1px solid var(--border)',
                                        } : {
                                            borderBottom: '1px solid var(--border)',
                                        }}
                                        onMouseEnter={e => { if (!isATM) e.currentTarget.style.background = 'var(--surface-2)'; }}
                                        onMouseLeave={e => { if (!isATM) e.currentTarget.style.background = ''; }}
                                    >
                                        <td className="px-4 py-3.5 text-right font-mono text-sm" style={{ color: 'var(--text)' }}>{fmt(row.vega, 4)}</td>
                                        <td className={`px-4 py-3.5 text-right font-mono text-sm ${thetaColor(row.theta_call)}`} style={!thetaColor(row.theta_call) ? { color: 'var(--text)' } : {}}>{fmt(row.theta_call, 4)}</td>
                                        <td className="px-4 py-3.5 text-right font-mono text-sm" style={{ color: 'var(--text)' }}>{fmt(row.gamma, 6)}</td>
                                        <td className={`px-4 py-3.5 text-right font-mono text-sm ${deltaColor(row.call_delta)}`} style={!deltaColor(row.call_delta) ? { color: 'var(--text)' } : {}}>{fmt(row.call_delta, 4)}</td>
                                        <td className="px-4 py-3.5 text-right font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">${fmt(row.call_price)}</td>
                                        <td
                                            className="px-5 py-3.5 text-center font-mono text-sm font-bold"
                                            style={{ background: 'var(--surface-2)', color: isATM ? 'var(--accent)' : 'var(--text)' }}
                                        >
                                            ${fmt(row.strike)}
                                            {isATM && <span className="ml-1.5 text-xs opacity-60">ATM</span>}
                                        </td>
                                        <td className="px-4 py-3.5 text-left font-mono text-sm font-semibold text-red-500">${fmt(row.put_price)}</td>
                                        <td className={`px-4 py-3.5 text-right font-mono text-sm ${deltaColor(row.put_delta)}`} style={!deltaColor(row.put_delta) ? { color: 'var(--text)' } : {}}>{fmt(row.put_delta, 4)}</td>
                                        <td className="px-4 py-3.5 text-right font-mono text-sm" style={{ color: 'var(--text)' }}>{fmt(row.gamma, 6)}</td>
                                        <td className={`px-4 py-3.5 text-right font-mono text-sm ${thetaColor(row.theta_put)}`} style={!thetaColor(row.theta_put) ? { color: 'var(--text)' } : {}}>{fmt(row.theta_put, 4)}</td>
                                        <td className="px-4 py-3.5 text-right font-mono text-sm" style={{ color: 'var(--text)' }}>{fmt(row.vega, 4)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <p className="text-sm text-center" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                Hover column headers for Greek definitions · ATM = at-the-money · ITM = in-the-money · OTM = out-of-the-money
            </p>
        </div>
    );
}
