import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Flame, ExternalLink, RefreshCw, ArrowLeft, ChevronRight } from 'lucide-react';
import api from '../utils/api';

const PHASE_COLORS = {
  Bottoming:  { bg: 'rgba(196,166,92,0.1)',  border: 'rgba(196,166,92,0.2)',  text: '#c4a65c' },
  Early:      { bg: 'rgba(100,172,120,0.1)', border: 'rgba(100,172,120,0.2)', text: '#64ac78' },
  Mature:     { bg: 'rgba(110,143,182,0.1)', border: 'rgba(110,143,182,0.2)', text: '#6e8fb6' },
  Exhaustion: { bg: 'rgba(184,108,108,0.1)', border: 'rgba(184,108,108,0.2)', text: '#b86c6c' },
  Unknown:    { bg: 'transparent',            border: 'var(--border)',          text: 'var(--text-muted)' },
};

const ROTATION_COLORS = {
  Accumulation:   '#64ac78',
  Distribution:   '#b86c6c',
  'Reflex Setup': '#c4a65c',
  Fading:         '#9b7bc4',
  Neutral:        'var(--text-muted)',
};

function PhaseBadge({ phase }) {
  const c = PHASE_COLORS[phase] || PHASE_COLORS.Unknown;
  return (
    <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-sm"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {phase}
    </span>
  );
}

