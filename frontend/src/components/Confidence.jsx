import React, { useState, useEffect } from 'react';
import {
    BrainCircuit,
    TrendingUp,
    TrendingDown,
    AlertCircle,
    Loader2,
    ChevronDown,
    ChevronUp,
    ArrowRight,
    MessageCircle,
    BarChart2,
    Layers,
    Sigma,
    Zap,
    LayoutDashboard,
    Sparkles,
} from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errorHandler';
import TickerSearch from './TickerSearch';

const HORIZONS = [
    { label: '1d',  value: 1 },
    { label: '3d',  value: 3 },
    { label: '5d',  value: 5 },
    { label: '14d', value: 14 },
];

// Weights used in warming-up (rule-based) mode — matches backend RULE_WEIGHTS
const RULE_WEIGHTS = {
    sent_score:       0.30,
    sent_change:      0.15,
    recent_return_5d: 0.20,
    market_regime:    0.15,
    vrp_proxy:       -0.10,
    sent_dispersion: -0.10,
};

const FEATURE_META = {
    sent_score:       { label: 'Sentiment Score',        desc: 'Net bullish/bearish ratio from StockTwits (-1 to +1)' },
    sent_change:      { label: 'Sentiment Change',       desc: 'Shift in score vs. 5-reading rolling average' },
    recent_return_5d: { label: '5-Day Price Return',     desc: 'Momentum over the last 5 trading days' },
    market_regime:    { label: 'Market Regime',          desc: 'SPY trend + VIX level → −1 bearish, 0 neutral, +1 bullish' },
    vrp_proxy:        { label: 'Vol Risk Premium',       desc: 'ATM implied vol minus 20-day realized vol' },
    sent_dispersion:  { label: 'Sentiment Dispersion',   desc: 'Disagreement among traders (high = less reliable signal)' },
};

function sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, x))));
}

// ─── Shared sub-components ───────────────────────────────────────────────────

const WarmingBanner = () => (
    <div className="rounded-xl px-4 py-3 flex items-start gap-3 theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
        <span className="t-muted mt-0.5 text-base leading-none">⚙</span>
        <div>
            <p className="t-primary font-semibold text-sm">Rule-based mode</p>
            <p className="t-muted text-xs mt-0.5">
                Using domain-knowledge weights. Signal accuracy improves as more tickers are analyzed over time.
            </p>
        </div>
    </div>
);

const MetricCard = ({ label, children }) => (
    <div className="card rounded-xl p-5 flex flex-col gap-2 theme-transition">
        <p className="text-xs font-semibold t-muted uppercase tracking-widest">{label}</p>
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
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
    );
};

const DriverRow = ({ driver }) => {
    const isBullish = driver.direction === 'bullish';
    const dot = isBullish ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-red-500 dark:bg-red-400';
    const pct = `${isBullish ? '+' : ''}${(driver.weight * 100).toFixed(0)}%`;
    const pctColor = isBullish ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
    return (
        <div className="flex items-center gap-3 py-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className="flex-1 text-sm t-primary">{driver.label}</span>
            <span className={`text-sm font-mono font-semibold ${pctColor}`}>{pct}</span>
        </div>
    );
};

const FeatureRow = ({ label, value }) => {
    if (value === null || value === undefined) return null;
    return (
        <div className="flex items-center justify-between py-1.5 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <span className="text-xs font-mono t-muted">{label}</span>
            <span className="text-xs font-mono font-semibold t-primary">
                {typeof value === 'number' ? value.toFixed(4) : String(value)}
            </span>
        </div>
    );
};

// ─── Overview + SPY worked example ───────────────────────────────────────────

const StepBadge = ({ n }) => (
    <div className="btn-primary w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
        {n}
    </div>
);

const StepCard = ({ step, icon: Icon, title, children }) => (
    <div className="card rounded-xl overflow-hidden theme-transition">
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <StepBadge n={step} />
            <Icon size={14} className="t-muted" />
            <h4 className="text-sm font-bold t-primary font-sans">{title}</h4>
        </div>
        <div className="px-4 py-3">{children}</div>
    </div>
);

