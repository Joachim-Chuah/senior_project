import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BrainCircuit, Sparkles, BarChart2, ArrowRight, Sun, Moon, LineChart, BookOpen, Lock, Eye, EyeOff, Zap } from 'lucide-react';
import WaveBackground from './WaveBackground';
import DashboardMockup from './DashboardMockup';

const DEMO_USER = 'demo';
const DEMO_PASS = 'rylo123';
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const liveFeatures = [
    {
        icon: LayoutDashboard,
        title: 'Sentiment Dashboard',
        description: 'Real-time bull/bear sentiment from StockTwits. See what traders are saying — broken down by signal, volume, and post feed.',
        accent: 'rgba(99,70,229,0.15)',
        accentBorder: 'rgba(99,70,229,0.4)',
    },
    {
        icon: BrainCircuit,
        title: 'Confidence Calculator',
        description: 'ML-powered directional signal with a calibrated probability score, expected move, and plain-English driver explanations.',
        accent: 'rgba(6,182,212,0.12)',
        accentBorder: 'rgba(6,182,212,0.35)',
    },
    {
        icon: Sparkles,
        title: 'AI Analysis',
        description: 'Chat with a financial analyst LLM trained on market domain knowledge. Pulls live web search results to keep context current.',
        accent: 'rgba(245,158,11,0.12)',
        accentBorder: 'rgba(245,158,11,0.35)',
    },
];

const demoFeatures = [
    {
        icon: LineChart,
        title: 'Options Chain',
        description: 'Live Black-Scholes pricing across all strikes and expirations for the Magnificent 7. Real Greeks, realistic IV assumptions.',
        accent: 'rgba(99,70,229,0.15)',
        accentBorder: 'rgba(99,70,229,0.4)',
    },
    {
        icon: BookOpen,
        title: 'Black-Scholes Guide',
        description: 'Interactive walkthrough of the model that prices options. Adjust inputs, watch Greeks update live, compare against real market prices.',
        accent: 'rgba(6,182,212,0.12)',
        accentBorder: 'rgba(6,182,212,0.35)',
    },
    {
        icon: Sparkles,
        title: 'AI Analysis',
        description: 'Chat with a financial analyst LLM trained on market domain knowledge. Pulls live web search results to keep context current.',
        accent: 'rgba(245,158,11,0.12)',
        accentBorder: 'rgba(245,158,11,0.35)',
    },
];

const features = DEMO_MODE ? demoFeatures : liveFeatures;

const STATS = DEMO_MODE
    ? ['Black-Scholes pricing', 'Real-time Greeks', 'Interactive guide', 'AI-powered']
    : ['StockTwits sentiment', 'Live options data', 'ML confidence scores', 'AI-powered'];

function useTypingOnce(text, speed = 45, startDelay = 600) {
    const [displayed, setDisplayed] = useState('');
    const [done, setDone] = useState(false);
    useEffect(() => {
        let i = 0;
        const start = setTimeout(() => {
            const interval = setInterval(() => {
                if (i < text.length) {
                    setDisplayed(text.slice(0, i + 1));
                    i++;
                } else {
                    setDone(true);
                    clearInterval(interval);
                }
            }, speed);
            return () => clearInterval(interval);
        }, startDelay);
        return () => clearTimeout(start);
    }, [text, speed, startDelay]);
    return { displayed, done };
}

