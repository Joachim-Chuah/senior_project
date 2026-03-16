import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Activity, Newspaper, AlertCircle } from 'lucide-react';
import api from '../utils/api';

function formatPct(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
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
  const then = new Date(dateStr);
  const diff = Math.floor((Date.now() - then.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function IndexCard({ quote }) {
  const up = quote.changesPercentage >= 0;
  return (
    <div className="flex-1 min-w-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{quote.symbol}</span>
        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${up ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
          {formatPct(quote.changesPercentage)}
        </span>
      </div>
      <div className="text-lg font-bold text-gray-900 dark:text-white">{formatPrice(quote.price)}</div>
      <div className={`text-xs mt-0.5 ${up ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {up ? '+' : ''}{parseFloat(quote.change).toFixed(2)}
      </div>
    </div>
  );
}

function MoverRow({ item, showVolume }) {
  const up = item.changesPercentage >= 0;
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="min-w-0 flex-1 mr-3">
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
    </div>
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
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const lastUpdated = data?.fetched_at
    ? new Date(data.fetched_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Market Overview</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Last updated {lastUpdated}</p>
          )}
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

      {/* Warning banner if no API key */}
      {data?.warning && (
        <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-300">{data.warning}</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Indices row */}
      {loading ? (
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} className="flex-1 h-20" />)}
        </div>
      ) : data?.indices?.length > 0 ? (
        <div className="flex gap-3 flex-wrap">
          {data.indices.map((q) => <IndexCard key={q.symbol} quote={q} />)}
        </div>
      ) : null}

      {/* Movers grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <SkeletonBlock key={i} className="h-64" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MoverCard
            title="Top Gainers"
            icon={TrendingUp}
            items={data?.gainers ?? []}
            showVolume={false}
            color="text-green-500"
          />
          <MoverCard
            title="Top Losers"
            icon={TrendingDown}
            items={data?.losers ?? []}
            showVolume={false}
            color="text-red-500"
          />
          <MoverCard
            title="Most Active"
            icon={Activity}
            items={data?.actives ?? []}
            showVolume={true}
            color="text-blue-500"
          />
        </div>
      )}

      {/* News */}
      {loading ? (
        <SkeletonBlock className="h-80" />
      ) : (
        <NewsCard items={data?.news ?? []} />
      )}
    </div>
  );
}
