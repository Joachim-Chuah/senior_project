import React from 'react';
import { LayoutDashboard, TrendingUp, Sparkles, X, Menu, BarChart2, Sun, Moon } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen, darkMode, toggleDarkMode }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'options', label: 'Options Chain', icon: TrendingUp },
        { id: 'ai', label: 'AI Analysis', icon: Sparkles },
    ];

    const handleNavClick = (tabId) => {
        setActiveTab(tabId);
        setIsMobileMenuOpen(false);
    };

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 shadow-card theme-transition"
            >
                {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay for mobile */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/30 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar */}
            <nav className={`fixed top-0 left-0 h-screen w-64 bg-white dark:bg-gray-900 border-r border-dashed border-gray-300 dark:border-gray-800 flex flex-col z-40 transition-transform duration-300 theme-transition ${
                isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}>
                {/* Logo Area */}
                <div className="flex items-center gap-3 px-5 py-5 border-b border-dashed border-gray-200 dark:border-gray-800">
                    <div className="w-8 h-8 bg-gray-900 dark:bg-white rounded-lg flex items-center justify-center flex-shrink-0">
                        <BarChart2 size={16} className="text-white dark:text-gray-900" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900 dark:text-white leading-none">Sentiviz</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-none">Sentiment Analytics</p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex-1 px-3 py-4">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-3 mb-3">
                        Navigation
                    </p>
                    <div className="space-y-0.5">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => handleNavClick(item.id)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-sm font-medium ${
                                        isActive
                                            ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                            : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                                >
                                    <Icon size={17} className="flex-shrink-0" />
                                    <span className="flex-1 text-left">{item.label}</span>
                                    {isActive && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-gray-900 flex-shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom Section */}
                <div className="px-3 py-4 border-t border-dashed border-gray-200 dark:border-gray-800">
                    <button
                        onClick={toggleDarkMode}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-150"
                    >
                        {darkMode ? (
                            <><Sun size={17} className="flex-shrink-0" /><span>Light Mode</span></>
                        ) : (
                            <><Moon size={17} className="flex-shrink-0" /><span>Dark Mode</span></>
                        )}
                    </button>
                    <p className="text-xs text-gray-300 dark:text-gray-600 px-3 mt-3">v1.0.0</p>
                </div>
            </nav>
        </>
    );
};

export default Navbar;
