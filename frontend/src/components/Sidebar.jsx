import React from 'react';
import { Home, LayoutDashboard, Layers, SlidersHorizontal, Sun, Moon, BarChart2, LineChart, BookOpen, PanelLeftClose } from 'lucide-react';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const navItems = DEMO_MODE ? [
    { id: 'home',       label: 'Home',          Icon: Home },
    { id: 'sentiment',  label: 'Sentiment',     Icon: LayoutDashboard },
    { id: 'dashboard',  label: 'Options Chain', Icon: LineChart },
    { id: 'confidence', label: 'B-S Guide',     Icon: BookOpen },
] : [
    { id: 'home',      label: 'Home',      Icon: Home },
    { id: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { id: 'sectors',   label: 'Sectors',   Icon: Layers },
    { id: 'screener',  label: 'Screener',  Icon: SlidersHorizontal },
];

export default function Sidebar({ activeTab, onNavigate, darkMode, toggleDarkMode, onCollapse }) {
    return (
        <aside
            className="flex flex-col w-56 h-screen flex-shrink-0 overflow-hidden"
            style={{ background: 'var(--bg)', borderRight: '1px solid var(--border)' }}
        >
            {/* Logo */}
            <div className="flex items-center justify-between px-3 py-4">
                <div
                    className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--accent)' }}
                >
                    <BarChart2 size={11} style={{ color: 'var(--accent-text)' }} />
                </div>
                <span className="text-sm font-semibold whitespace-nowrap" style={{ color: 'var(--text)' }}>Rylo</span>
                <button
                    onClick={onCollapse}
                    className="p-1 rounded-sm transition-colors duration-100 flex-shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    title="Collapse sidebar"
                >
                    <PanelLeftClose size={14} />
                </button>
            </div>

            {/* Section label */}
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider select-none" style={{ color: 'var(--text-muted)' }}>
                Pages
            </p>

            {/* Nav */}
            <nav className="flex-1 px-1 space-y-px">
                {navItems.map(({ id, label, Icon }) => {
                    const isActive = activeTab === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onNavigate(id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors duration-100"
                            style={{
                                background: isActive ? 'var(--surface-2)' : 'transparent',
                                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                                fontWeight: isActive ? 500 : 400,
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface)'; }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                        >
                            <Icon
                                size={14}
                                className="flex-shrink-0"
                                style={{ color: isActive ? 'var(--text)' : 'var(--text-muted)', opacity: isActive ? 0.75 : 0.5 }}
                            />
                            {label}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div className="px-1 py-2" style={{ borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={toggleDarkMode}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm transition-colors duration-100"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    {darkMode ? <Sun size={14} className="flex-shrink-0" /> : <Moon size={14} className="flex-shrink-0" />}
                    {darkMode ? 'Light mode' : 'Dark mode'}
                </button>
            </div>
        </aside>
    );
}
