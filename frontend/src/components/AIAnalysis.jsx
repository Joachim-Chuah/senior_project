import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const MessageBubble = ({ message, isUser }) => (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: isUser ? 'var(--accent)' : 'var(--surface-2)', border: '1px solid var(--border)' }}
        >
            {isUser
                ? <User size={13} style={{ color: 'var(--accent-text)' }} />
                : <Bot size={13} style={{ color: 'var(--text-muted)' }} />
            }
        </div>
        <div
            className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
            style={isUser ? {
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
                borderRadius: '16px 16px 4px 16px',
            } : {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '16px 16px 16px 4px',
                backdropFilter: 'blur(8px)',
            }}
        >
            <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
    </div>
);

const SuggestedQuestion = ({ question, onClick }) => (
    <button
        onClick={() => onClick(question)}
        className="text-left text-xs rounded-xl px-3 py-2.5 leading-snug transition-all duration-200 theme-transition"
        style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-hover)';
            e.currentTarget.style.color = 'var(--text)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
        }}
    >
        {question}
    </button>
);

const AIAnalysis = ({ navigateTo, crossTabTicker, clearCrossTabTicker }) => {
    const [ticker, setTicker] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [validationError, setValidationError] = useState(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (crossTabTicker) {
            setSearchInput(crossTabTicker);
            setTicker(crossTabTicker);
            setMessages([]);
            clearCrossTabTicker();
        }
    }, [crossTabTicker]);

    const generalQuestions = [
        'What macro factors are moving markets today?',
        'Explain implied volatility and why it matters for options pricing.',
        'What is the difference between a call and a put option?',
        'How do I read an options chain?',
    ];

    const tickerQuestions = ticker ? [
        `Why is ${ticker} sentiment bullish or bearish right now?`,
        `What are traders saying about ${ticker}?`,
        `What are the key risks for ${ticker} over the next 30 days?`,
        `Summarize the bull and bear cases for ${ticker}`,
    ] : generalQuestions;

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
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 lg:p-8 h-[calc(100vh-64px)] lg:h-screen flex flex-col min-h-0">
            {/* Header */}
            <header
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 pb-5 flex-shrink-0"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <div>
                    <h2
                        className="text-3xl font-bold flex items-center gap-2.5"
                        style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
                    >
                        <Sparkles size={22} style={{ color: 'var(--text-muted)' }} />
                        AI Analysis
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        Ask about sentiment for{' '}
                        <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>
                            {ticker || '—'}
                        </span>
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
                            placeholder="Search Stocks & ETFs"
                            className="px-3 py-2 w-52 rounded-xl font-mono text-sm focus:outline-none transition-all duration-200 theme-transition"
                            style={{
                                background: 'var(--surface)',
                                border: `1px solid ${validationError ? '#ef4444' : 'var(--border)'}`,
                                color: 'var(--text)',
                                backdropFilter: 'blur(8px)',
                            }}
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 theme-transition"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                            Set
                        </button>
                        <button
                            type="button"
                            onClick={generateAnalysis}
                            disabled={loading}
                            className="px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                            onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                            <Sparkles size={13} />
                            Auto Analyze
                        </button>
                    </div>
                    {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
                </form>
            </header>

            {error && (
                <div
                    className="rounded-xl p-3 flex items-center gap-3 mb-4 flex-shrink-0"
                    style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.25)',
                    }}
                >
                    <AlertCircle className="text-red-500 flex-shrink-0" size={15} />
                    <div>
                        <p className="text-red-500 font-medium text-sm">Error</p>
                        <p className="text-red-400 text-xs mt-0.5">{error}</p>
                    </div>
                </div>
            )}

            {/* Chat container */}
            <div
                className="flex-1 rounded-2xl flex flex-col overflow-hidden min-h-0 theme-transition"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
            >
                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-thin min-h-0">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div
                                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                            >
                                <Bot size={24} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            {ticker ? (
                                <>
                                    <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
                                        Ask me about <span className="font-mono">{ticker}</span>
                                    </h3>
                                    <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--text-muted)' }}>
                                        I can analyze StockTwits sentiment and help you understand what traders are saying.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--text)' }}>
                                        Ask me anything about markets
                                    </h3>
                                    <p className="text-sm mb-1 max-w-sm" style={{ color: 'var(--text-muted)' }}>
                                        Set a ticker above for stock-specific sentiment analysis, or ask a general question.
                                    </p>
                                    <p className="text-xs mb-6" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                                        Type a ticker symbol → hit <span className="font-semibold">Set</span> → then ask away
                                    </p>
                                </>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                                {tickerQuestions.map((q, i) => (
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
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                                    >
                                        <Bot size={13} style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                    <div
                                        className="rounded-2xl px-4 py-3"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                                    >
                                        <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
                    className="p-4 flex-shrink-0"
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder={ticker ? `Ask about ${ticker} sentiment...` : 'Ask anything about markets...'}
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all duration-200 theme-transition"
                            style={{
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={loading || !inputValue.trim()}
                            className="px-4 py-2.5 rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                            onMouseEnter={e => { if (!loading && inputValue.trim()) e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
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
