# Sentiviz

**Sentiviz** is a trading dashboard that helps you gauge market sentiment so you can make more informed decisions while trading. It combines social sentiment, live market data, options analysis, and AI-powered insights into a single unified view.

The app ships with a **Demo Mode** that runs fully offline — no paid API keys needed. In demo mode, options data is generated using real Black-Scholes math with realistic mock prices, and an interactive Black-Scholes guide walks through the model step by step.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

---

## Features

### Market Overview
- Live indices (SPY, QQQ, DIA, VIX) with daily price and change
- Top gainers and losers with clickable links to StockAnalysis
- End-of-day AI summary generated once after market close and cached daily

### Sentiment Dashboard
- Real-time social sentiment from StockTwits for any ticker
- Bullish / bearish / neutral signal with score and post breakdown
- Confidence scoring that weighs sentiment, price momentum, and volatility

### Options Analysis *(live mode)*
- Full options chain via Yahoo Finance with live Greeks (Delta, Gamma, Theta, Vega)
- Black-Scholes implied volatility back-solving
- Historical volatility tracking

### Black-Scholes Guide *(demo mode)*
- Interactive sliders for spot price, strike, time to expiry, and implied volatility
- Live call/put pricing and Greeks (Delta, Gamma, Theta, Vega) with plain-English explanations
- P&L payoff diagram at expiry
- IV Calculator: input a market price, back-solve for implied volatility using Newton-Raphson iteration
- Market Comparison: fetch real Yahoo Finance mid-prices to see how model prices compare

### AI Analyst
- Chat with an AI analyst powered by Groq LLM
- Ask about any ticker, market conditions, or strategy
- Tavily-powered web search for up-to-date context

---

## Demo Mode

Demo mode lets the app run without a Financial Modeling Prep API key. Options data uses real Black-Scholes pricing math on mock Mag-7 spot prices with small random drift per refresh, so the numbers behave like live data without requiring a paid subscription.

To enable:

```bash
# backend/.env
DEMO_MODE=true

# frontend/.env
VITE_DEMO_MODE=true
```

In demo mode the tab layout changes:

| Tab | Live mode | Demo mode |
|-----|-----------|-----------|
| Dashboard | Sentiment + Options | Sentiment (unchanged) |
| Options Chain | — | Mock options chain (B-S priced) |
| B-S Guide | Confidence Calculator | Black-Scholes interactive guide |
| AI Analysis | AI Analysis (unchanged) | AI Analysis (unchanged) |

---

## Architecture

```
sentiviz/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # REST endpoints
│   │   ├── services/ # Business logic
│   │   ├── models/   # Data models
│   │   └── utils/    # Configuration
│   └── tests/        # Unit tests
├── frontend/         # React + Vite frontend
│   └── src/
│       ├── components/  # React components
│       └── App.jsx      # Main application
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys: Groq, Tavily (optional) — Financial Modeling Prep (FMP) required only for live mode

### 1. Clone the Repository

```bash
git clone https://github.com/Joachim-Chuah/senior_project.git
cd senior_project/sentiviz
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Add your API keys to .env
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API available at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

UI available at `http://localhost:5173`

---

## API Endpoints

### Market
- `GET /api/market/overview` — Indices, gainers, losers
- `GET /api/market/summary` — AI end-of-day market summary

### Sentiment
- `GET /api/sentiment/{ticker}` — StockTwits sentiment signal

### Options
- `GET /api/options/chain/{ticker}` — Options chain with Greeks
- `GET /api/options/volatility/{ticker}` — Historical volatility

### AI
- `POST /api/ai/chat` — Chat with AI analyst
- `POST /api/ai/analyze` — AI analysis for a ticker

### Demo
- `GET /api/demo/options/{ticker}` — B-S priced mock options chain (with Greeks)
- `GET /api/demo/live-price/{ticker}` — Real Yahoo Finance mid-price for IV comparison

---

## Tech Stack

**Backend:** FastAPI · Pydantic v2 · yfinance · Groq LLM · Tavily · Financial Modeling Prep · feedparser · NumPy

**Frontend:** React 19 · Vite · Tailwind CSS · Axios · Lucide React

---

## Testing

```bash
cd backend
source venv/bin/activate
pytest -v
```

Tests covering sentiment scoring, Black-Scholes pricing, options calculations, market helpers, and the confidence engine.

---

## License

MIT

---

*Built as a senior project.*
