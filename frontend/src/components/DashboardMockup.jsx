import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart2, LayoutDashboard, Home, BrainCircuit, RefreshCw, Layers } from 'lucide-react';

const TICKERS = [
    { t: 'AAPL', signal: 'bullish', bull: 68, bear: 14, posts: 284 },
    { t: 'TSLA', signal: 'bearish', bull: 22, bear: 61, posts: 517 },
    { t: 'NVDA', signal: 'bullish', bull: 74, bear: 12, posts: 391 },
    { t: 'MSFT', signal: 'bullish', bull: 55, bear: 20, posts: 148 },
    { t: 'AMZN', signal: 'neutral', bull: 40, bear: 38, posts: 203 },
    { t: 'META', signal: 'bullish', bull: 62, bear: 18, posts: 176 },
    { t: 'GOOGL', signal: 'neutral', bull: 44, bear: 35, posts: 159 },
    { t: 'SPY',  signal: 'bullish', bull: 58, bear: 22, posts: 412 },
];

const SPARKLINES = {
    AAPL:  [172,174,176,175,178,181,180,183,185,184,187,189],
    TSLA:  [195,192,188,190,185,183,179,181,178,175,173,170],
    NVDA:  [820,835,828,845,860,855,870,882,875,890,905,918],
    MSFT:  [378,380,377,382,385,383,388,390,387,392,395,393],
    AMZN:  [178,179,181,180,182,184,183,185,186,184,187,186],
    META:  [485,490,488,495,502,498,505,510,507,512,518,515],
    GOOGL: [168,170,169,172,174,173,175,177,176,178,179,178],
    SPY:   [528,531,535,533,537,539,538,541,540,542,543,542],
};

const SIGNAL_CONFIG = {
    bullish: { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.25)', Icon: TrendingUp,  label: 'Bullish' },
    bearish: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.25)', Icon: TrendingDown, label: 'Bearish' },
    neutral: { color: '#d97706', bg: 'rgba(217,119,6,0.08)', border: 'rgba(217,119,6,0.25)',  Icon: Minus,       label: 'Neutral' },
};

