import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Calculator, TrendingUp, TrendingDown, Zap, Clock, BarChart2, Loader2, ChevronDown, ChevronUp, Scale } from 'lucide-react';
import api from '../utils/api';

// ─── Black-Scholes (JS) ───────────────────────────────────────────────────────

function normCDF(x) {
    const a1 =  0.254829592, a2 = -0.284496736, a3 =  1.421413741;
    const a4 = -1.453152027, a5 =  1.061405429, p  =  0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
}

function normPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function blackScholes(S, K, T, r, sigma) {
    if (T <= 0) {
        return {
            callPrice: Math.max(S - K, 0),
            putPrice:  Math.max(K - S, 0),
            callDelta: S > K ? 1 : 0, putDelta: S < K ? -1 : 0,
            gamma: 0, thetaCall: 0, thetaPut: 0, vega: 0, d1: 0, d2: 0,
        };
    }
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    const callPrice = S * normCDF(d1) - K * Math.exp(-r * T) * normCDF(d2);
    const putPrice  = K * Math.exp(-r * T) * normCDF(-d2) - S * normCDF(-d1);
    const callDelta = normCDF(d1);
    const putDelta  = callDelta - 1;
    const gamma     = normPDF(d1) / (S * sigma * Math.sqrt(T));
    const vega      = S * normPDF(d1) * Math.sqrt(T) / 100;
    const thetaCall = (-(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) - r * K * Math.exp(-r * T) * normCDF(d2)) / 365;
    const thetaPut  = (-(S * normPDF(d1) * sigma) / (2 * Math.sqrt(T)) + r * K * Math.exp(-r * T) * normCDF(-d2)) / 365;
    return { callPrice, putPrice, callDelta, putDelta, gamma, thetaCall, thetaPut, vega, d1, d2 };
}

// ─── Payoff diagram ───────────────────────────────────────────────────────────

