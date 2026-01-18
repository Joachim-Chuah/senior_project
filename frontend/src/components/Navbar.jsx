import React from 'react';
import { LayoutDashboard, TrendingUp, MessageSquare } from 'lucide-react';

const Navbar = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'options', label: 'Options Chain', icon: TrendingUp },
        { id: 'sentiment', label: 'Sentiment', icon: MessageSquare },
    ];

    return (
        <nav className="fixed top-0 left-0 h-screen w-64 bg-gray-900 border-r border-gray-800 p-4">
            <div className="flex items-center gap-3 mb-8 px-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xl">S</span>
                </div>
                <h1 className="text-xl font-bold text-white">Sentiviz</h1>
            </div>

            <div className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === item.id
                                    ? 'bg-blue-600/10 text-blue-500'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                                }`}
                        >
                            <Icon size={20} />
                            <span className="font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default Navbar;