function ReturnCell({ value }) {
  if (value == null) return <span style={{ color: 'var(--text-muted)' }}>—</span>;
  const pos = value >= 0;
  return (
    <span className="font-mono text-sm font-semibold" style={{ color: pos ? '#16a34a' : '#dc2626' }}>
      {pos ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

// ─── Sector row ───────────────────────────────────────────────────────────────

function SectorRow({ sector, rank, onClick }) {
  const isHot = rank <= 2 && sector.ytd_return > 0;
  return (
    <button onClick={() => onClick(sector)}
      className="w-full flex items-center gap-4 px-3 py-3 text-left transition-colors"
      style={{ borderBottom: '1px solid var(--border)' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}>

      {/* Rank */}
      <span className="w-6 text-xs text-right flex-shrink-0" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>{rank}</span>

      {/* Name + ETF */}
      <div className="w-48 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{sector.name}</span>
          {isHot && (
            <span className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-sm font-medium"
              style={{ background: 'rgba(184,108,108,0.1)', color: '#b86c6c', border: '1px solid rgba(184,108,108,0.2)' }}>
              <Flame size={9} />Hot
            </span>
          )}
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sector.etf}</span>
      </div>

      {/* Phase */}
      <div className="w-24 flex-shrink-0">
        <PhaseBadge phase={sector.phase} />
      </div>

      {/* Rotation */}
      <div className="w-28 flex-shrink-0">
        <span className="text-xs font-medium" style={{ color: ROTATION_COLORS[sector.rotation] || 'var(--text-muted)' }}>
          {sector.rotation || '—'}
        </span>
      </div>

      {/* Returns */}
      <div className="flex items-center gap-6 flex-1 justify-end">
        <div className="text-right w-16 flex-shrink-0">
          <ReturnCell value={sector.ytd_return} />
        </div>
        <div className="text-right w-16 flex-shrink-0">
          <ReturnCell value={sector.one_month_return} />
        </div>
        <span className="text-xs font-mono w-16 text-right flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
          {sector.stock_count} stocks
        </span>
      </div>

      <ChevronRight size={13} style={{ color: 'var(--text-muted)', flexShrink: 0, opacity: 0.4 }} />
    </button>
  );
}

// ─── Sector detail ────────────────────────────────────────────────────────────

function SectorDetail({ sector, onBack }) {
  const [detail, setDetail]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get(`/sectors/${sector.id}`)
      .then(res => setDetail(res.data))
      .catch(() => setError('Failed to load sector detail.'))
      .finally(() => setLoading(false));
  }, [sector.id]);

  const maxAbs = detail ? Math.max(...detail.stocks.map(s => Math.abs(s.ytd_return)), 1) : 100;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <ArrowLeft size={13} />
            Sectors
          </button>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{sector.name}</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{sector.etf}</span>
          <PhaseBadge phase={sector.phase} />
          {sector.rotation && (
            <span className="text-xs font-medium" style={{ color: ROTATION_COLORS[sector.rotation] || 'var(--text-muted)' }}>
              {sector.rotation}
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
        </div>
      )}

      {error && (
        <div className="rounded-md px-4 py-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {detail && !loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Winners', value: detail.winner_count, color: '#16a34a' },
              { label: 'Losers',  value: detail.loser_count,  color: '#dc2626' },
              { label: 'Median YTD', value: `${detail.median_return >= 0 ? '+' : ''}${detail.median_return.toFixed(1)}%`, color: detail.median_return >= 0 ? '#16a34a' : '#dc2626' },
              { label: 'Avg YTD',   value: `${detail.avg_return >= 0 ? '+' : ''}${detail.avg_return.toFixed(1)}%`,    color: detail.avg_return >= 0 ? '#16a34a' : '#dc2626' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-md p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
                <p className="text-xl font-semibold font-mono" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>

          {/* AI narrative */}
          {detail.narrative && (
            <div className="rounded-md p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <p className="text-xs font-medium uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Market Context</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{detail.narrative}</p>
            </div>
          )}

          {/* Stock performance table */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
              YTD Stock Performance
            </p>
            <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
              {/* Table header */}
              <div className="flex items-center gap-3 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                <span className="w-16 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Ticker</span>
                <span className="flex-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Return</span>
                <span className="w-16 text-right flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>YTD</span>
                <span className="w-12 text-right flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rating</span>
              </div>

              {detail.stocks.map(stock => {
                const pos          = stock.ytd_return >= 0;
                const barWidth     = Math.abs(stock.ytd_return) / maxAbs * 100;
                const consensusColor = stock.analyst_consensus === 'Buy' ? '#16a34a' : stock.analyst_consensus === 'Sell' ? '#dc2626' : '#d97706';
                return (
                  <div key={stock.ticker}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <span className="w-16 flex-shrink-0 text-xs font-semibold font-mono" style={{ color: 'var(--text)' }}>{stock.ticker}</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, background: pos ? '#22c55e' : '#ef4444' }} />
                    </div>
                    <span className="w-16 text-right flex-shrink-0 text-xs font-semibold font-mono" style={{ color: pos ? '#16a34a' : '#dc2626' }}>
                      {pos ? '+' : ''}{stock.ytd_return.toFixed(1)}%
                    </span>
                    {stock.analyst_consensus ? (
                      <span className="w-12 text-right flex-shrink-0 text-xs font-medium" style={{ color: consensusColor }}>
                        {stock.analyst_consensus}
                      </span>
                    ) : <span className="w-12 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* News */}
          {detail.articles.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Supporting News
              </p>
              <div className="space-y-px rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {detail.articles.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 px-4 py-3 transition-colors"
                    style={{ borderBottom: i < detail.articles.length - 1 ? '1px solid var(--border)' : 'none', textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug" style={{ color: 'var(--text)' }}>{a.title}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{a.source}</p>
                    </div>
                    <ExternalLink size={12} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function SectorsOverview({ sectors, loading, error, onSelect }) {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>Sectors</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {sectors.length > 0 ? `${sectors.length} sectors · sorted by YTD return` : 'Sector rotation ranked by year-to-date performance'}
        </p>
      </div>

      {error && (
        <div className="rounded-md px-4 py-3 text-sm"
          style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border)' }}>

        {/* Table header */}
        <div className="flex items-center gap-4 px-3 py-2" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span className="w-6 flex-shrink-0" />
          <span className="w-48 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Sector</span>
          <span className="w-24 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phase</span>
          <span className="w-28 flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rotation</span>
          <div className="flex items-center gap-6 flex-1 justify-end">
            <span className="w-16 text-right flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>YTD</span>
            <span className="w-16 text-right flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>1M</span>
            <span className="w-16 text-right flex-shrink-0 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Stocks</span>
          </div>
          <span className="w-4 flex-shrink-0" />
        </div>

        {loading
          ? Array.from({ length: 11 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-6 flex-shrink-0" />
                <div className="h-4 skeleton rounded w-36 flex-shrink-0" />
                <div className="h-4 skeleton rounded w-16 flex-shrink-0" />
                <div className="h-4 skeleton rounded w-20 flex-shrink-0" />
                <div className="flex-1 flex justify-end gap-6">
                  <div className="h-4 skeleton rounded w-12" />
                  <div className="h-4 skeleton rounded w-12" />
                  <div className="h-4 skeleton rounded w-12" />
                </div>
              </div>
            ))
          : sectors.map((sector, i) => (
              <SectorRow key={sector.id} sector={sector} rank={i + 1} onClick={onSelect} />
            ))
        }
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Sectors() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/sectors')
      .then(res => setSectors(res.data))
      .catch(() => setError('Failed to load sector data. Make sure the backend is running.'))
      .finally(() => setLoading(false));
  }, []);

  if (selected) {
    return <SectorDetail sector={selected} onBack={() => setSelected(null)} />;
  }

  return <SectorsOverview sectors={sectors} loading={loading} error={error} onSelect={setSelected} />;
}
