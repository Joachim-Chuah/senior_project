"""
Groq AI Service - LLM-powered sentiment analysis chat with web search
"""

from groq import Groq
from tavily import TavilyClient
from typing import List, Dict, Optional
import logging
import re

from app.utils.config import get_settings
from app.models.sentiment import SentimentSignal

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a professional financial markets analyst embedded in Sentiviz, a real-time stock sentiment and confidence analysis platform. You have deep expertise across the following domains:

## Sentiment Analysis
- Interpreting retail social media sentiment (StockTwits, Reddit/WSB) — distinguishing noise from signal, identifying sentiment extremes that precede reversals
- Bull/bear ratio dynamics: when a lopsided ratio signals exhaustion vs. genuine momentum
- Sentiment momentum: a rising score on increasing volume is more meaningful than a static score
- Divergences: when price and sentiment move in opposite directions, that tension is often the most tradeable signal

## Technical Analysis
- Price momentum, moving averages (SMA/EMA 20/50/200), RSI, MACD, Bollinger Bands
- Volume analysis: relative volume spikes often confirm or refute breakout attempts
- Support/resistance levels, chart pattern recognition (flags, wedges, H&S)
- Mean reversion setups vs. trend continuation setups — context determines which framework applies

## Options & Derivatives
- Implied volatility (IV) vs. realized volatility (RV) — the spread (VRP) is a key regime indicator
- Greeks: delta (directional exposure), gamma (rate of delta change near expiry), theta (time decay), vega (vol sensitivity)
- IV percentile/rank: high IVR favors selling premium; low IVR favors buying
- Expected move from ATM straddle pricing — market-implied probability distributions
- Put/call ratio and open interest as a sentiment cross-check
- IV crush mechanics around earnings — selling premium before events is a distinct risk/reward profile

## Macro & Market Regime
- Fed policy and rate sensitivity: growth/tech stocks de-rate when yields rise; financials and energy often benefit
- VIX regime: <15 = complacent, 15–25 = normal, 25–35 = elevated fear, >35 = panic — each regime changes position sizing and strategy
- Sector rotation: risk-on (small cap, growth, crypto-adjacent) vs. risk-off (utilities, staples, gold, defensives)
- Earnings season dynamics: pre-earnings run-ups driven by IV expansion, post-earnings IV crush

## Risk Framing
- High confidence does not equal low risk — fat tail events, binary catalysts (earnings, FDA, macro prints) require separate treatment
- Always frame the bear case even when sentiment is bullish — the market rewards those who see what others miss
- Position sizing: never size as if a high-probability trade is a sure thing

## Response Guidelines
- Lead with the most actionable insight, then support with reasoning
- Be specific — cite numbers from the provided context (sentiment score, bull/bear counts, post excerpts, IV figures)
- When sentiment and price action conflict, flag the divergence explicitly — it's often the most interesting part
- Synthesize web search results WITH sentiment data rather than summarizing them in isolation
- Keep responses to 2–4 focused paragraphs unless the user asks for more depth
- Structure with clear logic: observation → interpretation → implication
- NEVER give explicit buy/sell recommendations or specific price targets
- If asked about something outside finance and markets, briefly note it and redirect

You have access to:
1. Real-time StockTwits sentiment data injected into every conversation (bull/bear counts, sample posts, sentiment score)
2. Web search results from financial news sources when triggered
3. Full conversation history for continuity"""

# Keywords that trigger web search
WEB_SEARCH_TRIGGERS = [
    'news', 'latest', 'recent', 'today', 'yesterday', 'this week', 'this month',
    'announced', 'announcement', 'earnings', 'report', 'quarter', 'guidance',
    'analyst', 'upgrade', 'downgrade', 'price target', 'rating',
    'sec', 'filing', '10-k', '10-q', 'lawsuit', 'settlement',
    'acquisition', 'merger', 'buyout', 'spinoff', 'ipo',
    'what happened', "what's happening", 'why is', 'why did', 'why has',
    'catalyst', 'moving', 'spike', 'drop', 'rally', 'sell-off',
    'inflation', 'fed', 'rate', 'macro', 'recession', 'gdp',
    'product', 'launch', 'release', 'partnership', 'deal',
]


class GroqService:
    """Service for AI-powered sentiment analysis chat"""

    def __init__(self):
        self.settings = get_settings()
        self.client = None
        self.tavily = None
        self._init_clients()

    def _init_clients(self):
        """Initialize Groq and Tavily clients"""
        # Initialize Groq
        if self.settings.GROQ_API_KEY:
            try:
                self.client = Groq(api_key=self.settings.GROQ_API_KEY)
                logger.info("Groq client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
                self.client = None
        else:
            logger.warning("GROQ_API_KEY not set")

        # Initialize Tavily
        if self.settings.TAVILY_API_KEY:
            try:
                self.tavily = TavilyClient(api_key=self.settings.TAVILY_API_KEY)
                logger.info("Tavily client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Tavily client: {e}")
                self.tavily = None
        else:
            logger.warning("TAVILY_API_KEY not set")

    def _should_search_web(self, message: str) -> bool:
        """Determine if message warrants a web search"""
        message_lower = message.lower()
        return any(trigger in message_lower for trigger in WEB_SEARCH_TRIGGERS)

    async def search_web(self, query: str, ticker: Optional[str] = None) -> str:
        """
        Search the web for relevant information

        Args:
            query: Search query
            ticker: Optional ticker to include in search

        Returns:
            Formatted search results string
        """
        if not self.tavily:
            return ""

        try:
            # Enhance query with ticker if provided
            search_query = f"{ticker} stock {query}" if ticker else query

            # Perform search
            response = self.tavily.search(
                query=search_query,
                search_depth="basic",
                max_results=5,
                include_domains=["reuters.com", "bloomberg.com", "cnbc.com",
                               "marketwatch.com", "wsj.com", "yahoo.com",
                               "seekingalpha.com", "fool.com", "investopedia.com"]
            )

            if not response.get('results'):
                return ""

            # Format results
            results_text = "\n\nWeb Search Results:\n"
            for i, result in enumerate(response['results'][:5], 1):
                title = result.get('title', 'No title')
                content = result.get('content', '')[:300]
                source = result.get('url', '').split('/')[2] if result.get('url') else 'Unknown'
                results_text += f"\n{i}. [{source}] {title}\n   {content}...\n"

            return results_text

        except Exception as e:
            logger.error(f"Error searching web: {e}")
            return ""

    def _build_context(self, signal: Optional[SentimentSignal], web_results: str = "") -> str:
        """Build context string from sentiment signal and web results"""
        context = ""

        if signal:
            context = f"""
