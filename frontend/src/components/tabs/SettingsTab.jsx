import React from 'react'
import { Sun, Moon, BarChart2 } from 'lucide-react'

export default function SettingsTab({ darkMode, toggleDarkMode }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 max-w-2xl mx-auto w-full">

      {/* Appearance */}
      <div className="w-full mb-6">
        <p
          className="text-xs font-medium uppercase tracking-wider mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          Appearance
        </p>
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg border"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-2">
            {darkMode ? (
              <Moon size={14} style={{ color: 'var(--text-muted)' }} />
            ) : (
              <Sun size={14} style={{ color: 'var(--text-muted)' }} />
            )}
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {darkMode ? 'Dark mode' : 'Light mode'}
            </span>
          </div>
          <button
            onClick={toggleDarkMode}
            className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus-visible:outline-none"
            style={{
              background: darkMode ? 'var(--accent)' : 'var(--surface-2)',
            }}
            aria-label="Toggle dark mode"
          >
            <span
              className="inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200"
              style={{
                background: darkMode ? 'var(--accent-text)' : 'var(--text-muted)',
                transform: darkMode ? 'translateX(18px)' : 'translateX(3px)',
              }}
            />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full h-px mb-6" style={{ background: 'var(--border)' }} />

      {/* About */}
      <div className="w-full">
        <p
          className="text-xs font-medium uppercase tracking-wider mb-4"
          style={{ color: 'var(--text-muted)' }}
        >
          About
        </p>
        <div
          className="rounded-lg border divide-y"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', '--tw-divide-opacity': 1 }}
        >
          {[
            { label: 'Version', value: '0.1.0' },
            { label: 'Sentiment engine', value: 'FinBERT + StockTwits + Reddit' },
            { label: 'AI model', value: 'Groq LLaMA 3' },
            { label: 'RAG store', value: 'pgvector (all-MiniLM-L6-v2)' },
            { label: 'Market data', value: 'yfinance · FMP · Marketaux' },
            { label: 'Backend', value: 'FastAPI + PostgreSQL on Render' },
            { label: 'Frontend', value: 'React 19 + Vite + Tailwind CSS' },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex items-center justify-between px-4 py-2.5"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {label}
              </span>
              <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
