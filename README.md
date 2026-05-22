# Rylo

Rylo is a stock sentiment platform built for retail traders who want an edge without the Bloomberg terminal price tag. It aggregates social signals from StockTwits and Reddit, runs them through FinBERT sentiment classification, and surfaces the results alongside a confidence-scored screener, sector rotation tracking, and an AI analyst — all in one dashboard.

**Live demo:** https://ryloweb.vercel.app · login: `demo` / `rylo123`

---

## Features

- **Sentiment Dashboard** — Real-time bullish/bearish/neutral signals from StockTwits and Reddit, classified by FinBERT
- **Stock Screener** — 6-signal confidence scan across trending tickers (momentum, volume, sentiment, and more)
- **Sector Rotation** — YTD performance across 15 market sectors with top holdings
- **AI Analysis (Wong)** — Groq-powered chat with RAG context for ticker-specific questions
- **Watchlist** — Pin tickers and jump straight to their sentiment signal, persisted locally

---

## Stack

**Frontend:** React 19 · Vite · Tailwind CSS · Framer Motion

**Backend:** FastAPI · FinBERT · Groq · Tavily · StockTwits API

---

## Quick Start

**Prerequisites:** Python 3.11+ · Node.js 18+

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # add GROQ_API_KEY, TAVILY_API_KEY
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

Frontend at `http://localhost:5173` · API at `http://localhost:8000`

---

## Deployment

| Layer | Platform |
|-------|----------|
| Frontend | Vercel |
| Backend | Render |

> Render's free tier spins down after 15 min of inactivity — first request after idle takes ~30s.

---

## License

MIT