const Landing = ({ onLaunch, darkMode, toggleDarkMode }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const { displayed: typedTagline, done: typingDone } = useTypingOnce('Trade with context.');

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
                <WaveBackground darkMode={darkMode} />
                {/* Top glow */}
                <div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,70,229,0.12) 0%, transparent 70%)',
                }} />
                {/* Blob — bottom right */}
                <div className="absolute" style={{
                    bottom: '-150px', right: '-150px',
                    width: '600px', height: '600px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(6,182,212,0.18) 0%, transparent 70%)',
                    filter: 'blur(60px)',
                }} />
                {/* Blob — top left */}
                <div className="absolute" style={{
                    top: '-100px', left: '-100px',
                    width: '500px', height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,70,229,0.15) 0%, transparent 70%)',
                    filter: 'blur(80px)',
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
                    <span className="text-base font-bold tracking-tight gradient-text">Rylo</span>
                </div>
                <button onClick={toggleDarkMode} className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm">
                    {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                    <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
            </div>

            {/* Hero — full width mockup */}
            <div className="relative z-10 px-6 md:px-10 pt-6 pb-0" style={{ animation: 'fadeSlideIn 0.5s 0.1s both' }}>
                <DashboardMockup />
            </div>

            {/* Login section below */}
            <div className="relative z-10 flex flex-col items-center text-center px-6 py-12">

                {/* Headline */}
                <h1 className="text-5xl md:text-6xl font-bold leading-none mb-4 gradient-text" style={{ letterSpacing: '-0.04em' }}>
                    Rylo
                </h1>

                <p className={`text-xl md:text-2xl font-semibold mb-3 ${!typingDone ? 'typing-cursor' : ''}`}
                    style={{ color: 'var(--text)', letterSpacing: '-0.02em', minHeight: '2rem' }}>
                    {typedTagline}
                </p>

                <p className="text-sm mb-6 max-w-sm leading-relaxed" style={{ color: 'var(--text)', opacity: 0.55 }}>
                    Real-time sentiment, AI-powered signals, and options analytics — unified.
                </p>

                {/* Stats chips */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-8">
                    {STATS.map((stat, i) => (
                        <span key={stat} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', animation: `fadeSlideIn 0.4s ${i * 80}ms both` }}>
                            <Zap size={9} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                            {stat}
                        </span>
                    ))}
                </div>

                {/* Login form */}
                <form onSubmit={handleLogin} className="w-full max-w-xs flex flex-col gap-3">
                    <input type="text" placeholder="Username" value={username}
                        onChange={e => { setUsername(e.target.value); setError(''); }}
                        className="w-full px-4 py-3 rounded-xl text-sm theme-transition"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={e => e.target.style.borderColor = 'var(--border)'}
                        autoComplete="username"
                    />
                    <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            className="w-full px-4 py-3 pr-11 rounded-xl text-sm theme-transition"
                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', transition: 'border-color 0.2s' }}
                            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border)'}
                            autoComplete="current-password"
                        />
                        <button type="button" onClick={() => setShowPassword(p => !p)}
                            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', opacity: 0.6 }} tabIndex={-1}>
                            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                    </div>
                    {error && <p className="text-xs text-center" style={{ color: '#dc2626' }}>{error}</p>}
                    <button type="submit" className="group btn-primary inline-flex items-center justify-center gap-3 px-8 py-3.5 text-sm rounded-xl"
                        style={{ boxShadow: '0 4px 24px rgba(99,70,229,0.35)' }}>
                        <Lock size={14} />
                        Sign in
                        <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
                    </button>
                    <p className="text-xs text-center" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                        Use <span className="font-mono">demo</span> / <span className="font-mono">rylo123</span>
                    </p>
                </form>
            </div>

            {/* Feature cards */}
            <div className="relative z-10 px-6 pb-20 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-3 justify-center mb-8">
                    <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                    <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                        What's inside
                    </p>
                    <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {features.map(({ icon: Icon, title, description, accent, accentBorder }, i) => (
                        <div
                            key={title}
                            className="relative p-6 text-left rounded-2xl overflow-hidden cursor-default"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow)',
                                animation: `fadeSlideIn 0.4s ${i * 100}ms both`,
                                transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.2s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.borderColor = accentBorder;
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = `0 12px 40px ${accent}`;
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = 'var(--border)';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'var(--shadow)';
                            }}
                        >
                            {/* Accent glow in corner */}
                            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full pointer-events-none" style={{ background: accent, filter: 'blur(20px)' }} />
                            <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 relative"
                                style={{ background: accent, border: `1px solid ${accentBorder}` }}
                            >
                                <Icon size={18} style={{ color: 'var(--accent)' }} />
                            </div>
                            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text)', letterSpacing: '-0.01em' }}>
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
