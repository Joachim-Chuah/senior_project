# Sentiviz — Architecture

> Diagrams rendered with [Mermaid](https://mermaid.js.org/). Open in GitHub, VS Code (Mermaid Preview), or https://mermaid.live

---

## 1. Component Overview

```mermaid
graph TB
    FE["Browser / Vite\nlocalhost:5173"]

    subgraph FASTAPI["FastAPI (port 8000)"]
        subgraph ROUTES["API Routes /api/*"]
            R_SENT["sentiment.py\n/overview · /signal/:ticker\n/news · /search"]
            R_CONF["confidence.py\n/confidence/analyze"]
            R_MKT["market.py\n/market/overview\n/market/summary"]
        end

        subgraph SERVICES["Services"]
            S_ST["StockTwitsService"]
            S_FB["FinBERTService\n(text classification)"]
            S_FMP["FMPService"]
            S_GROQ["GroqService"]
            S_CONF["ConfidenceService\n(features + ML)"]
        end

        subgraph PERSISTENCE["Persistence"]
            C_MEM["_overview_cache\nin-memory · 15-min TTL"]
            C_DISK1["summary_cache.json\nEOD summary"]
            C_DISK2["confidence_state.json\nobservations + history"]
            C_MODELS["_models cache\nLogistic regression\nper ticker+horizon"]
            C_FB["~/.cache/huggingface\nFinBERT weights\n~500 MB · disk cache"]
        end
    end

    subgraph EXTERNAL["External APIs"]
        EXT_ST["StockTwits API\n(no key)"]
        EXT_FMP["Financial Modeling Prep\n(FMP_API_KEY)"]
        EXT_GROQ["Groq LLM\n(GROQ_API_KEY)"]
        EXT_TAV["Tavily Search\n(TAVILY_API_KEY)"]
        EXT_YF["yfinance\n(no key)"]
        EXT_HF["HuggingFace Hub\nProsusAI/finbert\n(download once)"]
    end

    FE -->|"HTTP /api/sentiment/*"| R_SENT
    FE -->|"HTTP /api/confidence/*"| R_CONF
    FE -->|"HTTP /api/market/*"| R_MKT

    R_SENT --> S_ST
    R_SENT --> S_FMP
    S_ST   --> S_FB
    S_FB   --> C_FB
    S_FB   -->|"first run only"| EXT_HF

    R_CONF --> S_CONF
    S_CONF --> S_ST
    S_CONF --> S_FMP
    S_CONF --> EXT_YF
    S_CONF --> C_DISK2
    S_CONF --> C_MODELS

    R_MKT --> S_FMP
    R_MKT --> S_GROQ
    R_MKT --> EXT_YF
    R_MKT --> C_MEM
    R_MKT --> C_DISK1

    S_ST   --> EXT_ST
    S_FMP  --> EXT_FMP
    S_GROQ --> EXT_GROQ
    S_GROQ --> EXT_TAV
```

---

## 2. Persistence Layer

```mermaid
graph LR
    subgraph IN_MEMORY["In-Memory (process lifetime)"]
        OC["_overview_cache\n15-min TTL\nmarket overview data"]
        MC["_models cache\nLogistic regression models\nper ticker+horizon"]
    end

    subgraph DISK["Disk (survives restarts)"]
        SC["summary_cache.json\nEOD AI summary\nkeeps last 2 trading days"]
        CS["data/confidence_state.json\nObservations + sentiment history\nper ticker+horizon pair"]
    end

    market_router -->|"write on miss"| OC
    market_router -->|"read/write"| SC
    confidence_service -->|"read/write"| CS
    confidence_service -->|"fit & cache"| MC
```

---

## 3. Data Model ERD

> These are Pydantic response models, not SQL tables. `PK` marks the natural identifier; `FK` marks a reference to another model.

### 3.1 Entity-Relationship Overview

1. **Sentiment**: `StockTwitsPost`, `SentimentSignal`, `SentimentSummary`
2. **Confidence**: `ConfidenceRequest`, `ConfidenceResult`, `FeatureSnapshot`, `TopDriver`
3. **Market**: `MarketQuote`, `MarketMover`, `NewsItem`, `MarketOverview`

### Sentiment

```mermaid
erDiagram
    StockTwitsPost {
        int      id PK
        string   body
        string   sentiment
        datetime created_at
        string   username
        int      followers
        string   avatar_url
    }
    SentimentSignal {
        string   ticker PK
        string   signal
        float    score
        int      bullish_count
        int      bearish_count
        int      neutral_count
        int      total_posts
        string   company_name
        string   logo_url
        datetime fetched_at
        string   error
    }
    SentimentSummary {
        string ticker PK
        string company_name
        string signal
        float  score
        int    bullish_count
        int    bearish_count
        int    total_posts
        string error
    }
    FinBERTClassification {
        string body FK
        string label
        float  score
    }

    SentimentSignal ||--o{ StockTwitsPost : "bullish_posts"
    SentimentSignal ||--o{ StockTwitsPost : "bearish_posts"
    StockTwitsPost ||--o| FinBERTClassification : "untagged → classified by"
```

### Confidence

```mermaid
erDiagram
    ConfidenceRequest {
        string ticker PK
        int    horizon PK
    }
    ConfidenceResult {
        string   ticker PK
        int      horizon PK
        string   direction
        float    confidence
        float    expected_move_pct
        string   model_mode
        float    brier_score
        string   company_name
        datetime fetched_at
    }
    FeatureSnapshot {
        float sent_score
        float sent_volume
        float sent_dispersion
        float sent_change
        float recent_return_5d
        float realized_vol_20d
        float market_regime
        float iv_atm
        float implied_move_pct
        float vrp_proxy
    }
    TopDriver {
        string label
        string direction
        float  weight
    }

    ConfidenceResult ||--|| FeatureSnapshot : "features"
    ConfidenceResult ||--o{ TopDriver : "top_drivers"
```

### Market

```mermaid
erDiagram
    MarketQuote {
        string symbol PK
        string name
        float  price
        float  change
        float  changesPercentage
    }
    MarketMover {
        string ticker PK
        string name
        float  price
        float  change
        float  changesPercentage
        float  volume
    }
    NewsItem {
        string url PK
        string title
        string publishedDate
        string site
        string text
        string symbol FK
    }
    MarketOverview {
        string fetched_at PK
        string warning
    }

    MarketOverview ||--o{ MarketQuote : "indices"
    MarketOverview ||--o{ MarketMover : "gainers"
    MarketOverview ||--o{ MarketMover : "losers"
    MarketOverview ||--o{ MarketMover : "actives"
    MarketOverview ||--o{ NewsItem : "news"
    NewsItem }o--|| MarketQuote : "symbol → symbol"
```

### Cross-Cluster Relationships

```mermaid
flowchart LR
    subgraph Sentiment
        SentimentSignal --> StockTwitsPost
        StockTwitsPost -.->|"untagged posts"| FinBERT["FinBERT\n(text classifier)"]
        SentimentSignal -.->|"summarised as"| SentimentSummary
    end
    subgraph Confidence
        ConfidenceRequest -->|"analyzed into"| ConfidenceResult
        ConfidenceResult --> FeatureSnapshot
        ConfidenceResult --> TopDriver
    end
    subgraph Market
        MarketOverview --> MarketQuote
        MarketOverview --> MarketMover
        MarketOverview --> NewsItem
        NewsItem -.->|"symbol"| MarketQuote
    end

    SentimentSignal -.->|"sent_score feeds"| ConfidenceResult
    MarketQuote -.->|"SPY/VIX feeds market_regime"| ConfidenceResult
```

---

## 4. Sentiment Overview Sequence

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant R as sentiment.py
    participant ST as StockTwitsService
    participant FB as FinBERTService
    participant EXT as StockTwits API

    FE->>R: GET /sentiment/overview?tickers=AAPL,TSLA,...
    R->>R: validate each ticker

    par asyncio.gather (concurrent per ticker)
        R->>ST: get_sentiment("AAPL")
        ST->>EXT: GET /streams/symbol/AAPL.json
        EXT-->>ST: 30 posts JSON
        ST->>ST: parse — split tagged vs. untagged
        opt untagged posts exist
            ST->>FB: classify_texts(untagged bodies)
            FB-->>ST: Bullish / Bearish / Neutral per post
        end
        ST-->>R: SentimentSignal (all 30 posts scored)
    and
        R->>ST: get_sentiment("TSLA")
        ST->>EXT: GET /streams/symbol/TSLA.json
        EXT-->>ST: 30 posts JSON
        ST->>ST: parse — split tagged vs. untagged
        opt untagged posts exist
            ST->>FB: classify_texts(untagged bodies)
            FB-->>ST: Bullish / Bearish / Neutral per post
        end
        ST-->>R: SentimentSignal (all 30 posts scored)
    end

    R-->>FE: List[SentimentSummary]
```

---

## 5. Confidence Analysis Sequence

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant R as confidence.py
    participant CS as ConfidenceService
    participant ST as StockTwitsService
    participant FMP as FMPService
    participant YF as yfinance
    participant DISK as confidence_state.json

    FE->>R: POST /confidence/analyze {ticker, horizon}
    R->>CS: analyze(ticker, horizon)

    par Parallel feature gathering
        CS->>ST: get_sentiment(ticker)
        ST-->>CS: sent_score, sent_volume, sent_dispersion
    and
        CS->>YF: download(ticker, SPY, VIX — 30 days)
        YF-->>CS: recent_return_5d, realized_vol_20d, market_regime
    and
        CS->>YF: Ticker(ticker).options
        YF-->>CS: iv_atm, implied_move_pct, vrp_proxy
    and
        CS->>FMP: get_company_name(ticker)
        FMP-->>CS: company name
    end

    alt >= 30 observations
        CS->>CS: LogisticRegression + isotonic calibration
    else warming-up
        CS->>CS: weighted rules → sigmoid
    end

    CS->>DISK: save observation
    CS-->>R: ConfidenceResult
    R-->>FE: direction, confidence, top_drivers, model_mode
```

---

## 6. Market Overview & EOD Summary Sequence

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant R as market.py
    participant CACHE as _overview_cache
    participant FMP as FMPService
    participant YF as yfinance
    participant GROQ as Groq LLM
    participant DISK as summary_cache.json

    Note over FE,CACHE: Market Overview
    FE->>R: GET /market/overview
    R->>CACHE: age < 900s?
    alt Cache HIT
        CACHE-->>R: MarketOverview
    else Cache MISS
        par Concurrent FMP calls
            R->>FMP: get_quotes (SPY, AAPL, MSFT, NVDA)
            R->>FMP: get_gainers / get_losers / get_actives
            R->>FMP: get_market_news
            FMP-->>R: data
        end
        R->>CACHE: store + timestamp
    end
    R-->>FE: MarketOverview

    Note over FE,DISK: EOD Market Summary
    FE->>R: GET /market/summary
    R->>R: check ET time → market_closed?
    R->>DISK: load summary_cache.json
    alt Market open (before 4 PM ET weekday)
        R-->>FE: previous day's summary
    else Cache HIT for today
        R-->>FE: cached summary
    else Market closed, no cache
        par Data gathering
            R->>FMP: get_quotes, gainers, losers
            R->>YF: download("^VIX")
        end
        R->>GROQ: generate 3-5 sentence EOD summary
        GROQ-->>R: summary text
        R->>DISK: save (keep last 2 trading days)
        R-->>FE: summary, generated_at, trade_date
    end
```
