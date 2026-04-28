import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, Sparkles, Newspaper, Plus, X, Star, Clock, Activity } from 'lucide-react';
import api from '../utils/api';
import { fetchSignal } from '../utils/stocktwits';
import Sparkline from './Sparkline';
import { getLogoUrl, tickerColor, formatPct, formatPrice, formatVolume, timeAgo } from '../utils/marketHelpers';
import { useCountUp } from '../utils/useCountUp';

function AnimatedPrice({ value }) {
  const v = useCountUp(parseFloat(value) || 0);
  return <>{formatPrice(v)}</>;
}

function AnimatedPct({ value }) {
  const v = useCountUp(parseFloat(value) || 0);
  return <>{formatPct(v)}</>;
}

function AnimatedChange({ value, up }) {
  const v = useCountUp(Math.abs(parseFloat(value) || 0));
  return <>{up ? '+' : '-'}{v.toFixed(2)} today</>;
}

function TickerLogo({ ticker, size = 32, className = '' }) {
  const [failed, setFailed] = useState(false);
  const px = `${size}px`;

  if (failed) {
    return (
      <div
        className={`${tickerColor(ticker)} rounded-lg flex items-center justify-center flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      >
        <span className="text-white font-bold" style={{ fontSize: size * 0.35 }}>
          {ticker.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <img
      src={getLogoUrl(ticker)}
      alt={ticker}
      onError={() => setFailed(true)}
      className={`rounded-lg object-contain flex-shrink-0 bg-white ${className}`}
      style={{ width: px, height: px }}
    />
  );
}

function stockLink(ticker) {
  return `https://www.stocktaper.com/stock/${ticker}`;
}

// ─── Indices strip ────────────────────────────────────────────────────────────

function IndicesStrip({ indices }) {
  const [sparklines, setSparklines] = useState({});

  useEffect(() => {
    indices.forEach(({ symbol }) => {
      api.get(`/market/sparkline/${symbol}`)
        .then(res => setSparklines(prev => ({ ...prev, [symbol]: res.data.prices })))
        .catch(() => {});
    });
  }, [indices.map(q => q.symbol).join(',')]);

  return (
    <div
      className="w-full overflow-hidden theme-transition"
      style={{ border: '1px solid var(--border)', borderRadius: '1rem', background: 'var(--surface-2)' }}
    >
      <div className="flex divide-x" style={{ '--tw-divide-opacity': 1 }}>
        {indices.map((quote, i) => {
          const up = quote.changesPercentage >= 0;
          const prices = sparklines[quote.symbol];
          return (
            <a
              key={quote.symbol}
              href={stockLink(quote.symbol)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-0 px-5 py-4 flex flex-col gap-1 transition-colors"
              style={{ borderRight: i < indices.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold t-muted uppercase tracking-wider font-mono">{quote.symbol}</span>
                <span
                  className="text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                  style={{
                    background: up ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                    color: up ? '#16a34a' : '#dc2626',
                  }}
                >
                  <AnimatedPct value={quote.changesPercentage} />
                </span>
              </div>
              <div className="text-lg font-bold t-primary font-mono leading-none">
                <AnimatedPrice value={quote.price} />
              </div>
              <div className="flex items-end justify-between gap-2 mt-1">
                <div className="text-xs font-mono" style={{ color: up ? '#16a34a' : '#dc2626' }}>
                  <AnimatedChange value={quote.change} up={up} />
                </div>
                {prices && <Sparkline prices={prices} width={72} height={28} positive={up} />}
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mover row ────────────────────────────────────────────────────────────────

function MoverRow({ item, showVolume }) {
  const up = item.changesPercentage >= 0;
  return (
    <a
      href={stockLink(item.ticker)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 py-2.5 -mx-2 px-2 rounded-lg transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}
    >
      <TickerLogo ticker={item.ticker} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold t-primary font-mono leading-none">{item.ticker}</div>
        <div className="text-xs t-muted truncate mt-0.5">{item.name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        {showVolume ? (
          <div className="text-sm font-medium t-primary font-mono">{formatVolume(item.volume)}</div>
        ) : (
          <div
            className="text-sm font-semibold font-mono"
            style={{ color: up ? '#16a34a' : '#dc2626' }}
          >
            {formatPct(item.changesPercentage)}
          </div>
        )}
        <div className="text-xs t-muted font-mono mt-0.5">{formatPrice(item.price)}</div>
      </div>
    </a>
  );
}

// ─── Movers section (borderless list, no card wrapper) ────────────────────────

function MoversSection({ title, icon: Icon, items, showVolume, iconColor }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} style={{ color: iconColor }} />
        <span className="text-sm font-semibold t-primary">{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs t-muted py-4" style={{ opacity: 0.6 }}>No data</p>
      ) : (
        <div>
          {items.slice(0, 8).map((item) => (
            <MoverRow key={item.ticker} item={item} showVolume={showVolume} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── News section ─────────────────────────────────────────────────────────────

function NewsSection({ items }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={14} style={{ color: 'var(--text-muted)' }} />
        <span className="text-sm font-semibold t-primary">Latest News</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs t-muted py-4 text-center" style={{ opacity: 0.6 }}>No news available</p>
      ) : (
        <div>
          {items.slice(0, 15).map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-3 -mx-2 px-2 rounded-lg transition-colors group"
              style={{ borderBottom: '1px solid var(--border)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div className="text-sm t-primary font-medium leading-snug">{item.title}</div>
              <div className="flex items-center gap-2 mt-1 text-xs t-muted">
                <span>{item.site}</span>
                {item.symbol && <span className="font-medium" style={{ opacity: 0.6 }}>{item.symbol}</span>}
                <span>{timeAgo(item.publishedDate)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBlock({ className }) {
  return <div className={`skeleton rounded ${className}`} />;
}

// ─── End of Day Overview ──────────────────────────────────────────────────────

function EndOfDayOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchSummary = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await api.get('/market/summary');
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const generatedAt = data?.generated_at
    ? new Date(data.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const prevGeneratedAt = data?.prev_generated_at
    ? new Date(data.prev_generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const prevDateLabel = data?.prev_date
    ? new Date(data.prev_date + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    : null;

  return (
    <div className="max-w-3xl mx-auto w-full">
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold t-primary mb-1">End of Day Overview</h2>
        <p className="text-sm t-muted">
          A daily AI-generated summary of how markets closed — what moved, what drove it, and what the numbers suggest.
        </p>
      </div>

      <div className="card rounded-xl p-5 theme-transition">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: 'var(--text-muted)' }} />
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              Groq AI · Llama 4 Scout 17B
            </span>
            {generatedAt && (
              <span className="text-xs t-muted">· Generated {generatedAt}</span>
            )}
          </div>
          <button
            onClick={() => fetchSummary(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs t-muted transition-colors disabled:opacity-50"
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = ''}
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <SkeletonBlock className="h-4 w-full" />
            <SkeletonBlock className="h-4 w-11/12" />
            <SkeletonBlock className="h-4 w-5/6" />
            <SkeletonBlock className="h-4 w-4/6" />
          </div>
        ) : data?.market_closed === false ? (
          <p className="text-sm t-muted text-center">
            Today's overview will be available after market close at <span className="font-medium t-primary">4:00 PM ET</span>.
          </p>
        ) : data?.summary ? (
          <p className="text-sm t-primary leading-relaxed text-center">{data.summary}</p>
        ) : (
          <p className="text-sm t-muted text-center" style={{ opacity: 0.6 }}>Summary unavailable.</p>
        )}
      </div>

      {!loading && data?.prev_summary && (
        <div
          className="mt-4 rounded-xl p-5 theme-transition"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold t-primary uppercase tracking-wide">
              {data.market_closed === false ? "Here's what happened" : 'Previous day'} · {prevDateLabel}
            </span>
            {prevGeneratedAt && (
              <span className="text-xs t-muted">· Generated {prevGeneratedAt}</span>
            )}
          </div>
          <p className="text-sm t-primary leading-relaxed text-center">{data.prev_summary}</p>
        </div>
      )}
    </div>
  );
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

const SIGNAL_COLORS = {
  bullish: { color: '#16a34a', bg: 'rgba(22,163,74,0.08)', border: 'rgba(22,163,74,0.3)' },
  bearish: { color: '#dc2626', bg: 'rgba(220,38,38,0.08)', border: 'rgba(220,38,38,0.3)' },
  neutral: { color: '#d97706', bg: 'rgba(217,119,6,0.08)',  border: 'rgba(217,119,6,0.3)'  },
};

function WatchlistSection({ watchlist, addToWatchlist, removeFromWatchlist, navigateTo }) {
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [sentiments, setSentiments] = useState({});
  const [fetching, setFetching] = useState({});

  // Fetch sentiment for any ticker that doesn't have data yet
  useEffect(() => {
    watchlist.forEach(ticker => {
      if (sentiments[ticker] !== undefined || fetching[ticker]) return;
      setFetching(prev => ({ ...prev, [ticker]: true }));
      fetchSignal(api, ticker)
        .then(data => setSentiments(prev => ({ ...prev, [ticker]: data })))
        .catch(() => setSentiments(prev => ({ ...prev, [ticker]: null })))
        .finally(() => setFetching(prev => ({ ...prev, [ticker]: false })));
    });
  }, [watchlist]);

  function handleAdd(e) {
    e.preventDefault();
    const ticker = input.trim().toUpperCase();
    if (!ticker) return;
    if (!/^[A-Z]{1,5}$/.test(ticker)) {
      setInputError('Enter a valid ticker (1–5 letters).');
      return;
    }
    if (watchlist.includes(ticker)) {
      setInputError(`${ticker} is already in your watchlist.`);
      return;
    }
    addToWatchlist(ticker);
    setInput('');
    setInputError('');
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Star size={14} style={{ color: 'var(--accent)' }} />
        <h2 className="text-sm font-semibold t-primary">Watchlist</h2>
        <span className="text-xs t-muted ml-1" style={{ opacity: 0.5 }}>{watchlist.length} ticker{watchlist.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Add ticker */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value.toUpperCase()); setInputError(''); }}
          placeholder="Add ticker…"
          maxLength={5}
          className="flex-1 px-3 py-2 rounded-lg text-sm font-mono theme-transition"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            outline: 'none',
            maxWidth: '160px',
          }}
        />
        <button
          type="submit"
          className="btn-ghost flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
        >
          <Plus size={14} />
          Add
        </button>
      </form>
      {inputError && <p className="text-xs mb-3" style={{ color: '#dc2626' }}>{inputError}</p>}

      {watchlist.length === 0 ? (
        <p className="text-xs t-muted py-4" style={{ opacity: 0.5 }}>No tickers yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {watchlist.map(ticker => {
            const data = sentiments[ticker];
            const loading = fetching[ticker];
            const signal = data?.signal || 'neutral';
            const cfg = SIGNAL_COLORS[signal] || SIGNAL_COLORS.neutral;
            const bullPct = data && data.total_posts > 0
              ? Math.round((data.bullish_count / data.total_posts) * 100) : null;

            return (
              <div
                key={ticker}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl theme-transition"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => navigateTo('sentiment', ticker)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  <span className="text-sm font-bold font-mono t-primary">{ticker}</span>
                  {loading ? (
                    <span className="text-xs t-muted" style={{ opacity: 0.5 }}>Loading…</span>
                  ) : data ? (
                    <>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-lg capitalize"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
                      >
                        {signal}
                      </span>
                      {bullPct !== null && (
                        <span className="text-xs t-muted ml-auto pr-2" style={{ opacity: 0.6 }}>
                          {bullPct}% bull · {data.total_posts} posts
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs t-muted" style={{ opacity: 0.5 }}>Unavailable</span>
                  )}
                </button>
                <button
                  onClick={() => removeFromWatchlist(ticker)}
                  className="flex-shrink-0 p-1 rounded t-muted transition-colors"
                  style={{ opacity: 0.4 }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.4'}
                  title={`Remove ${ticker}`}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Market Status Panel ──────────────────────────────────────────────────────

function useMarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function MarketStatusPanel({ gainers = [], losers = [] }) {
  const now = useMarketClock();

  const etStr = now.toLocaleString('en-US', { timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const etDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayOfWeek = etDate.getDay(); // 0=Sun, 6=Sat
  const hour = etDate.getHours();
  const minute = etDate.getMinutes();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPremarket = !isWeekend && hour >= 4 && (hour < 9 || (hour === 9 && minute < 30));
  const isOpen = !isWeekend && (hour > 9 || (hour === 9 && minute >= 30)) && hour < 16;
  const isAfterHours = !isWeekend && hour >= 16 && hour < 20;

  const sessionLabel = isWeekend ? 'Weekend' : isPremarket ? 'Pre-market' : isOpen ? 'Market Open' : isAfterHours ? 'After-hours' : 'Market Closed';
  const sessionColor = isOpen ? '#16a34a' : isPremarket || isAfterHours ? '#d97706' : '#6b7280';
  const sessionBg = isOpen ? 'rgba(22,163,74,0.08)' : isPremarket || isAfterHours ? 'rgba(217,119,6,0.08)' : 'rgba(107,114,128,0.08)';
  const sessionBorder = isOpen ? 'rgba(22,163,74,0.25)' : isPremarket || isAfterHours ? 'rgba(217,119,6,0.25)' : 'rgba(107,114,128,0.2)';

  const totalMovers = gainers.length + losers.length || 1;
  const gainersPct = Math.round((gainers.length / totalMovers) * 100);
  const losersPct = 100 - gainersPct;

  const avgGain = gainers.length > 0
    ? (gainers.reduce((s, g) => s + Math.abs(g.changesPercentage || 0), 0) / gainers.length).toFixed(1)
    : '—';
  const avgLoss = losers.length > 0
    ? (losers.reduce((s, l) => s + Math.abs(l.changesPercentage || 0), 0) / losers.length).toFixed(1)
    : '—';

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Session status */}
      <div className="rounded-xl px-4 py-3 flex items-center justify-between theme-transition"
        style={{ background: sessionBg, border: `1px solid ${sessionBorder}` }}>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sessionColor, boxShadow: isOpen ? `0 0 6px ${sessionColor}` : 'none' }} />
          <span className="text-sm font-semibold" style={{ color: sessionColor }}>{sessionLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs t-muted">
          <Clock size={11} />
          {etStr} ET
        </div>
      </div>

      {/* Breadth */}
      <div className="rounded-xl px-4 py-4 theme-transition flex-1"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={13} style={{ color: 'var(--text-muted)' }} />
          <span className="text-xs font-semibold t-primary uppercase tracking-wider">Market Breadth</span>
        </div>

        <div className="h-2 rounded-full overflow-hidden flex mb-2">
          <div className="h-full transition-all" style={{ width: `${gainersPct}%`, background: '#22c55e' }} />
          <div className="h-full transition-all" style={{ width: `${losersPct}%`, background: '#ef4444' }} />
        </div>
        <div className="flex justify-between text-xs mb-4">
          <span style={{ color: '#16a34a' }}>{gainers.length} up</span>
          <span style={{ color: '#dc2626' }}>{losers.length} down</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.2)' }}>
            <p className="text-xs t-muted mb-0.5">Avg gain</p>
            <p className="text-base font-bold font-mono" style={{ color: '#16a34a' }}>+{avgGain}%</p>
          </div>
          <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <p className="text-xs t-muted mb-0.5">Avg loss</p>
            <p className="text-base font-bold font-mono" style={{ color: '#dc2626' }}>−{avgLoss}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home({ watchlist = [], addToWatchlist, removeFromWatchlist, navigateTo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get('/market/overview');
      setData(res.data);
    } catch {
      setError('Failed to load market data. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const lastUpdated = data?.fetched_at
    ? new Date(data.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold gradient-text">Market Overview</h1>
          {lastUpdated && <p className="text-xs t-muted mt-0.5">Last updated {lastUpdated}</p>}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          className="btn-ghost flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {data?.warning && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(217,119,6,0.07)', border: '1px solid rgba(217,119,6,0.25)' }}
        >
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: '#92400e' }}>{data.warning}</p>
        </div>
      )}

      {error && (
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Top 4 most traded by volume */}
      {loading ? (
        <SkeletonBlock className="h-20 w-full rounded-xl" />
      ) : (data?.actives?.length > 0 || data?.indices?.length > 0) ? (
        <div>
          <p className="text-xs font-semibold t-muted uppercase tracking-widest mb-2 px-1">Most Traded Today</p>
          <IndicesStrip indices={
            (data.actives?.length > 0 ? data.actives.slice(0, 4) : data.indices)
              .map(m => ({ ...m, symbol: m.symbol ?? m.ticker }))
          } />
        </div>
      ) : null}

      {/* Watchlist + Market Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          className="rounded-xl px-5 py-4 theme-transition"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <WatchlistSection
            watchlist={watchlist}
            addToWatchlist={addToWatchlist}
            removeFromWatchlist={removeFromWatchlist}
            navigateTo={navigateTo}
          />
        </div>
        <MarketStatusPanel gainers={data?.gainers ?? []} losers={data?.losers ?? []} />
      </div>

      {/* Movers — borderless lists side by side */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            {[0,1,2,3,4].map(i => <SkeletonBlock key={i} className="h-10 w-full" />)}
          </div>
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-32" />
            {[0,1,2,3,4].map(i => <SkeletonBlock key={i} className="h-10 w-full" />)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MoversSection
            title="Top Gainers"
            icon={TrendingUp}
            items={data?.gainers ?? []}
            showVolume={false}
            iconColor="#16a34a"
          />
          <MoversSection
            title="Top Losers"
            icon={TrendingDown}
            items={data?.losers ?? []}
            showVolume={false}
            iconColor="#dc2626"
          />
        </div>
      )}

      {/* End of Day Overview */}
      <EndOfDayOverview />
    </div>
  );
}