function PayoffDiagram({ S, K, callPrice, putPrice }) {
    const W = 560, H = 220, PAD = { top: 16, right: 16, bottom: 36, left: 52 };
    const low  = K * 0.75;
    const high = K * 1.25;
    const steps = 80;
    const dx = (high - low) / steps;

    const callPnl = Array.from({ length: steps + 1 }, (_, i) => {
        const price = low + i * dx;
        return Math.max(price - K, 0) - callPrice;
    });
    const putPnl = Array.from({ length: steps + 1 }, (_, i) => {
        const price = low + i * dx;
        return Math.max(K - price, 0) - putPrice;
    });

    const allVals = [...callPnl, ...putPnl];
    const minY = Math.min(...allVals);
    const maxY = Math.max(...allVals);
    const yRange = maxY - minY || 1;

    const iW = W - PAD.left - PAD.right;
    const iH = H - PAD.top - PAD.bottom;

    function xPos(price) { return PAD.left + ((price - low) / (high - low)) * iW; }
    function yPos(val)   { return PAD.top + (1 - (val - minY) / yRange) * iH; }

    function polyline(vals) {
        return vals.map((v, i) => `${xPos(low + i * dx)},${yPos(v)}`).join(' ');
    }

    const zeroY = yPos(0);
    const callBreak = K + callPrice;
    const putBreak  = K - putPrice;

    // X-axis labels
    const xLabels = [low, K * 0.875, K, K * 1.125, high];

    return (
        <div className="overflow-x-auto">
            <svg width={W} height={H} className="text-xs">
                {/* Zero line */}
                <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY}
                    stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4 3" />

                {/* Strike line */}
                <line x1={xPos(K)} y1={PAD.top} x2={xPos(K)} y2={H - PAD.bottom}
                    stroke="currentColor" strokeOpacity="0.15" strokeDasharray="4 3" />
                <text x={xPos(K)} y={PAD.top - 4} textAnchor="middle" fill="currentColor" fillOpacity="0.4" fontSize="10">Strike</text>

                {/* Call P&L line */}
                <polyline points={polyline(callPnl)} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />

                {/* Put P&L line */}
                <polyline points={polyline(putPnl)} fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinejoin="round" />

                {/* Call breakeven */}
                {callBreak >= low && callBreak <= high && (
                    <>
                        <line x1={xPos(callBreak)} y1={zeroY - 6} x2={xPos(callBreak)} y2={zeroY + 6}
                            stroke="#10b981" strokeWidth="1.5" />
                        <text x={xPos(callBreak)} y={zeroY - 9} textAnchor="middle" fill="#10b981" fontSize="9">
                            BE ${callBreak.toFixed(0)}
                        </text>
                    </>
                )}

                {/* Put breakeven */}
                {putBreak >= low && putBreak <= high && (
                    <>
                        <line x1={xPos(putBreak)} y1={zeroY - 6} x2={xPos(putBreak)} y2={zeroY + 6}
                            stroke="#f43f5e" strokeWidth="1.5" />
                        <text x={xPos(putBreak)} y={zeroY - 9} textAnchor="middle" fill="#f43f5e" fontSize="9">
                            BE ${putBreak.toFixed(0)}
                        </text>
                    </>
                )}

                {/* Current spot marker */}
                <line x1={xPos(S)} y1={PAD.top} x2={xPos(S)} y2={H - PAD.bottom}
                    stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 2" />
                <text x={xPos(S)} y={H - PAD.bottom + 14} textAnchor="middle" fill="#6366f1" fontSize="9">Spot</text>

                {/* X-axis labels */}
                {xLabels.map((v, i) => (
                    <text key={i} x={xPos(v)} y={H - PAD.bottom + 14} textAnchor="middle"
                        fill="currentColor" fillOpacity="0.5" fontSize="9">
                        ${v.toFixed(0)}
                    </text>
                ))}

                {/* Y-axis labels */}
                {[minY, 0, maxY].map((v, i) => (
                    <text key={i} x={PAD.left - 6} y={yPos(v) + 3} textAnchor="end"
                        fill="currentColor" fillOpacity="0.5" fontSize="9">
                        {v >= 0 ? `+$${v.toFixed(1)}` : `-$${Math.abs(v).toFixed(1)}`}
                    </text>
                ))}

                {/* Legend */}
                <circle cx={PAD.left + 8} cy={PAD.top + 8} r={4} fill="#10b981" />
                <text x={PAD.left + 16} y={PAD.top + 12} fill="#10b981" fontSize="9">Call P&L</text>
                <circle cx={PAD.left + 68} cy={PAD.top + 8} r={4} fill="#f43f5e" />
                <text x={PAD.left + 76} y={PAD.top + 12} fill="#f43f5e" fontSize="9">Put P&L</text>
            </svg>
        </div>
    );
}

// ─── IV back-solver (Newton-Raphson) ─────────────────────────────────────────

function impliedVol(marketPrice, S, K, T, r, optionType) {
    if (T <= 0 || marketPrice <= 0) return null;
    let sigma = 0.3; // initial guess
    for (let i = 0; i < 200; i++) {
        const bs = blackScholes(S, K, T, r, sigma);
        const price = optionType === 'call' ? bs.callPrice : bs.putPrice;
        const diff  = price - marketPrice;
        if (Math.abs(diff) < 0.00001) break;
        // Full vega (∂price/∂σ) — not divided by 100
        const d1   = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
        const vega = S * normPDF(d1) * Math.sqrt(T);
        if (vega < 1e-10) break;
        sigma -= diff / vega;
        sigma  = Math.max(0.001, Math.min(sigma, 5.0)); // clamp [0.1%, 500%]
    }
    return sigma;
}

// ─── Mock defaults per ticker ─────────────────────────────────────────────────

const DEFAULTS = {
    AAPL:  { spot: 224.80, iv: 30 },
    MSFT:  { spot: 418.30, iv: 28 },
    NVDA:  { spot: 876.40, iv: 55 },
    META:  { spot: 618.20, iv: 40 },
    GOOGL: { spot: 175.60, iv: 32 },
    AMZN:  { spot: 205.40, iv: 38 },
    TSLA:  { spot: 248.70, iv: 65 },
};

const MAG7 = Object.keys(DEFAULTS);

