import React from 'react'
import { cn } from '@/lib/utils'
import {
  Activity,
  Layers,
  SlidersHorizontal,
  Brain,
  LineChart,
  BarChart2,
} from 'lucide-react'

// ── Corner + icons ────────────────────────────────────────────────────────────

const PlusIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={20}
    height={20}
    strokeWidth="1"
    stroke="currentColor"
    className={cn('shrink-0', className)}
    style={{ color: 'var(--border-hover)' }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
)

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -top-2.5 -left-2.5" />
    <PlusIcon className="absolute -top-2.5 -right-2.5" />
    <PlusIcon className="absolute -bottom-2.5 -left-2.5" />
    <PlusIcon className="absolute -bottom-2.5 -right-2.5" />
  </>
)

// ── Bento card ────────────────────────────────────────────────────────────────

const BentoCard = ({ className, icon: Icon, title, description, accent }) => (
  <div
    className={cn(
      'relative rounded-lg border border-dashed p-6 flex flex-col justify-between min-h-[180px]',
      className,
    )}
    style={{ background: 'var(--surface)', borderColor: 'var(--border-hover)' }}
  >
    <CornerPlusIcons />
    <div className="relative z-10 flex flex-col gap-3">
      {Icon && (
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'var(--surface-2)' }}
        >
          <Icon size={15} style={{ color: accent || 'var(--text-muted)' }} />
        </div>
      )}
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
      </div>
    </div>
  </div>
)

// ── Card data ─────────────────────────────────────────────────────────────────

const cards = [
  {
    icon: Activity,
    title: 'Real-time Sentiment',
    description:
      'Aggregates StockTwits posts and Reddit discussions, classified by FinBERT into bullish, bearish, and neutral signals. Blended scoring gives you a single confidence number per ticker.',
  },
  {
    icon: Layers,
    title: 'Sector Rotation',
    description:
      'Track YTD performance across 15 market sectors. Surface winners and laggards, drill into top holdings, and read Marketaux-sourced news filtered by industry.',
  },
  {
    icon: Brain,
    title: 'AI Analysis — Wong',
    description:
      'Groq-powered chat with RAG context built from company profiles and recent market data. Ask anything about a ticker and get grounded, data-backed answers — not hallucinations. Wong pulls live sentiment signals, news headlines, and SEC filings into every response.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Stock Screener',
    description:
      'Run a 6-signal confidence scan across the top 40 trending tickers — momentum, volume, sentiment, and more.',
  },
  {
    icon: LineChart,
    title: 'Options Analytics',
    description:
      'Live options chain data with a built-in Black-Scholes pricing guide.',
  },
]

// ── Overview layout ───────────────────────────────────────────────────────────

export default function OverviewTab() {
  return (
    <div
      className="w-full border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="mx-auto max-w-5xl px-6 py-12">

        {/* Bento grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto gap-4">
          <BentoCard
            {...cards[0]}
            className="lg:col-span-3 lg:row-span-2"
          />
          <BentoCard
            {...cards[1]}
            className="lg:col-span-3 lg:row-span-2"
          />
          <BentoCard
            {...cards[2]}
            className="lg:col-span-4"
          />
          <BentoCard
            {...cards[3]}
            className="lg:col-span-2"
          />
          <BentoCard
            {...cards[4]}
            className="lg:col-span-2"
          />
        </div>

        {/* Footer heading — negative margin pulls it up alongside the last grid row */}
        <div className="max-w-2xl ml-auto text-right mt-6 lg:-mt-48">
          <div className="flex items-center justify-end gap-2 mb-4">
            <div
              className="w-5 h-5 rounded flex items-center justify-center"
              style={{ background: 'var(--accent)' }}
            >
              <BarChart2 size={11} style={{ color: 'var(--accent-text)' }} />
            </div>
            <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
              Rylo
            </span>
          </div>
          <h2
            className="text-4xl md:text-5xl font-bold leading-tight mb-4"
            style={{ color: 'var(--text)' }}
          >
            Built on signal.
            <br />
            Tuned for retail.
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Rylo turns social noise into actionable sentiment — combining StockTwits,
            Reddit, FinBERT, and Groq AI into one dashboard built for retail traders
            who want an edge without the Bloomberg terminal price tag.
          </p>
        </div>

      </div>
    </div>
  )
}
