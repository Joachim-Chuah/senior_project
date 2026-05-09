import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw, SlidersHorizontal, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { fetchOverview } from '../utils/stocktwits';

const UNIVERSE = [
  // Mega-cap tech
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA',
  // Semiconductors / hardware
  'AMD', 'INTC', 'AVGO', 'QCOM', 'MU',
  // Finance
  'JPM', 'BAC', 'GS', 'V', 'MA', 'COIN',
  // Healthcare
  'JNJ', 'UNH', 'PFE', 'ABBV',
  // Energy
  'XOM', 'CVX', 'OXY',
  // Consumer
  'WMT', 'COST', 'NKE', 'MCD',
  // ETFs
  'SPY', 'QQQ', 'IWM', 'GLD', 'TLT',
  // Popular retail
  'PLTR', 'RIVN', 'SOFI', 'MARA', 'AMC', 'GME',
  // Other tech
  'NFLX', 'ORCL', 'CRM', 'UBER',
];

const SIGNAL_CONFIG = {
  bullish: { color: '#16a34a', bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.25)',  icon: TrendingUp,   label: 'Bullish' },
  bearish: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)',  border: 'rgba(220,38,38,0.25)',  icon: TrendingDown, label: 'Bearish' },
  neutral: { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.25)',  icon: Minus,        label: 'Neutral' },
};

const SORT_OPTIONS = [
  { id: 'posts_desc',  label: 'Most discussed' },
  { id: 'bull_desc',   label: 'Most bullish' },
  { id: 'bear_desc',   label: 'Most bearish' },
  { id: 'score_desc',  label: 'Highest score' },
  { id: 'score_asc',   label: 'Lowest score' },
];

const MIN_POSTS_OPTIONS = [
  { id: 0,  label: 'Any' },
  { id: 5,  label: '5+' },
  { id: 10, label: '10+' },
  { id: 20, label: '20+' },
];

function sortResults(results, sortId) {
  const sorted = [...results];
  switch (sortId) {
    case 'posts_desc':  return sorted.sort((a, b) => b.total_posts - a.total_posts);
    case 'bull_desc':   return sorted.sort((a, b) => (b.bullish_count / Math.max(b.total_posts, 1)) - (a.bullish_count / Math.max(a.total_posts, 1)));
    case 'bear_desc':   return sorted.sort((a, b) => (b.bearish_count / Math.max(b.total_posts, 1)) - (a.bearish_count / Math.max(a.total_posts, 1)));
    case 'score_desc':  return sorted.sort((a, b) => b.score - a.score);
    case 'score_asc':   return sorted.sort((a, b) => a.score - b.score);
    default:            return sorted;
  }
}

function ScreenerRow({ item, onSelect }) {
  const cfg     = SIGNAL_CONFIG[item.signal] || SIGNAL_CONFIG.neutral;
  const Icon    = cfg.icon;
  const bullPct = item.total_posts > 0 ? Math.round((item.bullish_count / item.total_posts) * 100) : 0;
  const bearPct = item.total_posts > 0 ? Math.round((item.bearish_count / item.total_posts) * 100) : 0;
  const scorePct = Math.round(Math.abs(item.score) * 100);

  return (
    <button onClick={() => onSelect(item.ticker)}
      className="w-full flex items-center gap-4 px-3 py-2.5 text-left transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}>

      {/* Ticker + name */}
      <div className="w-40 flex-shrink-0">
        <span className="text-sm font-semibold font-mono" style={{ color: 'var(--text)' }}>{item.ticker}</span>
        {item.company_name && item.company_name !== item.ticker && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.company_name}</p>
        )}
      </div>

      {/* Signal */}
      <div className="w-20 flex-shrink-0">
        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-sm font-medium"
          style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
          <Icon size={10} />{cfg.label}
        </span>
      </div>

      {/* Bull/bear bar */}
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: 'var(--surface-2)' }}>
          <div className="h-full" style={{ width: `${bullPct}%`, background: '#22c55e' }} />
          <div className="h-full" style={{ width: `${bearPct}%`, background: '#ef4444' }} />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5 flex-shrink-0 text-xs font-mono">
        <span style={{ color: '#16a34a', minWidth: 32 }}>{bullPct}%↑</span>
        <span style={{ color: '#dc2626', minWidth: 32 }}>{bearPct}%↓</span>
        <span style={{ color: 'var(--text-muted)', minWidth: 52 }}>{item.total_posts} posts</span>
        <span style={{ color: item.score >= 0 ? '#16a34a' : '#dc2626', minWidth: 48 }}>
          {item.score >= 0 ? '+' : ''}{scorePct}% conf
        </span>
      </div>

      <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.4 }} />
    </button>
  );
}