function MiniSparkline({ prices, positive, width = 56, height = 24 }) {
    if (!prices) return null;
    const min = Math.min(...prices), max = Math.max(...prices);
    const range = max - min || 1;
    const pad = 1.5;
    const pts = prices.map((p, i) => {
        const x = pad + (i / (prices.length - 1)) * (width - pad * 2);
        const y = pad + (1 - (p - min) / range) * (height - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const color = positive ? '#22c55e' : '#ef4444';
    const id = `sp-${positive ? 'u' : 'd'}-${width}`;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon points={`${pad},${height} ${pts} ${width - pad},${height}`} fill={`url(#${id})`} />
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

function TickerCard({ t, signal, bull, bear, posts, delay = 0 }) {
    const cfg = SIGNAL_CONFIG[signal];
    const Icon = cfg.Icon;
    const prices = SPARKLINES[t];
    return (
        <div
            className="rounded-xl p-3 theme-transition"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', animation: `fadeSlideIn 0.4s ${delay}ms both` }}
        >
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold font-mono t-primary">{t}</span>
                <span className="flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-md"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                    <Icon size={9} />{cfg.label}
                </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden flex mb-1.5" style={{ background: 'var(--surface-2)' }}>
                <div style={{ width: `${bull}%`, background: '#22c55e', height: '100%' }} />
                <div style={{ width: `${bear}%`, background: '#ef4444', height: '100%' }} />
            </div>
            <div className="flex items-end justify-between">
                <div className="flex justify-between w-full text-xs t-muted">
                    <span style={{ color: '#16a34a' }}>{bull}%</span>
                    <span style={{ opacity: 0.5 }}>{posts}</span>
                    <span style={{ color: '#dc2626' }}>{bear}%</span>
                </div>
            </div>
            {prices && <div className="mt-1.5"><MiniSparkline prices={prices} positive={signal === 'bullish'} /></div>}
        </div>
    );
}

const NAV_ITEMS = [
    { id: 'home',       label: 'Home',       Icon: Home },
    { id: 'dashboard',  label: 'Dashboard',  Icon: LayoutDashboard },
    { id: 'sectors',    label: 'Sectors',    Icon: Layers },
    { id: 'confidence', label: 'Confidence', Icon: BrainCircuit },
];

export default function DashboardMockup() {
    const [activeTab, setActiveTab] = useState('dashboard');

    useEffect(() => {
        const tabs = ['dashboard', 'home', 'sectors', 'confidence'];
        let i = 0;
        const t = setInterval(() => { i = (i + 1) % tabs.length; setActiveTab(tabs[i]); }, 3200);
        return () => clearInterval(t);
    }, []);

    return (
        <div
            className="w-full rounded-2xl overflow-hidden theme-transition"
            style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-hover), 0 0 0 1px var(--border)',
            }}
        >
            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-4 py-3 theme-transition" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <div className="flex gap-1.5 flex-shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400 opacity-70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400 opacity-70" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 opacity-70" />
                </div>
                {/* Navbar */}
                <div className="flex items-center gap-1 flex-1 justify-center">
                    <div className="relative flex items-center gap-0.5 px-1 py-0.5 rounded-xl" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                        {NAV_ITEMS.map(({ id, label, Icon }) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-300"
                                style={{
                                    background: activeTab === id ? 'var(--accent)' : 'transparent',
                                    color: activeTab === id ? 'var(--accent-text)' : 'var(--text-muted)',
                                }}>
                                <Icon size={10} />{label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                        <BarChart2 size={10} style={{ color: 'var(--accent-text)' }} />
                    </div>
                    <span className="text-xs font-bold gradient-text">Rylo</span>
                </div>
            </div>

            {/* Page content — fixed height so tab switches don't resize the mockup */}
            <div className="p-5 overflow-y-auto" style={{ height: 340 }}>

                {/* Dashboard tab */}
                {activeTab === 'dashboard' && (
                    <div style={{ animation: 'fadeSlideIn 0.35s ease both' }}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-base font-bold gradient-text">Sentiment Dashboard</h2>
                                <p className="text-xs t-muted">Market sentiment via StockTwits</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}>
                                    Mixed
                                </span>
                                <RefreshCw size={12} className="t-muted" />
                            </div>
                        </div>
                        {/* Mood bar */}
                        <div className="rounded-xl px-3 py-2.5 mb-4 theme-transition" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                            <div className="flex justify-between text-xs mb-1.5 t-muted">
                                <span style={{ color: '#16a34a' }}>54% bullish</span>
                                <span>Overall Market Mood</span>
                                <span style={{ color: '#dc2626' }}>24% bearish</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden flex" style={{ background: 'var(--border)' }}>
                                <div style={{ width: '54%', background: '#22c55e' }} />
                                <div style={{ width: '22%', background: 'var(--border)' }} />
                                <div style={{ width: '24%', background: '#ef4444' }} />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {TICKERS.map((tk, i) => <TickerCard key={tk.t} {...tk} delay={i * 50} />)}
                        </div>
                    </div>
                )}

                {/* Home tab */}
                {activeTab === 'home' && (
                    <div style={{ animation: 'fadeSlideIn 0.35s ease both' }}>
                        <h2 className="text-base font-bold gradient-text mb-4">Market Overview</h2>
                        <div className="rounded-xl overflow-hidden mb-4 theme-transition" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
                            <div className="flex divide-x">
                                {[
                                    { s: 'SPY',  p: 542.18, chg: 1.23,  prices: [528,531,535,533,537,539,538,541,540,542,543,542] },
                                    { s: 'QQQ',  p: 461.34, chg: 1.87,  prices: [445,448,452,450,455,458,456,460,459,462,463,461] },
                                    { s: 'DIA',  p: 397.52, chg: 0.64,  prices: [390,391,393,392,394,395,394,396,395,397,398,397] },
                                    { s: 'VIX',  p: 14.82,  chg: -4.20, prices: [22,20,19,18,17,18,16,15,16,15,14,14] },
                                ].map(({ s, p, chg, prices }, i) => {
                                    const up = chg >= 0;
                                    return (
                                        <div key={s} className="flex-1 px-4 py-3" style={{ borderRight: i < 3 ? '1px solid var(--border)' : 'none', animation: `fadeSlideIn 0.4s ${i * 60}ms both` }}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold font-mono t-muted">{s}</span>
                                                <span className="text-xs font-semibold px-1 py-0.5 rounded" style={{ background: up ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', color: up ? '#16a34a' : '#dc2626' }}>
                                                    {up ? '+' : ''}{chg}%
                                                </span>
                                            </div>
                                            <div className="text-sm font-bold t-primary font-mono">${p.toFixed(2)}</div>
                                            <MiniSparkline prices={prices} positive={up} width={64} height={22} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Top Gainers', items: [['NVDA','+3.4%'],['META','+2.1%'],['AAPL','+1.8%']], color: '#16a34a' },
                                { label: 'Top Losers',  items: [['TSLA','-2.9%'],['BIDU','-1.7%'],['NIO', '-1.2%']], color: '#dc2626' },
                            ].map(({ label, items, color }) => (
                                <div key={label} className="rounded-xl p-3 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                                    <p className="text-xs font-semibold t-muted mb-2">{label}</p>
                                    {items.map(([t, pct]) => (
                                        <div key={t} className="flex justify-between items-center py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                                            <span className="text-xs font-mono font-semibold t-primary">{t}</span>
                                            <span className="text-xs font-mono font-semibold" style={{ color }}>{pct}</span>
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sectors tab */}
                {activeTab === 'sectors' && (
                    <div style={{ animation: 'fadeSlideIn 0.35s ease both' }}>
                        <h2 className="text-base font-bold gradient-text mb-4">Sector Rotation</h2>
                        <div className="space-y-2">
                            {[
                                { name: 'Technology',   etf: 'XLK', ret: '+3.2%',  pos: true,  bar: 78 },
                                { name: 'Energy',       etf: 'XLE', ret: '+1.8%',  pos: true,  bar: 62 },
                                { name: 'Financials',   etf: 'XLF', ret: '+0.9%',  pos: true,  bar: 51 },
                                { name: 'Healthcare',   etf: 'XLV', ret: '-0.4%',  pos: false, bar: 43 },
                                { name: 'Real Estate',  etf: 'XLRE',ret: '-1.7%',  pos: false, bar: 28 },
                                { name: 'Utilities',    etf: 'XLU', ret: '-2.3%',  pos: false, bar: 18 },
                            ].map(({ name, etf, ret, pos, bar }, i) => (
                                <div key={etf} className="flex items-center gap-3 rounded-lg px-3 py-1.5 theme-transition"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', animation: `fadeSlideIn 0.35s ${i * 50}ms both` }}>
                                    <span className="text-xs font-mono font-bold t-muted w-9 flex-shrink-0">{etf}</span>
                                    <span className="text-xs t-primary flex-1">{name}</span>
                                    <div className="w-24 h-1.5 rounded-full overflow-hidden flex-shrink-0" style={{ background: 'var(--surface-2)' }}>
                                        <div style={{ width: `${bar}%`, height: '100%', background: pos ? '#22c55e' : '#ef4444', borderRadius: 999 }} />
                                    </div>
                                    <span className="text-xs font-mono font-semibold w-10 text-right flex-shrink-0" style={{ color: pos ? '#16a34a' : '#dc2626' }}>{ret}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Confidence tab */}
                {activeTab === 'confidence' && (
                    <div style={{ animation: 'fadeSlideIn 0.35s ease both' }}>
                        <h2 className="text-base font-bold gradient-text mb-4">Confidence Calculator</h2>
                        <div className="space-y-3">
                            {[
                                { t: 'AAPL', conf: 72, dir: 'bullish', drivers: ['Bullish market backdrop', 'Strong momentum'] },
                                { t: 'NVDA', conf: 81, dir: 'bullish', drivers: ['High sentiment score', 'Positive price return'] },
                                { t: 'TSLA', conf: 68, dir: 'bearish', drivers: ['Weak sentiment', 'Elevated VRP'] },
                            ].map(({ t, conf, dir, drivers }, i) => {
                                const color = dir === 'bullish' ? '#16a34a' : '#dc2626';
                                const bg    = dir === 'bullish' ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)';
                                const Icon  = dir === 'bullish' ? TrendingUp : TrendingDown;
                                return (
                                    <div key={t} className="rounded-xl p-3 theme-transition" style={{ background: 'var(--surface)', border: '1px solid var(--border)', animation: `fadeSlideIn 0.4s ${i * 80}ms both` }}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-bold font-mono t-primary">{t}</span>
                                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: bg }}>
                                                <Icon size={11} style={{ color }} />
                                                <span className="text-xs font-semibold" style={{ color }}>{conf}% confidence</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--surface-2)' }}>
                                            <div style={{ width: `${conf}%`, background: color, height: '100%', borderRadius: '999px', transition: 'width 1s ease' }} />
                                        </div>
                                        <div className="flex gap-1.5">
                                            {drivers.map(d => (
                                                <span key={d} className="text-xs px-2 py-0.5 rounded-md t-muted" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>{d}</span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