const FeatureLine = ({ feat, value, weight }) => {
    const contrib = weight * (value ?? 0);
    const up = contrib >= 0;
    const meta = FEATURE_META[feat] || { label: feat, desc: '' };
    return (
        <div className="flex items-center gap-3 py-2 last:border-0" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold t-primary">{meta.label}</p>
                <p className="text-xs t-muted mt-0.5">{meta.desc}</p>
            </div>
            <span className="text-xs font-mono t-muted w-16 text-right">
                {value != null ? value.toFixed(3) : 'N/A'}
            </span>
            <span className="text-xs t-muted w-4 text-center" style={{ opacity: 0.6 }}>×</span>
            <span className="text-xs font-mono t-muted w-10 text-right">
                {weight > 0 ? '+' : ''}{weight.toFixed(2)}
            </span>
            <span className="text-xs t-muted w-4 text-center" style={{ opacity: 0.6 }}>=</span>
            <span className={`text-xs font-mono font-bold w-14 text-right ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {contrib >= 0 ? '+' : ''}{contrib.toFixed(4)}
            </span>
        </div>
    );
};

const ConfidenceExplainer = ({ spyResult, spyLoading, spyError }) => {
    const f = spyResult?.features;
    const rawScore = f
        ? Object.entries(RULE_WEIGHTS).reduce((sum, [k, w]) => sum + w * (f[k] ?? 0), 0)
        : null;
    const pUp = rawScore != null ? sigmoid(rawScore * 3) : null;
    const confidence = pUp != null ? Math.round(pUp * 100) : null;

    return (
        <div className="space-y-6">
            {/* What is Confidence */}
            <div className="card rounded-xl p-5 theme-transition">
                <div className="flex items-center gap-2 mb-3">
                    <BrainCircuit size={16} className="t-muted" />
                    <h3 className="text-sm font-bold t-primary font-sans">What is the Confidence Calculator?</h3>
                </div>
                <p className="text-sm t-muted leading-relaxed mb-4">
                    The Confidence Calculator combines <strong className="t-primary">social sentiment</strong> (StockTwits),{' '}
                    <strong className="t-primary">price momentum</strong> (yfinance), and{' '}
                    <strong className="t-primary">options market data</strong> into a single directional signal —
                    a probability (0–100) that a stock moves <em>up</em> over your chosen horizon.
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs t-muted">
                    {[
                        { icon: MessageCircle, label: 'StockTwits sentiment' },
                        { icon: BarChart2,     label: 'Price momentum + vol' },
                        { icon: Layers,        label: 'Options IV & VRP' },
                        { icon: Sigma,         label: 'Weighted score' },
                        { icon: Zap,           label: 'Confidence (0–100)' },
                    ].map(({ icon: Icon, label }, i, arr) => (
                        <React.Fragment key={label}>
                            <span className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                                <Icon size={11} />
                                {label}
                            </span>
                            {i < arr.length - 1 && <ArrowRight size={11} className="t-muted" style={{ opacity: 0.4 }} />}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* Live SPY worked example */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold t-muted uppercase tracking-widest">Live Example</span>
                    <span className="text-xs font-mono font-bold t-primary px-2 py-0.5 rounded" style={{ background: 'var(--surface-2)' }}>SPY</span>
                    {spyLoading && <Loader2 size={12} className="animate-spin t-muted" />}
                </div>

                {spyError && (
                    <div className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-4">
                        <AlertCircle className="text-red-500 flex-shrink-0" size={15} />
                        <p className="text-red-600 dark:text-red-400 text-sm">{spyError}</p>
                    </div>
                )}

                {spyLoading && !spyResult ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {[0,1,2,3,4].map(i => (
                            <div key={i} className="h-36 rounded-xl skeleton" />
                        ))}
                    </div>
                ) : spyResult ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Step 1: Sentiment */}
                        <StepCard step={1} icon={MessageCircle} title="Collect Sentiment (StockTwits)">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="t-muted">Sentiment score</span>
                                    <span className="font-mono font-bold t-primary">{f?.sent_score?.toFixed(3)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="t-muted">Change vs. avg</span>
                                    <span className={`font-mono font-bold ${(f?.sent_change ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {(f?.sent_change ?? 0) >= 0 ? '+' : ''}{f?.sent_change?.toFixed(3)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="t-muted">Dispersion (disagreement)</span>
                                    <span className="font-mono font-bold t-primary">{f?.sent_dispersion?.toFixed(3)}</span>
                                </div>
                                <p className="t-muted pt-1 italic" style={{ opacity: 0.6 }}>
                                    Score range: −1 (fully bearish) → +1 (fully bullish)
                                </p>
                            </div>
                        </StepCard>

                        {/* Step 2: Price features */}
                        <StepCard step={2} icon={BarChart2} title="Price & Market Features (yfinance)">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="t-muted">5-day return</span>
                                    <span className={`font-mono font-bold ${(f?.recent_return_5d ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {((f?.recent_return_5d ?? 0) * 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="t-muted">Realized vol (20d ann.)</span>
                                    <span className="font-mono font-bold t-primary">
                                        {f?.realized_vol_20d != null ? `${(f.realized_vol_20d * 100).toFixed(1)}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="t-muted">Market regime</span>
                                    <span className={`font-mono font-bold ${
                                        f?.market_regime > 0 ? 'text-emerald-600 dark:text-emerald-400'
                                        : f?.market_regime < 0 ? 'text-red-600 dark:text-red-400'
                                        : 'text-amber-500'
                                    }`}>
                                        {f?.market_regime === 1 ? 'Bullish (+1)' : f?.market_regime === -1 ? 'Bearish (−1)' : 'Neutral (0)'}
                                    </span>
                                </div>
                                <p className="t-muted pt-1 italic" style={{ opacity: 0.6 }}>
                                    Regime = SPY 5d trend + VIX level
                                </p>
                            </div>
                        </StepCard>

                        {/* Step 3: Options features */}
                        <StepCard step={3} icon={Layers} title="Options Features (yfinance chain)">
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="t-muted">ATM implied vol</span>
                                    <span className="font-mono font-bold t-primary">
                                        {f?.iv_atm != null ? `${(f.iv_atm * 100).toFixed(1)}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="t-muted">Implied move (horizon)</span>
                                    <span className="font-mono font-bold t-primary">
                                        {f?.implied_move_pct != null ? `±${(f.implied_move_pct * 100).toFixed(2)}%` : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="t-muted">VRP (IV − RV)</span>
                                    <span className={`font-mono font-bold ${(f?.vrp_proxy ?? 0) > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                        {f?.vrp_proxy != null ? f.vrp_proxy.toFixed(4) : 'N/A'}
                                    </span>
                                </div>
                                <p className="t-muted pt-1 italic" style={{ opacity: 0.6 }}>
                                    Positive VRP = market pricing in fear premium
                                </p>
                            </div>
                        </StepCard>

                        {/* Step 4: Weighted score */}
                        <StepCard step={4} icon={Sigma} title="Weighted Score">
                            <div>
                                {Object.entries(RULE_WEIGHTS).map(([feat, w]) => (
                                    <FeatureLine key={feat} feat={feat} value={f?.[feat]} weight={w} />
                                ))}
                                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                                    <span className="text-xs font-bold t-primary">Raw score</span>
                                    <span className="text-sm font-mono font-bold t-primary">
                                        {rawScore != null ? rawScore.toFixed(4) : '—'}
                                    </span>
                                </div>
                            </div>
                        </StepCard>

                        {/* Step 5: Confidence output */}
                        <StepCard step={5} icon={Zap} title="Confidence Output">
                            <div className="space-y-3 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="t-muted">Formula</span>
                                    <span className="font-mono t-primary">σ(raw × 3)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="t-muted">Sigmoid input</span>
                                    <span className="font-mono font-bold t-primary">
                                        {rawScore != null ? (rawScore * 3).toFixed(4) : '—'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="t-muted">P(up)</span>
                                    <span className="font-mono font-bold t-primary">
                                        {pUp != null ? pUp.toFixed(4) : '—'}
                                    </span>
                                </div>
                                <div className="h-px" style={{ background: 'var(--border)' }} />
                                <div className="flex justify-between items-center">
                                    <span className="font-bold t-primary">Confidence</span>
                                    <span className={`text-xl font-bold ${
                                        confidence >= 65 ? 'text-emerald-600 dark:text-emerald-400'
                                        : confidence <= 35 ? 'text-red-600 dark:text-red-400'
                                        : 'text-amber-500'
                                    }`}>
                                        {confidence ?? '—'} / 100
                                    </span>
                                </div>
                                <ConfidenceBar value={confidence ?? 50} />
                                <div className="flex justify-between items-center pt-1">
                                    <span className="t-muted">Direction</span>
                                    <span className={`font-bold uppercase flex items-center gap-1 ${spyResult.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {spyResult.direction === 'up' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                                        {spyResult.direction}
                                    </span>
                                </div>
                            </div>
                        </StepCard>

                        {/* Model note */}
                        <div className="lg:col-span-2 rounded-xl px-4 py-3 text-xs t-muted theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <strong className="t-primary">Model mode: </strong>
                            {spyResult.model_mode === 'warming_up'
                                ? 'Warming up — using fixed rule-based weights above. Switches to fitted logistic regression (scikit-learn) after 30 labeled observations per ticker/horizon pair.'
                                : 'Fitted — logistic regression trained on accumulated observations. Brier score: ' + (spyResult.brier_score?.toFixed(3) ?? 'N/A')}
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

// ─── Result panel (after user searches a ticker) ──────────────────────────────

const ResultPanel = ({ result, navigateTo }) => {
    const [featuresOpen, setFeaturesOpen] = useState(false);
    const isUp = result.direction === 'up';

    return (
        <div className="space-y-4">
            {result.model_mode === 'warming_up' && <WarmingBanner />}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MetricCard label="Direction">
                    <div className={`flex items-center gap-2 ${isUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {isUp ? <TrendingUp size={28} strokeWidth={2} /> : <TrendingDown size={28} strokeWidth={2} />}
                        <span className="text-3xl font-bold uppercase">{result.direction}</span>
                    </div>
                    <p className="text-xs t-muted mt-1 truncate">{result.company_name}</p>
                </MetricCard>

                <MetricCard label="Confidence">
                    <div className="flex items-end gap-1">
                        <span className="text-3xl font-bold t-primary">{Math.round(result.confidence)}</span>
                        <span className="text-base t-muted mb-0.5">/ 100</span>
                    </div>
                    <ConfidenceBar value={result.confidence} />
                    {result.brier_score != null && (
                        <p className="text-xs t-muted mt-1">Brier: {result.brier_score.toFixed(3)}</p>
                    )}
                </MetricCard>

                <MetricCard label="Expected Move">
                    {result.expected_move_pct != null ? (
                        <>
                            <span className="text-3xl font-bold t-primary font-mono">±{result.expected_move_pct.toFixed(2)}%</span>
                            <div className="w-full h-1.5 rounded-full overflow-hidden flex mt-2" style={{ background: 'var(--surface-2)' }}>
                                <div className="bg-red-400 h-full" style={{ width: '50%' }} />
                                <div className="bg-emerald-400 h-full" style={{ width: '50%' }} />
                            </div>
                            <p className="text-xs t-muted mt-1">
                                {result.features.iv_atm ? 'from ATM implied vol' : 'from realized vol'} · {result.horizon}d horizon
                            </p>
                        </>
                    ) : (
                        <span className="text-sm t-muted">N/A</span>
                    )}
                </MetricCard>
            </div>

            {result.top_drivers?.length > 0 && (
                <div className="card rounded-xl p-5 theme-transition">
                    <p className="text-xs font-semibold t-muted uppercase tracking-widest mb-3">Why this signal?</p>
                    <div>
                        {result.top_drivers.map((d, i) => (
                            <div key={i} style={i < result.top_drivers.length - 1 ? { borderBottom: '1px solid var(--border)' } : {}}>
                                <DriverRow driver={d} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cross-tab navigation */}
            {navigateTo && (
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => navigateTo(DEMO_MODE ? 'sentiment' : 'dashboard', result.ticker)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors text-emerald-600 dark:text-emerald-400"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <LayoutDashboard size={14} />
                        See what traders are saying about {result.ticker}
                    </button>
                    <button
                        onClick={() => navigateTo('ai', result.ticker)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <Sparkles size={14} />
                        Ask AI about {result.ticker}
                    </button>
                </div>
            )}

            <div className="card rounded-xl overflow-hidden theme-transition">
                <button
                    onClick={() => setFeaturesOpen(v => !v)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left transition-colors"
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                    <p className="text-xs font-semibold t-muted uppercase tracking-widest">Feature Breakdown</p>
                    {featuresOpen ? <ChevronUp size={15} className="t-muted" /> : <ChevronDown size={15} className="t-muted" />}
                </button>
                {featuresOpen && (
                    <div className="px-5 pb-4">
                        {Object.entries(result.features).map(([k, v]) => <FeatureRow key={k} label={k} value={v} />)}
                        <div className="flex items-center justify-between py-1.5 mt-1" style={{ borderTop: '1px solid var(--border)' }}>
                            <span className="text-xs font-mono t-muted">horizon</span>
                            <span className="text-xs font-mono font-semibold t-primary">{result.horizon}d</span>
                        </div>
                        <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
                            <span className="text-xs font-mono t-muted">model_mode</span>
                            <span className="text-xs font-mono font-semibold t-primary">{result.model_mode}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Main component ───────────────────────────────────────────────────────────

const Confidence = ({ navigateTo, crossTabTicker, clearCrossTabTicker }) => {
    const [ticker, setTicker] = useState('');
    const [horizon, setHorizon] = useState(1);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // SPY example state
    const [spyResult, setSpyResult] = useState(null);
    const [spyLoading, setSpyLoading] = useState(true);
    const [spyError, setSpyError] = useState(null);

    // Auto-fetch SPY on mount for the explainer
    useEffect(() => {
        api.post('/confidence/analyze', { ticker: 'SPY', horizon: 1 })
            .then(res => setSpyResult(res.data))
            .catch(() => setSpyError('Could not load SPY example. Is the backend running?'))
            .finally(() => setSpyLoading(false));
    }, []);

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

    const handleSelect = (t) => {
        setTicker(t);
        setResult(null);
        runAnalysis(t, horizon);
    };

    // Consume cross-tab ticker
    useEffect(() => {
        if (crossTabTicker) {
            handleSelect(crossTabTicker);
            clearCrossTabTicker();
        }
    }, [crossTabTicker]);

    const handleHorizonChange = (h) => {
        setHorizon(h);
        if (result) runAnalysis(ticker, h);
    };

    return (
        <div className="p-6 lg:p-8 min-h-screen theme-transition" style={{ backgroundColor: 'var(--bg)' }}>
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5" style={{ borderBottom: '1px solid var(--border)' }}>
                <div>
                    <h2 className="text-3xl font-bold t-primary font-sans flex items-center gap-2.5">
                        <BrainCircuit className="t-muted" size={22} />
                        Confidence
                    </h2>
                    <p className="t-muted text-sm mt-1">
                        Directional signal &amp; calibrated probability
                        {ticker && <> for <span className="font-mono font-semibold t-primary">{ticker}</span></>}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap justify-end">
                    <TickerSearch onSelect={handleSelect} disabled={loading} />
                    <div className="flex items-center rounded-lg overflow-hidden" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {HORIZONS.map((h) => (
                            <button
                                key={h.value}
                                type="button"
                                onClick={() => handleHorizonChange(h.value)}
                                className={`px-3 py-2 text-sm font-medium transition-colors ${
                                    horizon === h.value
                                        ? 'btn-primary'
                                        : 't-muted'
                                }`}
                                onMouseEnter={e => { if (horizon !== h.value) e.currentTarget.style.background = 'var(--border)'; }}
                                onMouseLeave={e => { if (horizon !== h.value) e.currentTarget.style.background = ''; }}
                            >
                                {h.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-5">
                    <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={15} />
                    <div>
                        <p className="text-red-700 dark:text-red-400 font-semibold text-sm">Error</p>
                        <p className="text-red-500 dark:text-red-300 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Loading state */}
            {loading && !result && (
                <div className="flex items-center justify-center py-24 t-muted gap-3">
                    <Loader2 size={20} className="animate-spin" />
                    <span className="text-sm">Fetching data &amp; computing signal…</span>
                </div>
            )}

            {/* Result or explainer */}
            {result && !loading ? (
                <ResultPanel result={result} navigateTo={navigateTo} />
            ) : !loading ? (
                <ConfidenceExplainer
                    spyResult={spyResult}
                    spyLoading={spyLoading}
                    spyError={spyError}
                />
            ) : null}
        </div>
    );
};

export default Confidence;
