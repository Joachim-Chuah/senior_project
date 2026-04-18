import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, AlertCircle, ArrowUp } from 'lucide-react';
import api from '../utils/api';
import { validateTicker } from '../utils/helpers';
import { getErrorMessage } from '../utils/errorHandler';

const ThinkingDots = () => (
    <div className="flex gap-1.5 items-center px-1 py-1">
        <div className="thinking-dot" />
        <div className="thinking-dot" />
        <div className="thinking-dot" />
    </div>
);

const MessageBubble = ({ message, isUser }) => (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`} style={{ animation: 'fadeSlideIn 0.25s ease both' }}>
        <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
                background: isUser ? 'var(--accent)' : 'var(--surface-2)',
                border: '1px solid var(--border)',
                boxShadow: isUser ? '0 0 12px rgba(99,70,229,0.3)' : 'none',
            }}
        >
            {isUser
                ? <User size={13} style={{ color: 'var(--accent-text)' }} />
                : <Bot size={13} style={{ color: 'var(--text-muted)' }} />
            }
        </div>
        <div
            className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed"
            style={isUser ? {
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                borderRadius: '18px 18px 4px 18px',
                boxShadow: '0 4px 20px rgba(99,70,229,0.2)',
            } : {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '18px 18px 18px 4px',
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
        className="text-left text-xs rounded-xl px-3.5 py-3 leading-snug transition-all duration-200 theme-transition"
        style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-muted)',
        }}
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.transform = 'translateY(0)';
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
    const inputRef = useRef(null);

    useEffect(() => {
        if (crossTabTicker) {
            setSearchInput(crossTabTicker);
            setTicker(crossTabTicker);
            setMessages([]);
            clearCrossTabTicker();
        }
    }, [crossTabTicker]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const generalQuestions = [
        'What macro factors are moving markets today?',
        'Explain implied volatility and why it matters.',
        'What is the difference between a call and a put option?',
        'How do I read an options chain?',
    ];

    const tickerQuestions = ticker ? [
        `Why is ${ticker} sentiment bullish or bearish right now?`,
        `What are traders saying about ${ticker}?`,
        `What are the key risks for ${ticker} over the next 30 days?`,
        `Summarize the bull and bear cases for ${ticker}`,
    ] : generalQuestions;

    const handleTickerChange = (e) => {
        e.preventDefault();
        setValidationError(null);
        const validation = validateTicker(searchInput);
        if (!validation.isValid) { setValidationError(validation.error); return; }
        setTicker(validation.ticker);
        setMessages([]);
        inputRef.current?.focus();
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim() || loading) return;
        setMessages(prev => [...prev, { role: 'user', content: messageText }]);
        setInputValue('');
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/ai/chat', {
                message: messageText,
                ticker,
                history: messages.slice(-6),
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const generateAnalysis = async () => {
        if (!ticker) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get(`/ai/analyze/${ticker}`);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Sentiment Analysis for ${ticker}\n\nSignal: ${res.data.signal.toUpperCase()} (${(res.data.score * 100).toFixed(0)}%)\n\n${res.data.analysis}`,
            }]);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto w-full px-6 py-8 min-h-0 anim-fade-in">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-3xl font-bold gradient-text flex items-center gap-2.5" style={{ letterSpacing: '-0.02em' }}>
                        <Sparkles size={24} style={{ color: 'var(--accent)' }} />
                        AI Analysis
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                        {ticker
                            ? <>Analyzing <span className="font-mono font-semibold" style={{ color: 'var(--text)' }}>{ticker}</span></>
                            : 'Ask me anything about markets'
                        }
                    </p>
                </div>

                <form onSubmit={handleTickerChange} className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={searchInput}
                                onChange={e => { setSearchInput(e.target.value.toUpperCase()); setValidationError(null); }}
                                placeholder="Ticker symbol"
                                className="px-3 py-2 w-36 rounded-xl font-mono text-sm focus:outline-none transition-all duration-200 theme-transition"
                                style={{
                                    background: 'var(--surface)',
                                    border: `1px solid ${validationError ? '#ef4444' : 'var(--border)'}`,
                                    color: 'var(--text)',
                                }}
                                onFocus={e => { if (!validationError) e.target.style.borderColor = 'var(--accent)'; }}
                                onBlur={e => { if (!validationError) e.target.style.borderColor = 'var(--border)'; }}
                            />
                            <button type="submit" className="btn-ghost px-3 py-2 text-sm rounded-xl">Set</button>
                            <button
                                type="button"
                                onClick={generateAnalysis}
                                disabled={loading || !ticker}
                                className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl disabled:opacity-40"
                            >
                                <Sparkles size={13} />
                                Analyze
                            </button>
                        </div>
                        {validationError && <p className="text-red-500 text-xs">{validationError}</p>}
                    </div>
                </form>
            </div>

            {error && (
                <div className="rounded-xl p-3 flex items-center gap-3 mb-4 flex-shrink-0" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                    <AlertCircle className="text-red-500 flex-shrink-0" size={15} />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            )}

            {/* Chat area */}
            <div
                className="flex-1 rounded-2xl flex flex-col overflow-hidden min-h-0 theme-transition"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}
            >
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin min-h-0">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            {/* Glowing bot icon */}
                            <div className="relative mb-6">
                                <div
                                    className="absolute inset-0 rounded-2xl"
                                    style={{ background: 'rgba(99,70,229,0.2)', filter: 'blur(16px)', transform: 'scale(1.4)' }}
                                />
                                <div
                                    className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                                >
                                    <Bot size={26} style={{ color: 'var(--accent)' }} />
                                </div>
                            </div>

                            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>
                                {ticker ? `Ask me about ${ticker}` : 'Ask me anything about markets'}
                            </h3>
                            <p className="text-sm mb-8 max-w-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {ticker
                                    ? 'I can analyze sentiment, summarize trader opinion, and break down the bull and bear cases.'
                                    : 'Set a ticker above for stock-specific analysis, or ask a general market question.'
                                }
                            </p>

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
                                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                                    >
                                        <Bot size={14} style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <div
                                        className="rounded-2xl px-4 py-3"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '18px 18px 18px 4px' }}
                                    >
                                        <ThinkingDots />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                    <div
                        className="flex items-end gap-3 rounded-2xl p-2 transition-all duration-200"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={inputValue}
                            onChange={e => {
                                setInputValue(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={ticker ? `Ask about ${ticker}...` : 'Ask anything about markets...'}
                            disabled={loading}
                            className="flex-1 bg-transparent text-sm focus:outline-none resize-none overflow-hidden px-2 py-1.5 leading-relaxed"
                            style={{ color: 'var(--text)', minHeight: '36px', maxHeight: '120px' }}
                        />
                        <button
                            onClick={() => sendMessage(inputValue)}
                            disabled={loading || !inputValue.trim()}
                            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
                            onMouseEnter={e => { if (!loading && inputValue.trim()) e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                        >
                            <ArrowUp size={16} />
                        </button>
                    </div>
                    <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }}>
                        Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AIAnalysis;
