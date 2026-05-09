import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Flame, X, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react';
import api from '../utils/api';

const PHASE_COLORS = {
  Bottoming:  { bg: 'rgba(234,179,8,0.12)',  border: 'rgba(234,179,8,0.4)',  text: '#ca8a04' },
  Early:      { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.4)',  text: '#16a34a' },
  Mature:     { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.4)', text: '#2563eb' },
  Exhaustion: { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',  text: '#dc2626' },
  Unknown:    { bg: 'rgba(148,163,184,0.12)',border: 'rgba(148,163,184,0.4)',text: '#64748b' },
};

const ROTATION_COLORS = {
  Accumulation:   '#16a34a',
  Distribution:   '#dc2626',
  'Reflex Setup': '#d97706',
  Fading:         '#9333ea',
  Neutral:        'var(--text-muted)',
};

function ReturnBadge({ value }) {
  const positive = value >= 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span className="flex items-center gap-1 font-bold text-lg" style={{ color: positive ? '#16a34a' : '#dc2626' }}>
      <Icon size={16} />
      {positive ? '+' : ''}{value.toFixed(1)}%
    </span>
  );
}

function PhaseBadge({ phase }) {
  const c = PHASE_COLORS[phase] || PHASE_COLORS.Unknown;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}>
      {phase}
    </span>
  );
}

// ─── Sector Heat Card ─────────────────────────────────────────────────────────

function SectorCard({ sector, rank, onClick }) {
  const isHot = rank <= 2 && sector.ytd_return > 0;
  return (
    <button
      onClick={() => onClick(sector)}
      className="w-full text-left rounded-xl p-4 transition-all theme-transition relative overflow-hidden"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {isHot && (
        <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)' }}>
          <Flame size={10} /> HOT
        </span>
      )}
      <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>#{rank}</p>
      <p className="text-sm font-bold mb-2" style={{ color: 'var(--text)' }}>{sector.name}</p>
      <ReturnBadge value={sector.ytd_return} />
      <div className="flex items-center justify-between mt-3">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{sector.stock_count} stocks</span>
        <span className="text-xs font-medium" style={{ color: sector.one_month_return >= 0 ? '#16a34a' : '#dc2626' }}>
          1M: {sector.one_month_return >= 0 ? '+' : ''}{sector.one_month_return.toFixed(1)}%
        </span>
      </div>
    </button>
  );
}

// ─── Sector Detail Panel ──────────────────────────────────────────────────────

function SectorDetail({ sector, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sector) return;
    setLoading(true);
    setError(null);
    api.get(`/sectors/${sector.id}`)
      .then(res => setDetail(res.data))
      .catch(() => setError('Failed to load sector detail.'))
      .finally(() => setLoading(false));
  }, [sector?.id]);

  const maxAbs = detail ? Math.max(...detail.stocks.map(s => Math.abs(s.ytd_return)), 1) : 100;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col h-full overflow-y-auto scrollbar-thin"
        style={{ width: 'min(560px, 100vw)', background: 'var(--bg)', borderLeft: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center gap-3 px-6 py-4" style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-ghost p-1.5 rounded-lg">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{sector.name}</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>ETF: {sector.etf} · {sector.category}</p>
          </div>
        </div>

        <div className="px-6 py-4 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={20} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          )}

          {error && (
            <p className="text-sm text-center py-10" style={{ color: 'var(--text-muted)' }}>{error}</p>
          )}

          {detail && !loading && (
            <>
              {/* Summary stats */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Winners', value: detail.winner_count, color: '#16a34a' },
                  { label: 'Losers',  value: detail.loser_count,  color: '#dc2626' },
                  { label: 'Median',  value: `${detail.median_return >= 0 ? '+' : ''}${detail.median_return.toFixed(1)}%`, color: detail.median_return >= 0 ? '#16a34a' : '#dc2626' },
                  { label: 'Avg YTD', value: `${detail.avg_return >= 0 ? '+' : ''}${detail.avg_return.toFixed(1)}%`,    color: detail.avg_return >= 0 ? '#16a34a' : '#dc2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="text-base font-bold" style={{ color }}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Phase + rotation */}
              <div className="flex items-center gap-3 flex-wrap">
                <PhaseBadge phase={sector.phase} />
                <span className="text-xs font-semibold" style={{ color: ROTATION_COLORS[sector.rotation] || 'var(--text-muted)' }}>
                  {sector.rotation}
                </span>
              </div>

              {/* AI narrative */}
              {detail.narrative && (
                <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>MARKET CONTEXT</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text)' }}>{detail.narrative}</p>
                </div>
              )}

              {/* Stock bar chart */}
              <div>
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>YTD STOCK PERFORMANCE</p>
                <div className="space-y-2">
                  {detail.stocks.map(stock => {
                    const positive = stock.ytd_return >= 0;
                    const barWidth = Math.abs(stock.ytd_return) / maxAbs * 100;
                    return (
                      <div key={stock.ticker} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0" style={{ width: '4.5rem' }}>
                          <span className="text-xs font-bold font-mono" style={{ color: 'var(--text)' }}>{stock.ticker}</span>
                        </div>
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                            <div
                              className="h-full rounded-sm transition-all duration-500"
                              style={{ width: `${barWidth}%`, background: positive ? '#22c55e' : '#ef4444', opacity: 0.85 }}
                            />
                          </div>
                          <span className="text-xs font-semibold flex-shrink-0 w-14 text-right" style={{ color: positive ? '#16a34a' : '#dc2626' }}>
                            {positive ? '+' : ''}{stock.ytd_return.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* News articles */}
              {detail.articles.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>SUPPORTING NEWS</p>
                  <div className="space-y-2">
                    {detail.articles.map((a, i) => (
                      <a
                        key={i}
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 rounded-xl p-3 transition-all"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--text)' }}>{a.title}</p>
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
      </div>
    </div>
  );
}

// ─── Main Sectors component ───────────────────────────────────────────────────

export default function Sectors() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/sectors')
      .then(res => setSectors(res.data))
      .catch(() => setError('Failed to load sector data. Check your FMP API key.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="h-full flex flex-col overflow-y-auto scrollbar-thin px-4 md:px-8 py-6">
      <div className="max-w-5xl mx-auto w-full space-y-6 anim-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold gradient-text">Sector Heat Rankings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {sectors.length > 0 ? `${sectors.length} sectors · sorted by YTD` : 'Loading sector data...'}
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="rounded-xl p-4 h-28 skeleton" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl p-6 text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sectors.map((sector, i) => (
              <SectorCard
                key={sector.id}
                sector={sector}
                rank={i + 1}
                onClick={setSelected}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <SectorDetail
          sector={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
