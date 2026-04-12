import React, { useState, useEffect } from 'react';
import { LayoutDashboard, BrainCircuit, Sparkles, BarChart2, Sun, Moon, Home, LineChart, BookOpen } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const Navbar = ({ activeTab, setActiveTab, darkMode, toggleDarkMode, onLogoClick }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);
    const navItems = DEMO_MODE ? [
        { id: 'home',       label: 'Home',          icon: Home },
        { id: 'sentiment',  label: 'Sentiment',     icon: LayoutDashboard },
        { id: 'dashboard',  label: 'Options Chain', icon: LineChart },
        { id: 'confidence', label: 'B-S Guide',     icon: BookOpen },
        { id: 'ai',         label: 'AI Analysis',   icon: Sparkles },
    ] : [
        { id: 'home',       label: 'Home',          icon: Home },
        { id: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
        { id: 'confidence', label: 'Confidence',    icon: BrainCircuit },
        { id: 'ai',         label: 'AI Analysis',   icon: Sparkles },
    ];

    return (
        <nav
            className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center px-6 gap-6"
            style={{
                backgroundColor: scrolled ? 'var(--bg)' : 'transparent',
                borderBottom: scrolled ? '1px solid var(--border)' : '1px solid transparent',
                backdropFilter: scrolled ? 'blur(12px)' : 'none',
                transition: 'background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
            }}
        >
            {/* Logo — left */}
            <button
                onClick={onLogoClick}
                className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-70 transition-opacity"
            >
                <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent)' }}
                >
                    <BarChart2 size={13} style={{ color: 'var(--accent-text)' }} />
                </div>
                <span className="text-sm font-bold tracking-tight gradient-text">
                    Sentiviz
                </span>
            </button>

            {/* Nav items — absolute center */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0.5">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                            style={isActive ? {
                                backgroundColor: 'var(--accent)',
                                color: 'var(--accent-text)',
                            } : {
                                color: 'var(--text-muted)',
                            }}
                            onMouseEnter={e => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                                    e.currentTarget.style.color = 'var(--text)';
                                }
                            }}
                            onMouseLeave={e => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = '';
                                    e.currentTarget.style.color = 'var(--text-muted)';
                                }
                            }}
                        >
                            <Icon size={14} className="flex-shrink-0" />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Dark mode toggle — right */}
            <div className="ml-auto">
                <button
                    onClick={toggleDarkMode}
                    className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm"
                >
                    {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                    <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
