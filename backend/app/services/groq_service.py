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

SYSTEM_PROMPT = """You are a financial sentiment analyst assistant for Sentiviz, a stock sentiment analysis platform.
Your role is to help users understand market sentiment based on social media data from StockTwits and web news.

When analyzing sentiment:
- Be objective and balanced
- Point out both bullish and bearish arguments
- Don't give financial advice or recommend trades
- Reference specific posts or news articles when relevant
- Keep responses concise but insightful

You have access to real-time web search results when users ask about news or current events.

If asked about something unrelated to stocks/sentiment, politely redirect to your area of expertise."""

# Keywords that trigger web search
WEB_SEARCH_TRIGGERS = [
    'news', 'latest', 'recent', 'today', 'yesterday', 'this week',
    'announced', 'earnings', 'report', 'analyst', 'upgrade', 'downgrade',
    'sec', 'filing', 'lawsuit', 'acquisition', 'merger', 'ipo',
    'what happened', "what's happening", 'why is', 'why did'
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
                model="llama-3.3-70b-versatile",
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
        prompt = f"""Analyze the current sentiment for {signal.ticker}.
Provide a brief summary (2-3 paragraphs) covering:
1. What the overall sentiment suggests
2. Key themes from bullish posts
3. Key concerns from bearish posts
4. Any notable patterns or insights"""

        return await self.chat(prompt, signal, enable_web_search=False)

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
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.5,
                max_tokens=512,
            )
            return response.choices[0].message.content
        except Exception as e:
            logger.error(f"Error summarizing news: {e}")
            return f"Error summarizing news: {str(e)}"