function fmt(v, d = 2) { return v == null ? '—' : Number(v).toFixed(d); }

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, subtitle, children, accent = 'indigo' }) {
    const colors = {
        indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/30',
        emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30',
        amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30',
        rose: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30',
    };
    return (
        <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg border border-dashed ${colors[accent]}`}>
                    <Icon size={18} />
                </div>
                <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

// ─── Slider input ─────────────────────────────────────────────────────────────

function SliderInput({ label, value, onChange, min, max, step, display, hint }) {
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">{label}</label>
                <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">{display ?? value}</span>
            </div>
            <input
                type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                className="w-full h-1.5 rounded-full accent-indigo-600 cursor-pointer"
            />
            {hint && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
        </div>
    );
}

// ─── Greek card ───────────────────────────────────────────────────────────────

function GreekCard({ icon: Icon, name, symbol, value, color, what, interpret, example }) {
    const [open, setOpen] = useState(false);
    const colors = {
        blue:   'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/30',
        red:    'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30',
        green:  'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/30',
    };
    return (
        <div className={`border border-dashed rounded-xl p-4 space-y-2 ${colors[color]}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Icon size={16} />
                    <span className="font-bold text-sm">{symbol} {name}</span>
                </div>
                <span className="font-mono font-bold text-lg">{fmt(value, 4)}</span>
            </div>
            <p className="text-xs opacity-80">{what}</p>
            <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs font-semibold opacity-70 hover:opacity-100 transition-opacity">
                {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {open ? 'Hide' : 'How to interpret'}
            </button>
            {open && (
                <div className="text-xs space-y-1 pt-1 border-t border-current border-opacity-20">
                    <p className="opacity-90">{interpret}</p>
                    {example && <p className="opacity-70 italic">{example}</p>}
                </div>
            )}
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BlackScholesGuide() {
    const [ticker, setTicker]     = useState('AAPL');
    const [spot, setSpot]         = useState(DEFAULTS.AAPL.spot);
    const [strike, setStrike]     = useState(DEFAULTS.AAPL.spot);
    const [days, setDays]         = useState(14);
    const [iv, setIv]             = useState(DEFAULTS.AAPL.iv);
    const [riskFree]              = useState(4.5);
    const [summary, setSummary]   = useState('');
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [liveData, setLiveData]   = useState(null);
    const [loadingLive, setLoadingLive] = useState(false);
    const [liveError, setLiveError] = useState(null);
    const [ivCalcPrice, setIvCalcPrice] = useState('');
    const [ivCalcType, setIvCalcType]   = useState('call');
    const [showSticky, setShowSticky]   = useState(false);
    const inputsSectionRef              = useRef(null);

    // Show sticky bar when inputs section scrolls out of view
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => setShowSticky(!entry.isIntersecting),
            { threshold: 0, rootMargin: '-64px 0px 0px 0px' }
        );
        if (inputsSectionRef.current) observer.observe(inputsSectionRef.current);
        return () => observer.disconnect();
    }, []);

    // When ticker changes, reset inputs to that ticker's defaults
    useEffect(() => {
        const d = DEFAULTS[ticker];
        setSpot(d.spot);
        setStrike(Math.round(d.spot));
        setIv(d.iv);
        setSummary('');
        setLiveData(null);
        setLiveError(null);
        setIvCalcPrice('');
    }, [ticker]);

    const T     = days / 365;
    const sigma = iv / 100;
    const bs    = blackScholes(spot, strike, T, riskFree / 100, sigma);

    const moneyness = spot > strike ? 'ITM (in-the-money)' : spot < strike ? 'OTM (out-of-the-money)' : 'ATM (at-the-money)';

    async function fetchLivePrice() {
        setLoadingLive(true);
        setLiveError(null);
        setLiveData(null);
        try {
            const res = await api.get(`/demo/live-price/${ticker}?strike=${strike}&days=${days}`);
            setLiveData(res.data);
        } catch (e) {
            setLiveError(e?.response?.data?.detail || 'Could not fetch live market data. Make sure the backend is running.');
        } finally {
            setLoadingLive(false);
        }
    }

    async function generateSummary() {
        setLoadingSummary(true);
        setSummary('');
        try {
            const prompt = `You are a concise options trading educator. Given these Black-Scholes inputs and outputs, write a 4-6 sentence plain-English summary explaining what these numbers mean for a trader considering buying this call option. Be specific with the actual values. End with one sentence of practical takeaway.

Ticker: ${ticker}
Spot Price: $${fmt(spot)}
Strike Price: $${fmt(strike)}
Days to Expiry: ${days}
Implied Volatility: ${iv}%
Risk-Free Rate: ${riskFree}%

Results:
Call Price: $${fmt(bs.callPrice)}
Put Price: $${fmt(bs.putPrice)}
Call Delta: ${fmt(bs.callDelta, 4)}
Gamma: ${fmt(bs.gamma, 6)}
Theta (call): $${fmt(bs.thetaCall, 4)}/day
Vega: ${fmt(bs.vega, 4)} per 1% vol change
d1: ${fmt(bs.d1, 4)}, d2: ${fmt(bs.d2, 4)}
Moneyness: ${moneyness}`;

            const res = await api.post('/ai/chat', {
                message: prompt,
                history: [],
            });
            setSummary(res.data.response || res.data.message || '');
        } catch {
            setSummary('Unable to generate summary. Check that the AI service is running.');
        } finally {
            setLoadingSummary(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

            {/* Sticky summary bar */}
            {showSticky && (
                <div className="fixed top-14 left-0 right-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-dashed border-gray-200 dark:border-gray-800 px-4 py-2 flex items-center justify-center gap-6 text-xs font-mono">
                    <span className="font-bold text-gray-900 dark:text-white">{ticker}</span>
                    <span className="text-gray-500 dark:text-gray-400">S=<span className="text-gray-900 dark:text-white">${fmt(spot)}</span></span>
                    <span className="text-gray-500 dark:text-gray-400">K=<span className="text-gray-900 dark:text-white">${fmt(strike)}</span></span>
                    <span className="text-gray-500 dark:text-gray-400">T=<span className="text-gray-900 dark:text-white">{days}d</span></span>
                    <span className="text-gray-500 dark:text-gray-400">σ=<span className="text-gray-900 dark:text-white">{iv}%</span></span>
                    <span className="text-emerald-600 dark:text-emerald-400">Call <span className="font-bold">${fmt(bs.callPrice)}</span></span>
                    <span className="text-red-500 dark:text-red-400">Put <span className="font-bold">${fmt(bs.putPrice)}</span></span>
                </div>
            )}

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Black-Scholes Guide</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Interactive walkthrough of the model that prices options — adjust the inputs and watch the Greeks update in real time.
                </p>
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

            {/* What is Black-Scholes */}
            <Section icon={BookOpen} title="What is the Black-Scholes Model?" accent="indigo">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    Black-Scholes is a mathematical model for pricing options contracts. Published in 1973 by Fischer Black and Myron Scholes,
                    it tells you the <strong className="text-gray-900 dark:text-white">theoretical fair value</strong> of a call or put option given five inputs:
                    the current stock price, the strike price, time until expiration, the risk-free interest rate, and the stock's volatility.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    The model assumes the stock moves in a <em>log-normal random walk</em> — small, continuous price changes with a known volatility.
                    In practice, markets aren't perfectly log-normal (crashes happen, vol changes), but Black-Scholes remains the industry baseline
                    that every options trader learns first.
                </p>
                <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg font-mono text-xs text-gray-600 dark:text-gray-400 text-center">
                    C = S·N(d₁) − K·e<sup>−rT</sup>·N(d₂)&nbsp;&nbsp;&nbsp;
                    d₁ = [ln(S/K) + (r + σ²/2)·T] / (σ·√T)&nbsp;&nbsp;&nbsp;
                    d₂ = d₁ − σ·√T
                </div>
            </Section>

            {/* Inputs */}
            <div ref={inputsSectionRef}>
            <Section icon={Calculator} title="Model Inputs" subtitle="Adjust the sliders — the Greeks update instantly" accent="indigo">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <SliderInput
                        label="S — Spot Price"
                        value={spot}
                        onChange={setSpot}
                        min={Math.round(DEFAULTS[ticker].spot * 0.7)}
                        max={Math.round(DEFAULTS[ticker].spot * 1.3)}
                        step={0.1}
                        display={`$${fmt(spot)}`}
                        hint="Current market price of the stock"
                    />
                    <SliderInput
                        label="K — Strike Price"
                        value={strike}
                        onChange={setStrike}
                        min={Math.round(DEFAULTS[ticker].spot * 0.7)}
                        max={Math.round(DEFAULTS[ticker].spot * 1.3)}
                        step={0.1}
                        display={`$${fmt(strike)}`}
                        hint="Price at which you have the right to buy (call) or sell (put)"
                    />
                    <SliderInput
                        label="T — Days to Expiry"
                        value={days}
                        onChange={setDays}
                        min={1}
                        max={90}
                        step={1}
                        display={`${days}d`}
                        hint="Calendar days until the option expires"
                    />
                    <SliderInput
                        label="σ — Implied Volatility"
                        value={iv}
                        onChange={setIv}
                        min={5}
                        max={120}
                        step={0.5}
                        display={`${iv}%`}
                        hint="Market's expectation of future volatility — higher = more expensive options"
                    />
                </div>

                {/* Fixed inputs */}
                <div className="flex gap-4 pt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>Risk-free rate: <strong className="text-gray-700 dark:text-gray-300">{riskFree}%</strong></span>
                    <span>Moneyness: <strong className="text-gray-700 dark:text-gray-300">{moneyness}</strong></span>
                </div>
            </Section>

            </div>

            {/* Output prices */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-dashed border-emerald-200 dark:border-emerald-500/30 rounded-xl p-5 text-center">
                    <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">Call Price</p>
                    <p className="text-3xl font-bold font-mono text-emerald-700 dark:text-emerald-300">${fmt(bs.callPrice)}</p>
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">Right to buy {ticker} at ${fmt(strike)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-200 dark:border-red-500/30 rounded-xl p-5 text-center">
                    <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide mb-1">Put Price</p>
                    <p className="text-3xl font-bold font-mono text-red-700 dark:text-red-300">${fmt(bs.putPrice)}</p>
                    <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-1">Right to sell {ticker} at ${fmt(strike)}</p>
                </div>
            </div>

            {/* Payoff Diagram */}
            <Section icon={TrendingUp} title="Payoff at Expiry" subtitle="P&L if you buy this option and hold until expiration" accent="emerald">
                <PayoffDiagram S={spot} K={strike} callPrice={bs.callPrice} putPrice={bs.putPrice} />
                <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                    <div className="space-y-1">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">Call breakeven</p>
                        <p className="font-mono text-gray-900 dark:text-white">${fmt(strike + bs.callPrice)} <span className="text-xs text-gray-400">(strike + premium)</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Max loss: ${fmt(bs.callPrice)} · Unlimited upside</p>
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold text-red-500 dark:text-red-400">Put breakeven</p>
                        <p className="font-mono text-gray-900 dark:text-white">${fmt(strike - bs.putPrice)} <span className="text-xs text-gray-400">(strike − premium)</span></p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Max loss: ${fmt(bs.putPrice)} · Max gain: ${fmt(strike - bs.putPrice)}</p>
                    </div>
                </div>
            </Section>

            {/* Market Comparison */}
            <Section icon={Scale} title="Market Comparison" subtitle="Compare your B-S theoretical price against the real market" accent="indigo">
                <button
                    onClick={fetchLivePrice}
                    disabled={loadingLive}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {loadingLive
                        ? <><Loader2 size={14} className="animate-spin" /> Fetching live data…</>
                        : 'Fetch Live Prices'
                    }
                </button>

                {liveError && (
                    <p className="text-sm text-red-600 dark:text-red-400 mt-2">{liveError}</p>
                )}

                {liveData && (
                    <div className="space-y-3 mt-2">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            Using expiry <span className="font-mono font-semibold">{liveData.expiry}</span> ({liveData.days_to_expiry}d) · Strike requested ${fmt(liveData.strike_requested)}
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Call', bsPrice: bs.callPrice, live: liveData.call, color: 'emerald' },
                                { label: 'Put',  bsPrice: bs.putPrice,  live: liveData.put,  color: 'red'     },
                            ].map(({ label, bsPrice, live, color }) => {
                                if (!live?.market_price) return (
                                    <div key={label} className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm text-gray-400">
                                        {label}: no live data
                                    </div>
                                );
                                const diff = live.market_price - bsPrice;
                                const pct  = bsPrice > 0 ? (diff / bsPrice) * 100 : 0;
                                const overpriced = diff > 0.01;
                                const underpriced = diff < -0.01;
                                const neutral = !overpriced && !underpriced;
                                const tagColor = overpriced
                                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10'
                                    : underpriced
                                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
                                    : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800';
                                return (
                                    <div key={label} className="border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2">
                                        <p className={`text-xs font-bold uppercase tracking-wide ${color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>{label}</p>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">B-S price</span>
                                            <span className="font-mono font-semibold text-gray-900 dark:text-white">${fmt(bsPrice)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500 dark:text-gray-400">Market mid</span>
                                            <span className="font-mono font-semibold text-gray-900 dark:text-white">${fmt(live.market_price)}</span>
                                        </div>
                                        {live.strike_found && (
                                            <p className="text-xs text-gray-400 dark:text-gray-500">Strike ${fmt(live.strike_found)} · IV {fmt(live.implied_vol, 1)}%</p>
                                        )}
                                        <div className={`mt-1 px-2 py-1 rounded-lg text-xs font-semibold ${tagColor}`}>
                                            {overpriced && `Market overpriced by $${fmt(Math.abs(diff))} (+${fmt(Math.abs(pct), 1)}%) — sell signal`}
                                            {underpriced && `Market underpriced by $${fmt(Math.abs(diff))} (−${fmt(Math.abs(pct), 1)}%) — buy signal`}
                                            {neutral && 'Fairly priced — within $0.01 of B-S'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                            Note: discrepancies are normal — the market uses a volatility surface (varying IV per strike/expiry) while B-S uses a single flat IV.
                        </p>
                    </div>
                )}
            </Section>

            {/* IV Calculator */}
            <Section icon={Calculator} title="IV Calculator" subtitle="Enter a real market price — we'll back-solve for the implied volatility" accent="amber">
                <div className="flex gap-2 mb-4">
                    {['call', 'put'].map(type => (
                        <button
                            key={type}
                            onClick={() => setIvCalcType(type)}
                            className={`px-4 py-1.5 rounded-lg text-sm font-semibold border transition-all capitalize ${
                                ivCalcType === type
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-900 dark:border-white'
                                    : 'bg-white dark:bg-gray-900 border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-2">
                    Using {ticker} · S=${fmt(spot)} · K=${fmt(strike)} · T={days}d · r={riskFree}%
                </p>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="e.g. 5.50"
                            value={ivCalcPrice}
                            onChange={e => setIvCalcPrice(e.target.value)}
                            className="pl-7 pr-3 py-2 w-36 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-400"
                        />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">market price for this {ivCalcType}</span>
                </div>

                {(() => {
                    const mktPrice = parseFloat(ivCalcPrice);
                    if (!ivCalcPrice || isNaN(mktPrice) || mktPrice <= 0) return null;
                    const calcIV = impliedVol(mktPrice, spot, strike, days / 365, riskFree / 100, ivCalcType);
                    if (!calcIV) return <p className="text-sm text-red-500 mt-3">Could not solve — check that the price is within a realistic range.</p>;
                    const ivPct   = calcIV * 100;
                    const diff    = ivPct - iv;
                    const higher  = diff > 0.1;
                    const lower   = diff < -0.1;
                    return (
                        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-500/10 border border-dashed border-amber-200 dark:border-amber-500/30 rounded-xl space-y-2">
                            <div className="flex items-baseline gap-3">
                                <span className="text-sm text-amber-700 dark:text-amber-400 font-semibold">Implied Volatility</span>
                                <span className="text-2xl font-bold font-mono text-amber-800 dark:text-amber-300">{fmt(ivPct, 1)}%</span>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                Your IV slider is set to <strong>{iv}%</strong>.{' '}
                                {higher && `The market is pricing in ${fmt(diff, 1)}% more volatility than your assumption — the market expects bigger moves.`}
                                {lower  && `The market is pricing in ${fmt(Math.abs(diff), 1)}% less volatility than your assumption — your model overstates risk.`}
                                {!higher && !lower && `Matches your IV slider closely — your model is well-calibrated to this market price.`}
                            </p>
                            <button
                                onClick={() => setIv(Math.round(ivPct * 10) / 10)}
                                className="text-xs font-semibold text-amber-700 dark:text-amber-400 underline underline-offset-2 hover:opacity-70 transition-opacity"
                            >
                                Apply {fmt(ivPct, 1)}% to IV slider →
                            </button>
                        </div>
                    );
                })()}
            </Section>

            {/* Greeks */}
            <Section icon={Zap} title="The Greeks" subtitle="Sensitivity measures that tell you how the option price will change" accent="amber">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <GreekCard
                        icon={TrendingUp} name="Delta" symbol="Δ" value={bs.callDelta} color="blue"
                        what="How much the call price moves for every $1 move in the stock."
                        interpret={`A delta of ${fmt(bs.callDelta, 2)} means if ${ticker} moves up $1, this call gains ~$${fmt(bs.callDelta, 2)}. Deep ITM options approach Δ=1 (move dollar-for-dollar). Far OTM options approach Δ=0.`}
                        example="Traders also read delta as the probability the option expires in-the-money."
                    />
                    <GreekCard
                        icon={BarChart2} name="Gamma" symbol="Γ" value={bs.gamma} color="purple"
                        what="How fast delta changes as the stock moves — the acceleration."
                        interpret={`Gamma of ${fmt(bs.gamma, 6)} means delta changes by that amount for each $1 move in ${ticker}. High gamma (near ATM, near expiry) means your delta exposure can shift quickly.`}
                        example="High gamma is a double-edged sword: big gains if the stock moves your way, but delta can flip fast against you."
                    />
                    <GreekCard
                        icon={Clock} name="Theta" symbol="Θ" value={bs.thetaCall} color="red"
                        what="Daily time decay — how much the option loses in value each day, all else equal."
                        interpret={`This call loses $${fmt(Math.abs(bs.thetaCall), 4)} of value every day purely from time passing. With ${days} days left, you lose roughly $${fmt(Math.abs(bs.thetaCall) * days, 2)} total to decay if the stock stays flat.`}
                        example="Theta always works against the option buyer and in favor of the option seller."
                    />
                    <GreekCard
                        icon={Zap} name="Vega" symbol="ν" value={bs.vega} color="green"
                        what="Sensitivity to a 1% change in implied volatility."
                        interpret={`If IV rises 1% (from ${iv}% to ${iv + 1}%), this option gains $${fmt(bs.vega, 4)}. If IV drops 1%, it loses the same. Vega is highest for longer-dated options and near ATM.`}
                        example="Buying options before earnings (when IV spikes) and selling after (IV crush) is a pure vega trade."
                    />
                </div>
            </Section>

            {/* d1 / d2 explanation */}
            <Section icon={BookOpen} title="d₁ and d₂ — What the formula is really doing" accent="indigo">
                <div className="grid sm:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="space-y-2">
                        <p className="font-mono font-bold text-gray-900 dark:text-white">d₁ = {fmt(bs.d1, 4)}</p>
                        <p>d₁ captures how far the stock price is from the strike, adjusted for drift and volatility over time.
                        N(d₁) is the <strong className="text-gray-900 dark:text-white">delta</strong> of the call — the hedge ratio.</p>
                    </div>
                    <div className="space-y-2">
                        <p className="font-mono font-bold text-gray-900 dark:text-white">d₂ = {fmt(bs.d2, 4)}</p>
                        <p>d₂ = d₁ − σ√T. N(d₂) is the <strong className="text-gray-900 dark:text-white">risk-neutral probability</strong> that the option expires in-the-money.
                        Right now that's approximately <strong className="text-gray-900 dark:text-white">{(normCDF(bs.d2) * 100).toFixed(1)}%</strong>.</p>
                    </div>
                </div>
            </Section>

            {/* AI Summary */}
            <Section icon={BookOpen} title="AI Summary" subtitle="Get a plain-English interpretation of these numbers" accent="emerald">
                <button
                    onClick={generateSummary}
                    disabled={loadingSummary}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                    {loadingSummary
                        ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                        : 'Generate Summary'
                    }
                </button>
                {summary && (
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {summary}
                    </div>
                )}
            </Section>
        </div>
    );
}

