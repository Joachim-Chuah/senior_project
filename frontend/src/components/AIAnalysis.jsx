import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const MessageBubble = ({ message, isUser }) => (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isUser ? 'bg-gray-900 dark:bg-white' : 'bg-stone-200 dark:bg-gray-700'
        }`}>
            {isUser
                ? <User size={13} className="text-white dark:text-gray-900" />
                : <Bot size={13} className="text-gray-600 dark:text-gray-300" />
            }
        </div>
        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed border border-dashed ${
            isUser
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-gray-700 dark:border-gray-200 rounded-tr-md'
                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-tl-md'
        }`}>
            <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
    </div>
);

const SuggestedQuestion = ({ question, onClick }) => (
    <button
        onClick={() => onClick(question)}
        className="text-left text-xs bg-white dark:bg-gray-800 hover:bg-stone-50 dark:hover:bg-gray-700 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-gray-600 dark:text-gray-300 transition-colors leading-snug"
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

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
        setMessages([]);
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
                history: messages.slice(-6)
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err) {
            setError(getErrorMessage(err));
            console.error('Error in AI chat:', err);
        } finally {
            setLoading(false);
        }
    };

    const generateAnalysis = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/ai/analyze/${ticker}`);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sentiment Analysis for ${ticker}\n\nSignal: ${res.data.signal.toUpperCase()} (${(res.data.score * 100).toFixed(0)}%)\n\n${res.data.analysis}`
            }]);
        } catch (err) {
            setError(getErrorMessage(err));
            console.error('Error generating analysis:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 h-[calc(100vh-64px)] lg:h-screen flex flex-col min-h-0">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 border-b border-dashed border-gray-300 dark:border-gray-700 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
                        <Sparkles className="text-gray-500 dark:text-gray-400" size={22} />
                        AI Analysis
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Ask about sentiment for{' '}
                        <span className="font-mono font-semibold text-gray-800 dark:text-indigo-400">{ticker}</span>
                    </p>
                </div>

                <form onSubmit={handleTickerChange} className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value.toUpperCase());
                                setValidationError(null);
                            }}
                            placeholder="Ticker"
                            className={`bg-white dark:bg-gray-800 border border-dashed ${validationError ? 'border-red-400' : 'border-gray-300 dark:border-gray-600'} text-gray-900 dark:text-white rounded-lg px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-gray-400/20 uppercase font-mono text-sm theme-transition`}
                        />
                        <button
                            type="submit"
                            className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-medium text-sm transition-colors theme-transition"
                        >
                            Set
                        </button>
                        <button
                            type="button"
                            onClick={generateAnalysis}
                            disabled={loading}
                            className="bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Sparkles size={13} />
                            Auto Analyze
                        </button>
                    </div>
                    {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
                </form>
            </header>

            {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-dashed border-red-300 dark:border-red-500/30 rounded-lg p-3 flex items-center gap-3 mb-4 flex-shrink-0">
                    <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={15} />
                    <div>
                        <p className="text-red-700 dark:text-red-400 font-medium text-sm">Error</p>
                        <p className="text-red-500 dark:text-red-300 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Chat Container */}
            <div className="flex-1 bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl flex flex-col overflow-hidden min-h-0 theme-transition">
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin min-h-0">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-12 h-12 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center mb-4">
                                <Bot size={24} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                Ask me about {ticker}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-sm">
                                I can analyze StockTwits posts and help you understand what traders are saying about any stock.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                                {suggestedQuestions.map((q, i) => (
                                    <SuggestedQuestion key={i} question={q} onClick={sendMessage} />
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
                                    <div className="w-7 h-7 rounded-full bg-stone-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Bot size={13} className="text-gray-600 dark:text-gray-300" />
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl rounded-tl-md px-4 py-3">
                                        <Loader2 size={15} className="animate-spin text-gray-400" />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <form onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }} className="p-4 border-t border-dashed border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={`Ask about ${ticker} sentiment...`}
                            disabled={loading}
                            className="flex-1 bg-stone-50 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400/20 placeholder-gray-400 dark:placeholder-gray-500 theme-transition"
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={15} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AIAnalysis;
