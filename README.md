# Sentiviz

**Real-Time Options & Sentiment Analysis Dashboard**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

## Features

### Options Analysis
- **Options Chain Analysis** - Fetch options data with Greeks (Delta, Gamma, Theta, Vega)
- **Black-Scholes Pricing** - Accurate option pricing and implied volatility calculations
- **Scenario Analysis** - Model potential outcomes with sentiment-adjusted pricing
- **Historical Volatility** - Track volatility trends over time

### Sentiment Analysis
- **Reddit Sentiment** - Real-time analysis of r/wallstreetbets and other trading subreddits using VADER
- **GDELT News Sentiment** - Global news sentiment from the GDELT Project
- **Spike Detection** - Identify unusual sentiment surges using Z-score analysis

### Key Capabilities
- Multi-source sentiment fusion with configurable weights
- Sentiment regime detection (bullish/bearish/neutral)
- Real-time data updates via REST API
- Interactive dashboard with responsive design

## Architecture

```
sentiviz/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # REST endpoints
│   │   ├── services/ # Business logic
│   │   ├── models/   # Data models
│   │   └── utils/    # Configuration
│   └── tests/        # Backend tests
├── frontend/         # React + Vite frontend
│   └── src/
│       ├── components/  # React components
│       └── App.jsx      # Main application
└── docs/            # Documentation
```

## Quick Start

### Prerequisites
- **Python 3.8+** - Backend API
- **Node.js 18+** - Frontend application
- **Redis** (optional) - For caching
- **Reddit API credentials** - For sentiment analysis

### 1. Clone the Repository

```bash
git clone https://github.com/Joachim-Chuah/senior_project.git
cd senior_project/sentiviz
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Reddit API credentials

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`  
API documentation: `http://localhost:8000/docs`

### 3. Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The UI will be available at `http://localhost:5173`

## API Endpoints

### Options
- `GET /api/options/chain/{ticker}` - Fetch option chain with Greeks
- `GET /api/options/volatility/{ticker}` - Historical volatility data
- `POST /api/options/scenario` - Run scenario analysis

### Sentiment
- `GET /api/sentiment/reddit/{ticker}` - Reddit sentiment analysis
- `GET /api/sentiment/gdelt/{ticker}` - GDELT news sentiment
- `GET /api/sentiment/summary/{ticker}` - Aggregated sentiment summary

### Fusion
- `GET /api/fusion/timeseries/{ticker}` - Sentiment time series
- `GET /api/fusion/regime/{ticker}` - Current sentiment regime
- `GET /api/fusion/spikes/{ticker}` - Detect sentiment spikes
- `POST /api/fusion/update/{ticker}` - Update sentiment data

## Testing

### Backend Tests
```bash
cd backend
source venv/bin/activate
pytest                          # Run all tests
pytest --cov=app tests/        # With coverage
pytest -v                      # Verbose output
```

### Frontend Build
```bash
cd frontend
npm run build                  # Verify production build
```

## Tech Stack

### Backend
- **FastAPI** - Modern async web framework
- **Pydantic v2** - Data validation and settings management
- **yfinance** - Real-time options chain data
- **PRAW** - Reddit API wrapper
- **VADER** - Sentiment analysis
- **GDELT** - Global news database
- **NumPy/SciPy** - Black-Scholes calculations
- **Pandas** - Data processing

### Frontend
- **React** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Axios** - HTTP client

## How It Works

1. **Data Collection**: Sentiviz fetches real-time options data from Yahoo Finance and sentiment data from Reddit and GDELT
2. **Sentiment Analysis**: VADER analyzes text sentiment, producing scores from -1 (bearish) to +1 (bullish)
3. **Fusion Algorithm**: Multiple sentiment sources are combined using weighted exponential moving averages
4. **Spike Detection**: Z-score analysis identifies unusual sentiment surges
5. **Scenario Modeling**: Black-Scholes pricing is adjusted based on sentiment to model potential outcomes

## Getting Reddit API Credentials

1. Go to https://www.reddit.com/prefs/apps
2. Click "Create App" or "Create Another App"
3. Select "script" as the app type
4. Fill in the required fields
5. Copy your `client_id` and `client_secret` to `.env`

## Configuration

Edit `backend/.env` to configure:
- Reddit API credentials
- GDELT API settings
- Sentiment fusion weights
- Cache settings
- API rate limits

See `backend/.env.example` for all available options.

## License

This project is licensed under the MIT License.

## Acknowledgments

- **GDELT Project** - Global news sentiment data
- **Reddit API** - Social media sentiment
- **Yahoo Finance** - Options chain data
- **VADER** - Sentiment analysis algorithm

---

**Built for traders and investors**
