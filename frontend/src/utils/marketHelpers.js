// ─── Logo ─────────────────────────────────────────────────────────────────────

const LOGO_TOKEN = import.meta.env?.VITE_LOGO_DEV_TOKEN ?? '';

export function getLogoUrl(ticker) {
  return `https://img.logo.dev/ticker/${ticker}?token=${LOGO_TOKEN}&format=png`;
}

// ─── Fallback avatar color ─────────────────────────────────────────────────────

const FALLBACK_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500',
  'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-rose-500',
];

export function tickerColor(ticker) {
  let n = 0;
  for (let i = 0; i < ticker.length; i++) n += ticker.charCodeAt(i);
  return FALLBACK_COLORS[n % FALLBACK_COLORS.length];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function formatPct(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export function formatPrice(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `$${n.toFixed(2)}`;
}

export function formatVolume(val) {
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
