import React, { useState } from 'react';
import { LayoutDashboard, BrainCircuit, Sparkles, BarChart2, ArrowRight, Sun, Moon, LineChart, BookOpen, Lock, Eye, EyeOff } from 'lucide-react';

const DEMO_USER = 'demo';
const DEMO_PASS = 'sentiviz123';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const liveFeatures = [
    {
        icon: LayoutDashboard,
        title: 'Sentiment Dashboard',
        description: 'Real-time bull/bear sentiment from StockTwits. See what traders are saying — broken down by signal, volume, and post feed.',
    },
    {
        icon: BrainCircuit,
        title: 'Confidence Calculator',
        description: 'ML-powered directional signal with a calibrated probability score, expected move, and plain-English driver explanations.',
    },
    {
        icon: Sparkles,
        title: 'AI Analysis',
        description: 'Chat with a financial analyst LLM trained on market domain knowledge. Pulls live web search results to keep context current.',
    },
];

const demoFeatures = [
    {
        icon: LineChart,
        title: 'Options Chain',
        description: 'Live Black-Scholes pricing across all strikes and expirations for the Magnificent 7. Real Greeks, realistic IV assumptions.',
    },
    {
        icon: BookOpen,
        title: 'Black-Scholes Guide',
        description: 'Interactive walkthrough of the model that prices options. Adjust inputs, watch Greeks update live, compare against real market prices.',
    },
    {
        icon: Sparkles,
        title: 'AI Analysis',
        description: 'Chat with a financial analyst LLM trained on market domain knowledge. Pulls live web search results to keep context current.',
    },
];

const features = DEMO_MODE ? demoFeatures : liveFeatures;

const Landing = ({ onLaunch, darkMode, toggleDarkMode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    function handleLogin(e) {
        e.preventDefault();
        if (username === DEMO_USER && password === DEMO_PASS) {
            onLaunch();
        } else {
            setError('Invalid username or password.');
        }
    }

    return (
        <div
            className="min-h-screen flex flex-col theme-transition"
            style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
        >
            {/* Background effects */}
            <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
                {/* Dot grid */}
                <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle, var(--dot) 1px, transparent 1px)',
                    backgroundSize: '28px 28px',
                }} />
                {/* Ambient glow top */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(13,59,102,0.07) 0%, transparent 70%)',
                }} />
                {/* Blob — bottom right */}
                <div className="absolute" style={{
                    bottom: '-150px', right: '-150px',
                    width: '500px', height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, var(--blob-2) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }} />
            </div>

            {/* Navbar */}
            <div
                className="relative z-10 flex items-center justify-between px-8 py-5"
                style={{ borderBottom: '1px solid var(--border)' }}
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        <BarChart2 size={15} style={{ color: 'var(--accent-text)' }} />
                    </div>
                    <span className="text-base font-bold tracking-tight" style={{ color: 'var(--text)' }}>
                        Sentiviz
                    </span>
                </div>
                <button
                    onClick={toggleDarkMode}
                    className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                    {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                    <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
            </div>

            {/* Hero */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24">

                {/* Badge */}
                <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-10 theme-transition"
                    style={{
                        backgroundColor: 'var(--surface)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-muted)',
                        boxShadow: 'var(--shadow)',
                    }}
                >
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DEMO_MODE ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                    {DEMO_MODE ? 'Demo mode · Black-Scholes pricing' : 'Live market data'}
                </div>

                {/* Headline */}
                <h1
                    className="text-7xl md:text-8xl font-bold leading-none mb-6 gradient-text"
                    style={{
                        letterSpacing: '-0.04em',
                        lineHeight: '0.95',
                    }}
                >
                    Sentiviz
                </h1>

                {/* Sub-headline */}
                <p
                    className="text-2xl md:text-3xl font-semibold max-w-lg leading-snug mb-4"
                    style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}
                >
                    Trade with context.
                </p>
                <p
                    className="text-base md:text-lg max-w-md leading-relaxed mb-12"
                    style={{ color: 'var(--text)', opacity: 0.7 }}
                >
                    Real-time sentiment, AI-powered signals, and options analytics — in one unified dashboard.
                </p>

                {/* Login form */}
                <form
                    onSubmit={handleLogin}
                    className="w-full max-w-xs flex flex-col gap-3"
                >
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={e => { setUsername(e.target.value); setError(''); }}
                        className="w-full px-4 py-3 rounded-xl text-sm theme-transition"
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            outline: 'none',
                        }}
                        autoComplete="username"
                    />
                    <div className="relative w-full">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Password"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            className="w-full px-4 py-3 pr-11 rounded-xl text-sm theme-transition"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                color: 'var(--text)',
                                outline: 'none',
                            }}
                            autoComplete="current-password"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {error && (
                        <p className="text-xs text-center" style={{ color: '#dc2626' }}>{error}</p>
                    )}
                    <button
                        type="submit"
                        className="group btn-primary inline-flex items-center justify-center gap-3 px-8 py-3.5 text-sm rounded-xl"
                        style={{ boxShadow: '0 4px 20px rgba(13,59,102,0.25)' }}
                    >
                        <Lock size={14} />
                        Sign in
                        <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                    <p className="text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                        Use <span className="font-mono">demo</span> / <span className="font-mono">sentiviz123</span>
                    </p>
                </form>
            </div>

            {/* Feature cards */}
            <div className="relative z-10 px-6 pb-20 max-w-5xl mx-auto w-full">
                <p
                    className="text-center text-xs font-semibold uppercase tracking-widest mb-8"
                    style={{ color: 'var(--text-muted)', opacity: 0.6 }}
                >
                    What's inside
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {features.map(({ icon: Icon, title, description }, i) => (
                        <div
                            key={title}
                            className="card p-6 text-left cursor-default"
                            style={{
                                animationDelay: `${i * 80}ms`,
                                animation: 'fadeSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
                            }}
                        >
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5"
                                style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                            >
                                <Icon size={18} style={{ color: 'var(--accent)' }} />
                            </div>
                            <h3
                                className="text-sm font-semibold mb-2"
                                style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}
                            >
                                {title}
                            </h3>
                            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                                {description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Landing;
