import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, BrainCircuit, BarChart2, Sun, Moon, Home, LineChart, BookOpen, Menu, X } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const Navbar = ({ activeTab, setActiveTab, darkMode, toggleDarkMode, onLogoClick, navScrolled }) => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const isScrolled = navScrolled !== undefined ? navScrolled : scrolled;

    useEffect(() => {
        if (navScrolled !== undefined) return;
        const onScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [navScrolled]);

    useEffect(() => {
        if (!mobileMenuOpen) return;
        const handleOutside = (e) => {
            if (!e.target.closest('[data-mobile-menu]') && !e.target.closest('[data-hamburger]')) {
                setMobileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [mobileMenuOpen]);

    const navItems = DEMO_MODE ? [
        { id: 'home',       label: 'Home',          icon: Home },
        { id: 'sentiment',  label: 'Sentiment',     icon: LayoutDashboard },
        { id: 'dashboard',  label: 'Options Chain', icon: LineChart },
        { id: 'confidence', label: 'B-S Guide',     icon: BookOpen },
    ] : [
        { id: 'home',       label: 'Home',          icon: Home },
        { id: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
        { id: 'confidence', label: 'Confidence',    icon: BrainCircuit },
    ];

    // Animated pill
    const navContainerRef = useRef(null);
    const buttonRefs = useRef({});
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0, opacity: 0 });

    useEffect(() => {
        const el = buttonRefs.current[activeTab];
        const container = navContainerRef.current;
        if (!el || !container) return;
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        setPillStyle({
            left: elRect.left - containerRect.left,
            width: elRect.width,
            opacity: 1,
        });
    }, [activeTab]);

    return (
        <nav
            className="fixed top-0 left-0 right-0 z-50"
            style={{
                backgroundColor: (isScrolled || mobileMenuOpen) ? 'var(--bg)' : 'transparent',
                borderBottom: (isScrolled || mobileMenuOpen) ? '1px solid var(--border)' : '1px solid transparent',
                backdropFilter: (isScrolled || mobileMenuOpen) ? 'blur(12px)' : 'none',
                transition: 'background-color 0.3s ease, border-color 0.3s ease, backdrop-filter 0.3s ease',
            }}
        >
            <div className="h-16 flex items-center px-5 md:px-8 gap-6">
                {/* Logo — left */}
                <button
                    onClick={() => { onLogoClick(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-2.5 flex-shrink-0 hover:opacity-70 transition-opacity"
                >
                    <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: 'var(--accent)' }}
                    >
                        <BarChart2 size={13} style={{ color: 'var(--accent-text)' }} />
                    </div>
                    <span className="text-sm font-bold tracking-tight gradient-text">
                        Rylo
                    </span>
                </button>

                {/* Nav items — absolute center (desktop only) */}
                <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
                    <div ref={navContainerRef} className="relative flex items-center gap-0.5 p-1 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        {/* Sliding pill */}
                        <div
                            className="absolute top-1 bottom-1 rounded-lg pointer-events-none"
                            style={{
                                left: pillStyle.left,
                                width: pillStyle.width,
                                backgroundColor: 'var(--accent)',
                                transition: 'left 0.3s cubic-bezier(0.34,1.56,0.64,1), width 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                                opacity: pillStyle.opacity,
                            }}
                        />
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    ref={el => { buttonRefs.current[item.id] = el; }}
                                    onClick={() => setActiveTab(item.id)}
                                    className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150 z-10"
                                    style={{ color: isActive ? 'var(--accent-text)' : 'var(--text-muted)' }}
                                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text)'; }}
                                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)'; }}
                                >
                                    <Icon size={14} className="flex-shrink-0" />
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Dark mode toggle — right (desktop) */}
                <div className="hidden md:block ml-auto">
                    <button
                        onClick={toggleDarkMode}
                        className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-sm"
                    >
                        {darkMode ? <Sun size={14} /> : <Moon size={14} />}
                        <span>{darkMode ? 'Light' : 'Dark'}</span>
                    </button>
                </div>

                {/* Mobile: dark mode icon + hamburger */}
                <div className="md:hidden ml-auto flex items-center gap-1">
                    <button
                        onClick={toggleDarkMode}
                        className="btn-ghost p-2 rounded-lg"
                        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                    <button
                        data-hamburger
                        onClick={() => setMobileMenuOpen(p => !p)}
                        className="btn-ghost p-2 rounded-lg"
                        aria-label="Open menu"
                    >
                        {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileMenuOpen && (
                <div
                    data-mobile-menu
                    className="md:hidden py-2"
                    style={{ borderTop: '1px solid var(--border)' }}
                >
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-3 px-6 py-3.5 text-sm font-medium transition-colors"
                                style={{
                                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                                    background: isActive ? 'var(--surface)' : 'transparent',
                                }}
                            >
                                <Icon size={16} className="flex-shrink-0" />
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
