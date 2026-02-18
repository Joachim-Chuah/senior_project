import React from 'react';
import { LayoutDashboard, BrainCircuit, Sparkles, BarChart2, Sun, Moon } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab, darkMode, toggleDarkMode }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'confidence', label: 'Confidence', icon: BrainCircuit },
        { id: 'ai', label: 'AI Analysis', icon: Sparkles },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 h-14 z-40 bg-white dark:bg-gray-900 border-b border-dashed border-gray-200 dark:border-gray-800 flex items-center px-5 gap-6 theme-transition">
            {/* Logo */}
            <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-7 h-7 bg-gray-900 dark:bg-white rounded-md flex items-center justify-center">
                    <BarChart2 size={14} className="text-white dark:text-gray-900" />
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Sentiviz</span>
            </div>

            {/* Divider */}
            <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 flex-shrink-0" />

            {/* Nav items */}
            <div className="flex items-center gap-1">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                                isActive
                                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                            }`}
                        >
                            <Icon size={15} className="flex-shrink-0" />
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Dark mode toggle — pushed to the right */}
            <div className="ml-auto">
                <button
                    onClick={toggleDarkMode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-150"
                >
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