export default function Screener({ navigateTo }) {
  const [results, setResults]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [hasRun, setHasRun]     = useState(false);

  // Filters
  const [signal,   setSignal]   = useState('all');
  const [minPosts, setMinPosts] = useState(0);
  const [sortBy,   setSortBy]   = useState('posts_desc');

  const runScreen = useCallback(async () => {
    setLoading(true);
    setError(null);
    setHasRun(true);
    try {
      const data = await fetchOverview(api, UNIVERSE);
      setResults(data);
    } catch {
      setError('Failed to fetch sentiment data.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run on mount
  useEffect(() => { runScreen(); }, [runScreen]);

  const filtered = sortResults(
    results.filter(r => {
      if (signal !== 'all' && r.signal !== signal) return false;
      if (r.total_posts < minPosts) return false;
      return true;
    }),
    sortBy
  );

  const counts = {
    all:     results.length,
    bullish: results.filter(r => r.signal === 'bullish').length,
    bearish: results.filter(r => r.signal === 'bearish').length,
    neutral: results.filter(r => r.signal === 'neutral').length,
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Screener</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Scan {UNIVERSE.length} tickers by sentiment signal and activity
          </p>
        </div>
        <button onClick={runScreen} disabled={loading} title="Refresh"
          className="p-2 rounded-sm transition-colors disabled:opacity-40"
          style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 py-3 px-3 rounded-md" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal size={12} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Filters</span>
        </div>

        {/* Signal filter */}
        <div className="flex items-center gap-1">
          {[
            { id: 'all',     label: 'All' },
            { id: 'bullish', label: 'Bullish', color: '#16a34a' },
            { id: 'bearish', label: 'Bearish', color: '#dc2626' },
            { id: 'neutral', label: 'Neutral', color: '#d97706' },
          ].map(opt => (
            <button key={opt.id} onClick={() => setSignal(opt.id)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-sm text-xs transition-colors"
              style={{
                background: signal === opt.id ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${signal === opt.id ? 'var(--border-hover)' : 'transparent'}`,
                color: signal === opt.id && opt.color ? opt.color : signal === opt.id ? 'var(--text)' : 'var(--text-muted)',
              }}>
              {opt.label}
              {hasRun && <span style={{ opacity: 0.5 }}>{counts[opt.id]}</span>}
            </button>
          ))}
        </div>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />

        {/* Min posts */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Min posts</span>
          <div className="flex items-center gap-1">
            {MIN_POSTS_OPTIONS.map(opt => (
              <button key={opt.id} onClick={() => setMinPosts(opt.id)}
                className="px-2.5 py-1 rounded-sm text-xs transition-colors"
                style={{
                  background: minPosts === opt.id ? 'var(--surface-2)' : 'transparent',
                  border: `1px solid ${minPosts === opt.id ? 'var(--border-hover)' : 'transparent'}`,
                  color: minPosts === opt.id ? 'var(--text)' : 'var(--text-muted)',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'var(--border)' }} />

        {/* Sort */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Sort</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-xs px-2 py-1 rounded-sm outline-none cursor-pointer"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {SORT_OPTIONS.map(opt => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>
        </div>

        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {loading ? 'Scanning…' : hasRun ? `${filtered.length} results` : ''}
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md px-4 py-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results table */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>

        {/* Table header */}
        <div className="flex items-center gap-4 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span className="w-40 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ticker</span>
          <span className="w-20 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Signal</span>
          <span className="flex-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sentiment</span>
          <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)', minWidth: 200 }}>Stats</span>
          <span className="w-4 flex-shrink-0" />
        </div>

        {loading
          ? Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="h-4 skeleton rounded w-16 flex-shrink-0" />
                <div className="h-4 skeleton rounded w-14 flex-shrink-0" />
                <div className="h-1.5 skeleton rounded flex-1" />
                <div className="h-4 skeleton rounded w-40 flex-shrink-0" />
              </div>
            ))
          : filtered.length === 0 && hasRun
            ? <p className="text-sm text-center py-12" style={{ color: 'var(--text-muted)' }}>No tickers match the current filters.</p>
            : filtered.map(item => (
                <ScreenerRow key={item.ticker} item={item} onSelect={t => navigateTo('dashboard', t)} />
              ))
        }
      </div>
    </div>
  );
}