Current Sentiment Data for {signal.ticker} ({signal.company_name}):
- Overall Signal: {signal.signal.upper()}
- Sentiment Score: {signal.score:.2f} (range: -1 bearish to +1 bullish)
- Posts Analyzed: {signal.total_posts}
- Bullish Posts: {signal.bullish_count}
- Bearish Posts: {signal.bearish_count}
- Neutral Posts: {signal.neutral_count}

Recent Bullish Posts:
"""
            for i, post in enumerate(signal.bullish_posts[:3], 1):
                context += f"{i}. @{post.username}: \"{post.body[:150]}...\"\n"

            context += "\nRecent Bearish Posts:\n"
            for i, post in enumerate(signal.bearish_posts[:3], 1):
                context += f"{i}. @{post.username}: \"{post.body[:150]}...\"\n"
        else:
            context = "No sentiment data currently loaded."

        if web_results:
            context += web_results

        return context

    async def chat(
        self,
        message: str,
        signal: Optional[SentimentSignal] = None,
        conversation_history: Optional[List[Dict]] = None,
        enable_web_search: bool = True
    ) -> str:
        """
        Send a chat message to Groq and get a response

        Args:
            message: User's question
            signal: Current sentiment signal for context
            conversation_history: Previous messages in the conversation
            enable_web_search: Whether to search web for relevant info

        Returns:
            AI response string
        """
        if not self.client:
            return "AI service is not configured. Please set GROQ_API_KEY in your environment."

        try:
            # Check if we should search the web
            web_results = ""
            if enable_web_search and self._should_search_web(message):
                ticker = signal.ticker if signal else None
                web_results = await self.search_web(message, ticker)

            # Build messages
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            # Add context about current sentiment and web results
            context = self._build_context(signal, web_results)
            messages.append({
                "role": "system",
                "content": f"Current context:\n{context}"
            })

            # Add conversation history
            if conversation_history:
                for msg in conversation_history[-6:]:  # Last 6 messages for context
                    messages.append({
                        "role": msg.get("role", "user"),
                        "content": msg.get("content", "")
                    })

            # Add current message
            messages.append({"role": "user", "content": message})

            # Call Groq
            response = self.client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )

            return response.choices[0].message.content

        except Exception as e:
            logger.error(f"Error calling Groq API: {e}")
            return f"Sorry, I encountered an error: {str(e)}"

    async def analyze_sentiment(self, signal: SentimentSignal) -> str:
        """
        Generate an automatic analysis of the current sentiment

        Args:
            signal: Sentiment signal to analyze

        Returns:
            AI-generated analysis
        """
        prompt = f"""Perform a full sentiment analysis for {signal.ticker} using the data provided.

Structure your response as follows:
1. **Signal read** — what the bull/bear ratio and sentiment score concretely imply right now
2. **Bull thesis** — key themes from bullish posts and what they suggest about trader expectations
3. **Bear thesis** — key concerns from bearish posts and the risks they highlight
4. **Divergence check** — does the sentiment align with or diverge from recent price action? Flag any tension.
5. **Key risk** — the single most important thing that could invalidate the prevailing sentiment

Be specific. Reference the actual numbers and post excerpts from context."""

        return await self.chat(prompt, signal, enable_web_search=True)

    async def search_news(self, ticker: str, query: Optional[str] = None) -> str:
        """
        Search for news about a specific ticker

        Args:
            ticker: Stock ticker
            query: Optional additional query terms

        Returns:
            AI-summarized news
        """
        search_query = query if query else f"latest news"
        web_results = await self.search_web(search_query, ticker)

        if not web_results:
            return f"No recent news found for {ticker}."

        # Have Groq summarize the news
        prompt = f"Summarize the key news and developments for {ticker} based on these search results. Be concise and highlight the most important points."

        messages = [
            {"role": "system", "content": "You are a financial news summarizer. Provide concise, factual summaries."},
            {"role": "system", "content": f"Search results:{web_results}"},
            {"role": "user", "content": prompt}
        ]

        try:
            response = self.client.chat.completions.create(
                model="meta-llama/llama-4-scout-17b-16e-instruct",
                messages=messages,
                temperature=0.5,
                max_tokens=512,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error summarizing news: {e}")
            return f"Error summarizing news: {str(e)}"
