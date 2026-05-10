import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Activity,
  Layers,
  SlidersHorizontal,
  Brain,
  Bookmark,
  BarChart2,
  ArrowRight,
} from 'lucide-react'

// ── Corner icons ──────────────────────────────────────────────────────────────

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

// ── Scramble text ─────────────────────────────────────────────────────────────

const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!+-=<>/?'

function ScrambleText({ text, delay = 0, className, style }) {
  const [display, setDisplay] = useState(text)

  useEffect(() => {
    let interval
    const timeout = setTimeout(() => {
      let iteration = 0
      const chars = text.split('')

      interval = setInterval(() => {
        setDisplay(
          chars
            .map((char, i) => {
              if (char === ' ' || char === '\n') return char
              if (i < Math.floor(iteration)) return char
              return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)]
            })
            .join(''),
        )

        iteration += 0.5

        if (Math.floor(iteration) >= chars.length) {
          clearInterval(interval)
          setDisplay(text)
        }
      }, 30)
    }, delay)

    return () => {
      clearTimeout(timeout)
      clearInterval(interval)
    }
  }, [text, delay])

  return (
    <span className={className} style={style}>
      {display}
    </span>
  )
}

// ── Preview snippets ──────────────────────────────────────────────────────────

const MiniBar = ({ pct, color }) => (
  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
  </div>
)

