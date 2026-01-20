import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const MessageBubble = ({ message, isUser }) => (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser ? 'bg-indigo-600' : 'bg-gray-700'
        }`}>
            {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
            isUser
                ? 'bg-indigo-600 text-white rounded-br-md'
                : 'bg-gray-800 text-gray-200 rounded-bl-md'
        }`}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </div>
    </div>
);

const SuggestedQuestion = ({ question, onClick }) => (
    <button
        onClick={() => onClick(question)}
        className="text-left text-sm bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 transition-colors"
    >
        {question}
    </button>
);

const AIAnalysis = () => {
    const [ticker, setTicker] = useState('AAPL');
    const [searchInput, setSearchInput] = useState('AAPL');
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const messagesEndRef = useRef(null);

    const suggestedQuestions = [
        `Why is ${ticker} sentiment bullish or bearish?`,
        `What are traders saying about ${ticker}?`,
        `What are the main concerns about ${ticker}?`,
        `Summarize the bull and bear cases for ${ticker}`,
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleTickerChange = (e) => {
        e.preventDefault();
        setValidationError(null);

        const validation = validateTicker(searchInput);
        if (!validation.isValid) {
            setValidationError(validation.error);
            return;
        }

        setTicker(validation.ticker);
        setMessages([]); // Clear chat on ticker change
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || loading) return;

        const userMessage = { role: 'user', content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setLoading(true);
        setError(null);

        try {
            const res = await api.post('/ai/chat', {
                message: messageText,
                ticker: ticker,
                history: messages.slice(-6) // Send last 6 messages for context
            });

            const assistantMessage = { role: 'assistant', content: res.data.response };
            setMessages(prev => [...prev, assistantMessage]);

        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error('Error in AI chat:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleSuggestedClick = (question) => {
        sendMessage(question);
    };

    const generateAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            const res = await api.get(`/ai/analyze/${ticker}`);
            const analysisMessage = {
                role: 'assistant',
                content: `**Sentiment Analysis for ${ticker}**\n\nSignal: ${res.data.signal.toUpperCase()} (${(res.data.score * 100).toFixed(0)}%)\n\n${res.data.analysis}`
            };
            setMessages(prev => [...prev, analysisMessage]);

        } catch (err) {
            const errorMsg = getErrorMessage(err);
            setError(errorMsg);
            console.error('Error generating analysis:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 h-[calc(100vh-64px)] lg:h-screen flex flex-col">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Sparkles className="text-indigo-400" size={28} />
                        AI Analysis
                    </h2>
                    <p className="text-gray-400 mt-2">
                        Ask questions about sentiment for{' '}
                        <span className="text-indigo-400 font-mono font-bold">{ticker}</span>
                    </p>
                </div>

                <form onSubmit={handleTickerChange} className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value.toUpperCase());
                                setValidationError(null);
                            }}
                            placeholder="Ticker"
                            className={`bg-gray-800 border ${validationError ? 'border-red-500' : 'border-gray-700'} text-white rounded-lg px-4 py-2 w-24 focus:outline-none focus:border-indigo-500 uppercase font-mono`}
                        />
                        <button
                            type="submit"
                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Set
                        </button>
                        <button
                            type="button"
                            onClick={generateAnalysis}
                            disabled={loading}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Sparkles size={16} />
                            Auto Analyze
                        </button>
                    </div>
                    {validationError && (
                        <p className="text-red-400 text-sm">{validationError}</p>
                    )}
                </form>
            </header>

            {/* Error Display */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3 mb-4">
                    <AlertCircle className="text-red-400" size={20} />
                    <div>
                        <p className="text-red-400 font-medium">Error</p>
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Chat Container */}
            <div className="flex-1 bg-gray-800/30 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <Bot size={48} className="text-gray-600 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-400 mb-2">
                                Ask me about {ticker} sentiment
                            </h3>
                            <p className="text-gray-500 mb-6 max-w-md">
                                I can analyze StockTwits posts and help you understand what traders are saying about any stock.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                                {suggestedQuestions.map((q, i) => (
                                    <SuggestedQuestion
                                        key={i}
                                        question={q}
                                        onClick={handleSuggestedClick}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => (
                                <MessageBubble key={i} message={msg} isUser={msg.role === 'user'} />
                            ))}
                            {loading && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                        <Bot size={16} />
                                    </div>
                                    <div className="bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                                        <Loader2 size={20} className="animate-spin text-gray-400" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={`Ask about ${ticker} sentiment...`}
                            disabled={loading}
                            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className={`bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg transition-colors ${
                                loading || !inputValue.trim() ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AIAnalysis;
