# Sentiviz Backend

Real-Time Options & Sentiment Analysis Dashboard - Backend API

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI application entry point
│   ├── api/                    # API route handlers
│   │   ├── __init__.py
│   │   ├── options.py          # Options chain endpoints
│   │   ├── sentiment.py        # Sentiment data endpoints
│   │   └── fusion.py           # Fusion analysis endpoints
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   ├── options_service.py  # Options data fetching & processing
│   │   ├── black_scholes.py    # Black-Scholes pricing & Greeks
│   │   ├── sentiment_service.py # Reddit & GDELT sentiment
│   │   └── fusion_service.py   # Sentiment fusion & spike detection
│   ├── models/                 # Pydantic data models
│   │   ├── __init__.py
│   │   ├── options.py          # Option chain models
│   │   └── sentiment.py        # Sentiment data models
│   └── utils/                  # Utilities
│       ├── __init__.py
│       └── config.py           # Configuration management
├── tests/                      # Test suite
│   ├── __init__.py
│   ├── test_black_scholes.py
│   ├── test_fusion_service.py
│   └── test_api.py
├── requirements.txt            # Python dependencies
├── .env.example               # Environment variables template
├── pytest.ini                 # Pytest configuration
└── README.md                  # This file
```

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

You'll need to get Reddit API credentials from: https://www.reddit.com/prefs/apps

### 4. Run the Server

```bash
# From the backend directory
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: http://localhost:8000

API documentation: http://localhost:8000/docs

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_black_scholes.py

# Run with verbose output
pytest -v
```

## API Endpoints

### Options
- `GET /api/options/chain/{ticker}` - Get option chain
- `GET /api/options/volatility/{ticker}` - Get historical volatility
- `POST /api/options/scenario` - Run scenario analysis

### Sentiment
- `GET /api/sentiment/reddit/{ticker}` - Get Reddit sentiment
- `GET /api/sentiment/gdelt/{ticker}` - Get GDELT news sentiment
- `GET /api/sentiment/summary/{ticker}` - Get aggregated sentiment summary

### Fusion
- `GET /api/fusion/timeseries/{ticker}` - Get sentiment timeseries
- `GET /api/fusion/regime/{ticker}` - Get sentiment regime
- `GET /api/fusion/spikes/{ticker}` - Detect sentiment spikes
- `POST /api/fusion/update/{ticker}` - Update sentiment data

## Tech Stack

- **FastAPI** - Modern async web framework
- **Pydantic v2** - Data validation and settings
- **yfinance** - Options chain data
- **VADER** - Sentiment analysis
- **PRAW** - Reddit API
- **GDELT** - News sentiment data
- **NumPy/SciPy** - Black-Scholes calculations
- **Pandas** - Data processing

## Features

✅ Real-time options chain fetching
✅ Black-Scholes pricing and Greeks calculation
✅ Reddit sentiment analysis with VADER
✅ GDELT news sentiment filtering
✅ Fusion sentiment index with EMA
✅ Sentiment spike detection (Z-scores)
✅ Scenario analysis with sentiment adjustments
✅ Comprehensive test suite
