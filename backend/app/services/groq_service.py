"""
Groq AI Service - LLM-powered sentiment analysis chat
"""

from groq import Groq
from typing import List, Dict, Optional
import logging

from app.utils.config import get_settings
from app.models.sentiment import SentimentSignal

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a financial sentiment analyst assistant for Sentiviz, a stock sentiment analysis platform.
Your role is to help users understand market sentiment based on social media data from StockTwits.

When analyzing sentiment:
- Be objective and balanced
- Point out both bullish and bearish arguments
- Don't give financial advice or recommend trades
- Reference specific posts when relevant
- Keep responses concise but insightful

If asked about something unrelated to stocks/sentiment, politely redirect to your area of expertise."""


class GroqService:
    """Service for AI-powered sentiment analysis chat"""

    def __init__(self):
        self.settings = get_settings()
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Groq client"""
        if self.settings.GROQ_API_KEY:
            try:
                self.client = Groq(api_key=self.settings.GROQ_API_KEY)
                logger.info("Groq client initialized")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {e}")
                self.client = None
        else:
            logger.warning("GROQ_API_KEY not set")

    def _build_context(self, signal: Optional[SentimentSignal]) -> str:
        """Build context string from sentiment signal"""
        if not signal:
            return "No sentiment data currently loaded."

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

        return context

    async def chat(
        self,
        message: str,
        signal: Optional[SentimentSignal] = None,
        conversation_history: Optional[List[Dict]] = None
    ) -> str:
        """
        Send a chat message to Groq and get a response

        Args:
            message: User's question
            signal: Current sentiment signal for context
            conversation_history: Previous messages in the conversation

        Returns:
            AI response string
        """
        if not self.client:
            return "AI service is not configured. Please set GROQ_API_KEY in your environment."

        try:
            # Build messages
            messages = [{"role": "system", "content": SYSTEM_PROMPT}]

            # Add context about current sentiment
            context = self._build_context(signal)
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

        return await self.chat(prompt, signal)
