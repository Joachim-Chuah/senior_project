import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { getLogoUrl, tickerColor } from '../utils/marketHelpers';

function ResultLogo({ ticker }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tickerColor(ticker)}`}>
        <span className="text-white text-xs font-bold">{ticker.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <img
      src={getLogoUrl(ticker)}
      alt={ticker}
      onError={() => setFailed(true)}
      className="w-8 h-8 rounded-lg object-contain bg-white flex-shrink-0"
    />
  );
}

/**
 * TickerSearch — a reusable autocomplete search bar.
 *
 * Props:
 *   onSelect(ticker: string) — called when a result is clicked or Enter pressed
 *   placeholder — input placeholder text
 *   disabled — disables the input
 *   className — extra classes for the wrapper
 */
export default function TickerSearch({ onSelect, placeholder = 'Search Stocks & ETFs', disabled = false, className = '' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await api.get(`/sentiment/search?query=${encodeURIComponent(q)}`);
      setResults(res.data ?? []);
      setOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.length === 0) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 250);
    return () => clearTimeout(debounceRef.current);
  }, [query, fetchSuggestions]);

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectResult = (ticker) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setActiveIndex(-1);
    onSelect(ticker);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) {
      if (e.key === 'Enter' && query.trim()) {
        selectResult(query.trim().toUpperCase());
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
        selectResult(results[activeIndex].symbol);
      } else if (query.trim()) {
        selectResult(query.trim().toUpperCase());
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-muted)' }} />
        {searching && (
          <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-muted)' }} />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value.toUpperCase())}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className="input-base pl-8 pr-8 py-2 w-56 uppercase font-mono text-sm theme-transition disabled:opacity-50"
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 mt-1.5 w-80 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-hover)' }}
        >
          <ul>
            {results.map((r, i) => (
              <li key={r.symbol}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); selectResult(r.symbol); }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                  style={{
                    background: i === activeIndex ? 'var(--surface-2)' : '',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseLeave={e => { if (i !== activeIndex) e.currentTarget.style.background = ''; }}
                >
                  <ResultLogo ticker={r.symbol} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold t-primary font-mono">{r.symbol}</span>
                      <span className="text-xs t-muted">{r.exchange}</span>
                    </div>
                    <p className="text-xs t-muted truncate">{r.name}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
