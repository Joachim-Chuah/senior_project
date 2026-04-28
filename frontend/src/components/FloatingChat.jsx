import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Bot, User, Send } from 'lucide-react';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errorHandler';

const ThinkingDots = () => (
    <div className="flex gap-1.5 items-center px-1 py-1">
        <div className="thinking-dot" />
        <div className="thinking-dot" />
        <div className="thinking-dot" />
    </div>
);

const MessageBubble = ({ message, isUser }) => (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
        <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{
                background: isUser ? 'var(--accent)' : 'var(--surface-2)',
                border: '1px solid var(--border)',
            }}
        >
            {isUser
                ? <User size={12} style={{ color: 'var(--accent-text)' }} />
                : <Bot size={12} style={{ color: 'var(--text-muted)' }} />
            }
        </div>
        <div
            className="max-w-[80%] px-3 py-2 text-sm leading-relaxed"
            style={isUser ? {
                background: 'var(--accent)',
                color: 'var(--accent-text)',
                borderRadius: '14px 14px 3px 14px',
            } : {
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '14px 14px 14px 3px',
            }}
        >
            <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
    </div>
);

const SUGGESTED = {
    ticker: (t) => [
        `Why is ${t} moving today?`,
        `What are traders saying about ${t}?`,
        `Bull vs bear case for ${t}?`,
    ],
    general: [
        'What macro factors are moving markets today?',
        'Explain implied volatility and why it matters.',
        'How do I read an options chain?',
    ],
};

export default function FloatingChat({ activeTicker, activeTab }) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [open]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (text) => {
        if (!text.trim() || loading) return;
        setMessages(prev => [...prev, { role: 'user', content: text }]);
        setInput('');
        setLoading(true);
        setError(null);
        try {
            const res = await api.post('/ai/chat', {
                message: text,
                ticker: activeTicker || null,
                history: messages.slice(-6),
            });
            setMessages(prev => [...prev, { role: 'assistant', content: res.data.response }]);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(input);
        }
    };

    const suggestions = activeTicker ? SUGGESTED.ticker(activeTicker) : SUGGESTED.general;

    return (
        <>
            {/* Floating button */}
            <button
                onClick={() => setOpen(p => !p)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200"
                style={{
                    background: 'var(--accent)',
                    color: 'var(--accent-text)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                }}
            >
                {open ? <X size={15} /> : <MessageSquare size={15} />}
                {!open && 'Ask Wong'}
            </button>

            {/* Mobile backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 md:hidden"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Slide-in panel */}
            <div
                className="fixed bottom-0 right-0 z-40 flex flex-col"
                style={{
                    top: '4rem',
                    width: 'min(400px, 100vw)',
                    transform: open ? 'translateX(0)' : 'translateX(100%)',
                    transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    background: 'var(--bg)',
                    borderLeft: '1px solid var(--border)',
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-4 py-3 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--border)' }}
                >
                    <div className="flex items-center gap-2">
                        <Bot size={15} style={{ color: 'var(--accent)' }} />
                        <span className="text-sm font-semibold t-primary">Ask Wong</span>
                        {activeTicker && (
                            <span
                                className="text-xs px-2 py-0.5 rounded-lg font-mono font-bold"
                                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                            >
                                {activeTicker}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs t-muted hidden sm:block" style={{ opacity: 0.5 }}>Groq · Llama 4</span>
                        {messages.length > 0 && (
                            <button
                                onClick={() => { setMessages([]); setError(null); }}
                                className="text-xs t-muted transition-colors"
                                onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                                onMouseLeave={e => e.currentTarget.style.color = ''}
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={() => setOpen(false)}
                            className="p-1 rounded t-muted transition-colors"
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                            onMouseLeave={e => e.currentTarget.style.color = ''}
                        >
                            <X size={15} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin min-h-0">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-8">
                            <div
                                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                            >
                                <Bot size={22} style={{ color: 'var(--accent)' }} />
                            </div>
                            <p className="text-sm t-muted max-w-[220px] leading-relaxed">
                                {activeTicker
                                    ? `Ask me anything about ${activeTicker}`
                                    : 'Ask me anything about markets'
                                }
                            </p>
                            <div className="flex flex-col gap-2 w-full">
                                {suggestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(q)}
                                        className="text-left text-xs px-3 py-2.5 rounded-xl transition-colors"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {messages.map((msg, i) => (
                                <MessageBubble key={i} message={msg} isUser={msg.role === 'user'} />
                            ))}
                            {loading && (
                                <div className="flex gap-2">
                                    <div
                                        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                                    >
                                        <Bot size={13} style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <div
                                        className="px-3 py-2"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px 14px 14px 3px' }}
                                    >
                                        <ThinkingDots />
                                    </div>
                                </div>
                            )}
                            {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input */}
                <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
                    <div
                        className="flex items-end gap-2 rounded-xl p-2 transition-colors"
                        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}
                        onFocusCapture={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}
                    >
                        <textarea
                            ref={inputRef}
                            rows={1}
                            value={input}
                            onChange={e => {
                                setInput(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={activeTicker ? `Ask about ${activeTicker}...` : 'Ask anything...'}
                            disabled={loading}
                            className="flex-1 bg-transparent text-sm focus:outline-none resize-none overflow-hidden px-1 py-1 leading-relaxed"
                            style={{ color: 'var(--text)', minHeight: '24px' }}
                        />
                        <button
                            onClick={() => sendMessage(input)}
                            disabled={loading || !input.trim()}
                            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity disabled:opacity-30"
                            style={{ background: 'var(--accent)', color: 'var(--accent-text)' }}
                        >
                            <Send size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
