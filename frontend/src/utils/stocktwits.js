// Relative URL — handled by Vercel function in prod, Vite→backend proxy in dev
const PROXY_BASE = '/api/stocktwits';
const FALLBACK_TICKERS = ['TSLA', 'NVDA', 'AAPL', 'PLTR', 'AMD', 'AMZN', 'META', 'MSFT', 'SPY', 'GOOGL'];

function parseMessage(msg) {
  const sentiment = msg.entities?.sentiment?.basic ?? null;
  return {
    id: msg.id,
    body: msg.body || '',
    sentiment,
    created_at: msg.created_at,
    username: msg.user?.username || 'Anonymous',
    followers: msg.user?.followers || 0,
    avatar_url: msg.user?.avatar_url_ssl || null,
  };
}

function computeSignal(ticker, posts, symbolInfo) {
  const bullishPosts = posts.filter(p => p.sentiment === 'Bullish');
  const bearishPosts = posts.filter(p => p.sentiment === 'Bearish');
  const neutralPosts = posts.filter(p => p.sentiment !== 'Bullish' && p.sentiment !== 'Bearish');
  const totalScored = bullishPosts.length + bearishPosts.length;
  const score = totalScored > 0 ? (bullishPosts.length - bearishPosts.length) / totalScored : 0;
  const signal = score > 0.2 ? 'bullish' : score < -0.2 ? 'bearish' : 'neutral';

  return {
    ticker: ticker.toUpperCase(),
    signal,
    score: Math.round(score * 1000) / 1000,
    bullish_count: bullishPosts.length,
    bearish_count: bearishPosts.length,
    neutral_count: neutralPosts.length,
    total_posts: posts.length,
    bullish_posts: bullishPosts,
    bearish_posts: bearishPosts,
    company_name: symbolInfo?.title || ticker.toUpperCase(),
    logo_url: symbolInfo?.logo_url || null,
    fetched_at: new Date().toISOString(),
  };
}

function emptySignal(ticker) {
  return {
    ticker: ticker.toUpperCase(),
    signal: 'neutral',
    score: 0,
    bullish_count: 0,
    bearish_count: 0,
    neutral_count: 0,
    total_posts: 0,
    bullish_posts: [],
    bearish_posts: [],
    company_name: ticker.toUpperCase(),
    logo_url: null,
    fetched_at: new Date().toISOString(),
  };
}

async function classifyTexts(api, texts) {
  if (!texts.length) return [];
  const res = await api.post('/sentiment/classify', { texts });
  return res.data.labels;
}

export async function fetchSignal(api, ticker, limit = 30) {
  try {
    const res = await fetch(`${PROXY_BASE}?ticker=${encodeURIComponent(ticker.toUpperCase())}`);
    if (!res.ok) return emptySignal(ticker);
    const data = await res.json();
    if (!data.messages) return emptySignal(ticker);

    const posts = data.messages.slice(0, limit).map(parseMessage);

    const untaggedIdxs = posts.reduce((acc, p, i) => (p.sentiment === null ? [...acc, i] : acc), []);
    if (untaggedIdxs.length > 0) {
      try {
        const texts = untaggedIdxs.map(i => posts[i].body);
        const labels = await classifyTexts(api, texts);
        untaggedIdxs.forEach((idx, j) => { posts[idx].sentiment = labels[j]; });
      } catch {
        untaggedIdxs.forEach(idx => { posts[idx].sentiment = 'Neutral'; });
      }
    }

    return computeSignal(ticker, posts, data.symbol);
  } catch {
    return emptySignal(ticker);
  }
}

export async function fetchOverview(api, tickers) {
  const results = await Promise.all(tickers.map(t => fetchSignal(api, t)));
  return results.map(s => ({
    ticker: s.ticker,
    company_name: s.company_name,
    signal: s.signal,
    score: s.score,
    bullish_count: s.bullish_count,
    bearish_count: s.bearish_count,
    neutral_count: s.neutral_count,
    total_posts: s.total_posts,
  }));
}

export async function fetchTrendingTickers(limit = 10) {
  try {
    const res = await fetch(`${PROXY_BASE}?endpoint=trending`);
    if (!res.ok) return FALLBACK_TICKERS;
    const data = await res.json();
    const tickers = (data.symbols || []).slice(0, limit).map(s => s.symbol).filter(Boolean);
    return tickers.length > 0 ? tickers : FALLBACK_TICKERS;
  } catch {
    return FALLBACK_TICKERS;
  }
}
