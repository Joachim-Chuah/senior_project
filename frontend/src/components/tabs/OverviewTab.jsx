import React from 'react'
import {
  BarChart2,
  Layers,
  SlidersHorizontal,
  MessageSquare,
  TrendingUp,
  Brain,
  Activity,
  Newspaper,
} from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Sentiment Analysis',
    description:
      'Real-time bullish/bearish signals blending StockTwits posts and Reddit discussions, classified by FinBERT.',
  },
  {
    icon: Layers,
    title: 'Sector Rotation',
    description:
      'Track YTD performance across 15 market sectors with top movers, laggards, and Marketaux-sourced news.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Stock Screener',
    description:
      'Scan trending tickers against a 6-signal confidence model combining momentum, volume, and sentiment.',
  },
  {
    icon: Brain,
    title: 'AI Analysis — Wong',
    description:
      'Groq-powered chat with RAG context from company profiles and recent news. Ask anything about a ticker.',
  },
]

const stack = [
  { label: 'Sentiment', value: 'StockTwits · Reddit · FinBERT' },
  { label: 'AI', value: 'Groq LLM · pgvector RAG' },
  { label: 'Market data', value: 'yfinance · FMP · Marketaux' },
  { label: 'Backend', value: 'FastAPI · PostgreSQL' },
]

export default function OverviewTab() {
  return (
    <div className="flex flex-col items-center px-6 py-12 max-w-2xl mx-auto w-full">
      {/* Logo + name */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: 'var(--accent)' }}
        >
          <BarChart2 size={16} style={{ color: 'var(--accent-text)' }} />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--text)' }}>
          Rylo
        </h1>
      </div>

      {/* Tagline */}
      <p className="text-base text-center mb-2" style={{ color: 'var(--text-muted)' }}>
        Real-time market intelligence for retail traders.
      </p>

      {/* Divider */}
      <div className="w-12 h-px my-8" style={{ background: 'var(--border)' }} />

      {/* Description */}
      <p
        className="text-sm text-center leading-relaxed mb-10 max-w-lg"
        style={{ color: 'var(--text-muted)' }}
      >
        Rylo aggregates social sentiment from StockTwits and Reddit, sector rotation data, and
        options analytics into a unified confidence scoring system — helping retail traders cut
        through noise and act on signal.
      </p>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 w-full mb-10">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="p-4 rounded-lg border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
                {title}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          </div>
        ))}
      </div>

      {/* Stack */}
      <div
        className="w-full rounded-lg border p-4"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <p className="text-xs font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Tech stack
        </p>
        <div className="grid grid-cols-2 gap-2">
          {stack.map(({ label, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                {label}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