const SentimentSnippet = () => (
  <div className="space-y-2.5">
    {[
      { ticker: 'NVDA', pct: 78, label: '78%', color: '#22c55e' },
      { ticker: 'AAPL', pct: 61, label: '61%', color: '#22c55e' },
      { ticker: 'TSLA', pct: 32, label: '32%', color: '#ef4444' },
    ].map(({ ticker, pct, label, color }) => (
      <div key={ticker} className="flex items-center gap-2">
        <span className="text-[11px] font-mono w-9 shrink-0" style={{ color: 'var(--text-muted)' }}>
          {ticker}
        </span>
        <MiniBar pct={pct} color={color} />
        <span className="text-[11px] font-mono w-8 text-right shrink-0" style={{ color }}>
          {label}
        </span>
      </div>
    ))}
    <div className="flex gap-3 pt-1">
      {[['Bullish', '#22c55e'], ['Neutral', '#6b7280'], ['Bearish', '#ef4444']].map(([label, color]) => (
        <span key={label} className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  </div>
)

const SectorsSnippet = () => (
  <div className="space-y-2.5">
    {[
      { name: 'Technology', pct: 82, change: '+8.2%', color: '#22c55e' },
      { name: 'Healthcare', pct: 51, change: '+5.1%', color: '#22c55e' },
      { name: 'Energy',     pct: 28, change: '+2.8%', color: '#f59e0b' },
      { name: 'Financials', pct: 10, change: '−1.2%', color: '#ef4444' },
    ].map(({ name, pct, change, color }) => (
      <div key={name} className="flex items-center gap-2">
        <span className="text-[11px] w-16 truncate shrink-0" style={{ color: 'var(--text-muted)' }}>
          {name}
        </span>
        <MiniBar pct={pct} color={color} />
        <span className="text-[11px] font-mono w-9 text-right shrink-0" style={{ color }}>
          {change}
        </span>
      </div>
    ))}
  </div>
)

const WongSnippet = () => (
  <div className="flex flex-col gap-2">
    <div className="flex items-end gap-2">
      <div
        className="text-[11px] px-2.5 py-1.5 rounded-lg rounded-bl-none leading-snug"
        style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', maxWidth: '75%' }}
      >
        What's the outlook for NVDA?
      </div>
    </div>
    <div className="flex items-end gap-2 justify-end">
      <div
        className="text-[11px] px-2.5 py-1.5 rounded-lg rounded-br-none leading-snug"
        style={{ background: 'var(--accent)', color: 'var(--accent-text)', maxWidth: '85%' }}
      >
        Bullish — 72% confidence. Strong earnings beat with rising institutional volume and positive Reddit momentum.
      </div>
    </div>
  </div>
)

const ScreenerSnippet = () => (
  <div className="flex flex-col gap-2">
    {[
      { ticker: 'NVDA', score: 87, color: '#22c55e' },
      { ticker: 'AAPL', score: 62, color: '#f59e0b' },
      { ticker: 'TSLA', score: 31, color: '#ef4444' },
    ].map(({ ticker, score, color }) => (
      <div key={ticker} className="flex items-center gap-2">
        <span className="text-[11px] font-mono w-8 shrink-0" style={{ color: 'var(--text-muted)' }}>
          {ticker}
        </span>
        <MiniBar pct={score} color={color} />
        <span className="text-[11px] font-semibold w-6 text-right shrink-0" style={{ color }}>
          {score}
        </span>
      </div>
    ))}
  </div>
)

const WatchlistSnippet = () => (
  <div className="flex flex-wrap gap-1.5">
    {[
      { ticker: 'NVDA', dir: '↑', color: '#22c55e' },
      { ticker: 'AAPL', dir: '↑', color: '#22c55e' },
      { ticker: 'TSLA', dir: '↓', color: '#ef4444' },
      { ticker: 'META', dir: '↑', color: '#22c55e' },
      { ticker: 'MSFT', dir: '→', color: '#f59e0b' },
    ].map(({ ticker, dir, color }) => (
      <span
        key={ticker}
        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded font-mono"
        style={{ background: color + '18', color, border: `1px solid ${color}30` }}
      >
        {ticker} {dir}
      </span>
    ))}
  </div>
)

// ── Bento card ────────────────────────────────────────────────────────────────

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
}

const revealVariants = {
  rest: { clipPath: 'polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)' },
  hover: { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
}

const BentoCard = ({ className, icon: Icon, title, description, cta, snippet: Snippet, onCta }) => {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      variants={cardVariants}
      className={cn('relative rounded-lg border border-dashed overflow-hidden', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--border-hover)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <CornerPlusIcons />

      {/* Default state — icon + title */}
      <div className="relative z-10 p-6 h-full flex flex-col gap-3 justify-center">
        {Icon && (
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--surface-2)' }}
          >
            <Icon size={15} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
          {title}
        </h3>
      </div>

      {/* Hover reveal — snippet wipes up from bottom */}
      <motion.div
        className="absolute inset-0 z-20 flex flex-col justify-between p-6"
        style={{ background: 'var(--surface)' }}
        variants={revealVariants}
        initial="rest"
        animate={hovered ? 'hover' : 'rest'}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {description}
        </p>
        {Snippet && <Snippet />}
        <button
          onClick={(e) => { e.stopPropagation(); onCta?.() }}
          className="inline-flex items-center gap-1.5 text-xs font-medium bg-transparent border-none p-0 cursor-pointer"
          style={{ color: 'var(--accent)' }}
        >
          {cta}
          <ArrowRight size={10} />
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Card data ─────────────────────────────────────────────────────────────────

const cards = [
  {
    icon: Activity,
    title: 'Real-time Sentiment',
    description:
      'Aggregates StockTwits posts and Reddit discussions, classified by FinBERT into bullish, bearish, and neutral signals.',
    cta: 'Open Sentiment',
    snippet: SentimentSnippet,
    folderId: 'sentiment',
  },
  {
    icon: Layers,
    title: 'Sector Rotation',
    description:
      'Track YTD performance across 15 market sectors. Surface winners and laggards, drill into top holdings.',
    cta: 'Open Sectors',
    snippet: SectorsSnippet,
    folderId: 'sectors',
  },
  {
    icon: Brain,
    title: 'AI Analysis — Wong',
    description:
      'Groq-powered chat with RAG context. Ask anything about a ticker and get grounded, data-backed answers.',
    cta: 'Open Wong',
    snippet: WongSnippet,
    folderId: 'ai',
  },
  {
    icon: SlidersHorizontal,
    title: 'Stock Screener',
    description:
      'Run a 6-signal confidence scan across the top 40 trending tickers — momentum, volume, sentiment, and more.',
    cta: 'Open Screener',
    snippet: ScreenerSnippet,
    folderId: 'screener',
  },
  {
    icon: Bookmark,
    title: 'Watchlist',
    description:
      'Pin your favourite tickers and jump straight to their sentiment signal. Persisted locally.',
    cta: 'Open Watchlist',
    snippet: WatchlistSnippet,
    folderId: 'overview',
  },
]

const gridClasses = [
  'lg:col-span-3 lg:row-span-2 min-h-[300px]',
  'lg:col-span-3 lg:row-span-2 min-h-[300px]',
  'lg:col-span-4 min-h-[180px]',
  'lg:col-span-2 min-h-[180px]',
  'lg:col-span-2 min-h-[180px]',
]

// ── Overview layout ───────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const footerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: cards.length * 0.08 + 0.05 },
  },
}

export default function OverviewTab({ onOpenFeature }) {
  return (
    <div className="w-full border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-5xl px-6 py-12">

        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {cards.map((card, i) => (
            <BentoCard
              key={card.title}
              {...card}
              className={gridClasses[i]}
              onCta={() => onOpenFeature?.(card.folderId)}
            />
          ))}
        </motion.div>

        <motion.div
          className="max-w-2xl ml-auto text-right mt-6 lg:-mt-32"
          variants={footerVariants}
          initial="hidden"
          animate="visible"
        >
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
            <ScrambleText text="Built on signal." delay={900} />
            <br />
            <ScrambleText text="Tuned for retail." delay={1100} />
          </h2>
          <p className="text-base leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Rylo turns social noise into actionable sentiment — combining StockTwits,
            Reddit, FinBERT, and Groq AI into one dashboard built for retail traders
            who want an edge without the Bloomberg terminal price tag.
          </p>
        </motion.div>

      </div>
    </div>
  )
}
