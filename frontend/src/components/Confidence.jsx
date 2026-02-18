import React, { useState, useEffect } from 'react';
import {
    BrainCircuit,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const HORIZONS = [
    { label: '1d',  value: 1 },
    { label: '3d',  value: 3 },
    { label: '5d',  value: 5 },
    { label: '14d', value: 14 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

const WarmingBanner = () => (
    <div className="bg-amber-50 dark:bg-amber-500/10 border border-dashed border-amber-300 dark:border-amber-500/30 rounded-xl px-4 py-3 flex items-start gap-3">
        <span className="text-amber-500 dark:text-amber-400 mt-0.5 text-base leading-none">⚙</span>
        <div>
            <p className="text-amber-700 dark:text-amber-300 font-semibold text-sm">Warming up — collecting data</p>
            <p className="text-amber-600 dark:text-amber-400/80 text-xs mt-0.5">
                Rule-based weights active. Model switches to fitted logistic regression after 30 observations.
            </p>
        </div>
    </div>
);

const MetricCard = ({ label, children }) => (
    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 flex flex-col gap-2">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</p>
        {children}
    </div>
);

const ConfidenceBar = ({ value }) => {
    const pct = Math.max(0, Math.min(100, value));
    const color =
        pct >= 65 ? 'bg-emerald-500 dark:bg-emerald-400'
        : pct <= 35 ? 'bg-red-500 dark:bg-red-400'
        : 'bg-amber-400 dark:bg-amber-300';

    return (
        <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            <div
                className={`h-full rounded-full transition-all duration-500 ${color}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
};

const DriverRow = ({ driver }) => {
    const isBullish = driver.direction === 'bullish';
    const dot = isBullish
        ? 'bg-emerald-500 dark:bg-emerald-400'
        : 'bg-red-500 dark:bg-red-400';
    const pct = `${isBullish ? '+' : ''}${(driver.weight * 100).toFixed(0)}%`;
    const pctColor = isBullish
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400';

    return (
        <div className="flex items-center gap-3 py-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-200">{driver.label}</span>
            <span className={`text-sm font-mono font-semibold ${pctColor}`}>{pct}</span>
        </div>
    );
};

const FeatureRow = ({ label, value }) => {
    if (value === null || value === undefined) return null;
    return (
        <div className="flex items-center justify-between py-1.5 border-b border-dashed border-gray-100 dark:border-gray-800 last:border-0">
            <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{label}</span>
            <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">
                {typeof value === 'number' ? value.toFixed(4) : String(value)}
            </span>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const Confidence = () => {
    const [searchInput, setSearchInput] = useState('AAPL');
    const [ticker, setTicker] = useState('AAPL');
    const [horizon, setHorizon] = useState(1);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const [featuresOpen, setFeaturesOpen] = useState(false);

    const runAnalysis = async (t, h) => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/confidence/analyze', { ticker: t, horizon: h });
            setResult(res.data);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setValidationError(null);
        const v = validateTicker(searchInput);
        if (!v.isValid) { setValidationError(v.error); return; }
        setTicker(v.ticker);
        setResult(null);
        runAnalysis(v.ticker, horizon);
    };

    const handleHorizonChange = (h) => {
        setHorizon(h);
        if (result) runAnalysis(ticker, h);
    };

    // Run on first mount with defaults
    useEffect(() => { runAnalysis(ticker, horizon); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const isUp = result?.direction === 'up';

    return (
        <div className="p-6 lg:p-8 min-h-screen bg-cream dark:bg-gray-950 theme-transition">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-dashed border-gray-300 dark:border-gray-700">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <BrainCircuit className="text-gray-500 dark:text-gray-400" size={22} />
                        Confidence
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Directional signal &amp; calibrated probability for{' '}
                        <span className="font-mono font-semibold text-gray-800 dark:text-indigo-400">{ticker}</span>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {/* Ticker input */}
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => { setSearchInput(e.target.value.toUpperCase()); setValidationError(null); }}
                            placeholder="Ticker"
                            className={`bg-white dark:bg-gray-800 border border-dashed ${validationError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-white rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-gray-400/20 uppercase font-mono text-sm theme-transition`}
                        />

                        {/* Horizon selector */}
                        <div className="flex items-center bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                            {HORIZONS.map((h) => (
                                <button
                                    key={h.value}
                                    type="button"
                                    onClick={() => handleHorizonChange(h.value)}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                                        horizon === h.value
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {h.label}
                                </button>
                            ))}
                        </div>

                        {/* Analyze button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <BrainCircuit size={13} />}
                            Analyze
                        </button>
                    </div>
                    {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
                </form>
            </header>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-5">
                    <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={15} />
                    <div>
                        <p className="text-red-700 dark:text-red-400 font-semibold text-sm">Error</p>
                        <p className="text-red-500 dark:text-red-300 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && !result && (
                <div className="flex items-center justify-center py-24 text-gray-400 dark:text-gray-500 gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Fetching data &amp; computing signal…</span>
                </div>
            )}

            {/* Results */}
            {result && !loading && (
                <div className="space-y-4">
                    {/* Warming-up banner */}
                    {result.model_mode === 'warming_up' && <WarmingBanner />}

                    {/* Three metric cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Direction */}
                        <MetricCard label="Direction">
                            <div className={`flex items-center gap-2 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {isUp
                                    ? <TrendingUp size={28} strokeWidth={2} />
                                    : <TrendingDown size={28} strokeWidth={2} />
                                }
                                <span className="text-3xl font-bold uppercase">{result.direction}</span>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                                {result.company_name}
                            </p>
                        </MetricCard>

                        {/* Confidence */}
                        <MetricCard label="Confidence">
                            <div className="flex items-end gap-1">
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {Math.round(result.confidence)}
                                </span>
                                <span className="text-base text-gray-400 dark:text-gray-500 mb-0.5">/ 100</span>
                            </div>
                            <ConfidenceBar value={result.confidence} />
                            {result.brier_score !== null && result.brier_score !== undefined && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                    Brier: {result.brier_score.toFixed(3)}
                                </p>
                            )}
                        </MetricCard>

                        {/* Expected Move */}
                        <MetricCard label="Expected Move">
                            {result.expected_move_pct !== null && result.expected_move_pct !== undefined ? (
                                <>
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                        ±{result.expected_move_pct.toFixed(2)}%
                                    </span>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {result.features.iv_atm ? 'from ATM IV' : 'from realized vol'}
                                    </p>
                                </>
                            ) : (
                                <span className="text-sm text-gray-400 dark:text-gray-500">N/A</span>
                            )}
                        </MetricCard>
                    </div>

                    {/* Why this signal? */}
                    {result.top_drivers?.length > 0 && (
                        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5">
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                                Why this signal?
                            </p>
                            <div className="divide-y divide-dashed divide-gray-100 dark:divide-gray-800">
                                {result.top_drivers.map((d, i) => (
                                    <DriverRow key={i} driver={d} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Feature Breakdown (expandable) */}
                    <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setFeaturesOpen((v) => !v)}
                            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                Feature Breakdown
                            </p>
                            {featuresOpen
                                ? <ChevronUp size={15} className="text-gray-400" />
                                : <ChevronDown size={15} className="text-gray-400" />
                            }
                        </button>

                        {featuresOpen && (
                            <div className="px-5 pb-4">
                                {Object.entries(result.features).map(([k, v]) => (
                                    <FeatureRow key={k} label={k} value={v} />
                                ))}
                                <div className="flex items-center justify-between py-1.5 border-t border-dashed border-gray-200 dark:border-gray-700 mt-1">
                                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">horizon</span>
                                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">{result.horizon}d</span>
                                </div>
                                <div className="flex items-center justify-between py-1.5 border-b border-dashed border-gray-100 dark:border-gray-800">
                                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">model_mode</span>
                                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-200">{result.model_mode}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Confidence;
