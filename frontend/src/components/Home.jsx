import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, Sparkles, Newspaper } from 'lucide-react';
import api from '../utils/api';

// ─── Logo helpers ─────────────────────────────────────────────────────────────

const TICKER_DOMAINS = {
  SPY: 'ssga.com',
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  NVDA: 'nvidia.com',
  TSLA: 'tesla.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  GOOGL: 'google.com',
  GOOG: 'google.com',
  NFLX: 'netflix.com',
  AMD: 'amd.com',
  INTC: 'intel.com',
  JPM: 'jpmorganchase.com',
  BAC: 'bankofamerica.com',
  WMT: 'walmart.com',
  DIS: 'disney.com',
  PYPL: 'paypal.com',
  UBER: 'uber.com',
  SHOP: 'shopify.com',
  CRM: 'salesforce.com',
  ORCL: 'oracle.com',
  CSCO: 'cisco.com',
  QCOM: 'qualcomm.com',
  IBM: 'ibm.com',
};

function getLogoUrl(ticker) {
  const domain = TICKER_DOMAINS[ticker] || `${ticker.toLowerCase()}.com`;
  return `https://logo.clearbit.com/${domain}`;
}

// Consistent color per ticker for the fallback avatar
const FALLBACK_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

function tickerColor(ticker) {
  let n = 0;
  for (let i = 0; i < ticker.length; i++) n += ticker.charCodeAt(i);
  return FALLBACK_COLORS[n % FALLBACK_COLORS.length];
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

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatPct(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function formatPrice(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
}

function formatVolume(val) {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function stockLink(ticker) {
  return `https://www.stocktaper.com/stock/${ticker}`;
}

function IndexCard({ quote }) {
  const up = quote.changesPercentage >= 0;
  return (
    <a
      href={stockLink(quote.symbol)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all block"
    >
      <div className="flex items-center gap-3 mb-3">
        <TickerLogo ticker={quote.symbol} size={38} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white">{quote.symbol}</span>
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${up ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
              {formatPct(quote.changesPercentage)}
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{quote.name}</p>
        </div>
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">{formatPrice(quote.price)}</div>
      <div className={`text-xs mt-0.5 ${up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {up ? '+' : ''}{parseFloat(quote.change).toFixed(2)} today
      </div>
    </a>
  );
}

function MoverRow({ item, showVolume }) {
  const up = item.changesPercentage >= 0;
  return (
    <a
      href={stockLink(item.ticker)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-1 -mx-1 transition-colors"
    >
      <TickerLogo ticker={item.ticker} size={28} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.ticker}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.name}</div>
      </div>
      <div className="text-right flex-shrink-0">
        {showVolume ? (
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatVolume(item.volume)}</div>
        ) : (
          <div className={`text-sm font-semibold ${up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatPct(item.changesPercentage)}
          </div>
        )}
        <div className="text-xs text-gray-500 dark:text-gray-400">{formatPrice(item.price)}</div>
      </div>
    </a>
  );
}

function MoverCard({ title, icon: Icon, items, showVolume, color }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <Icon size={15} className={color} />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400 dark:text-gray-600 py-4 text-center">No data</div>
      ) : (
        <div className="overflow-hidden">
          {items.slice(0, 8).map((item) => (
            <MoverRow key={item.ticker} item={item} showVolume={showVolume} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsCard({ items }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Newspaper size={15} className="text-gray-500 dark:text-gray-400" />
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Latest News</span>
      </div>
      {items.length === 0 ? (
        <div className="text-xs text-gray-400 dark:text-gray-600 py-4 text-center">No news available</div>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.slice(0, 15).map((item, i) => (
            <li key={i} className="py-2.5">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="block group">
                <div className="text-sm text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 font-medium leading-snug">
                  {item.title}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-500">
                  <span>{item.site}</span>
                  {item.symbol && <span className="font-medium text-gray-400 dark:text-gray-600">{item.symbol}</span>}
                  <span>{timeAgo(item.publishedDate)}</span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SkeletonBlock({ className }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`} />;
}

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
      {/* Intro blurb */}
      <div className="text-center mb-5">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">End of Day Overview</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          A daily AI-generated summary of how markets closed — what moved, what drove it, and what the numbers suggest.
        </p>
      </div>

      {/* Today's summary card */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-medium">
              Groq AI
            </span>
            {generatedAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">· Generated {generatedAt}</span>
            )}
          </div>
          <button
            onClick={() => fetchSummary(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
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
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            Today's overview will be available after market close at <span className="font-medium text-gray-700 dark:text-gray-300">4:00 PM ET</span>.
          </p>
        ) : data?.summary ? (
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed text-center">{data.summary}</p>
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-600 text-center">Summary unavailable.</p>
        )}
      </div>

      {/* Previous day's summary — shown when market is open or as context */}
      {!loading && data?.prev_summary && (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              {data.market_closed === false ? 'Here\'s what happened' : 'Previous day'} · {prevDateLabel}
            </span>
            {prevGeneratedAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">· Generated {prevGeneratedAt}</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed text-center">{data.prev_summary}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
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
    } catch (err) {
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
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Market Overview</h1>
          {lastUpdated && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last updated {lastUpdated}</p>}
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={loading || refreshing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {data?.warning && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{data.warning}</p>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Indices row */}
      {loading ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="flex-1 h-28" />)}
        </div>
      ) : data?.indices?.length > 0 ? (
        <div className="flex gap-3 flex-wrap">
          {data.indices.map((q) => <IndexCard key={q.symbol} quote={q} />)}
        </div>
      ) : null}

      {/* Movers grid — Gainers + Losers only */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1].map((i) => <SkeletonBlock key={i} className="h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <MoverCard title="Top Gainers" icon={TrendingUp} items={data?.gainers ?? []} showVolume={false} color="text-green-500" />
          <MoverCard title="Top Losers" icon={TrendingDown} items={data?.losers ?? []} showVolume={false} color="text-red-500" />
        </div>
      )}

      {/* End of Day Overview */}
      <EndOfDayOverview />
    </div>
  );
}
