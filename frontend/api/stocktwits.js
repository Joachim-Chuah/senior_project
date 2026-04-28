const STOCKTWITS_BASE = 'https://api.stocktwits.com/api/2';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://stocktwits.com/',
  'Origin': 'https://stocktwits.com',
};

export default async function handler(req, res) {
  const { ticker, endpoint } = req.query;

  let url;
  if (endpoint === 'trending') {
    url = `${STOCKTWITS_BASE}/trending/symbols.json`;
  } else if (ticker) {
    url = `${STOCKTWITS_BASE}/streams/symbol/${ticker.toUpperCase()}.json`;
  } else {
    return res.status(400).json({ error: 'Missing ticker or endpoint param' });
  }

  try {
    const response = await fetch(url, { headers: HEADERS });
    if (!response.ok) {
      return res.status(response.status).json({ error: `StockTwits returned ${response.status}` });
    }
    const data = await response.json();
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'Proxy request failed' });
  }
}
