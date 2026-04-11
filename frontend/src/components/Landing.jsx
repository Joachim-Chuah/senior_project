import React from 'react';
import { LayoutDashboard, BrainCircuit, Sparkles, BarChart2, ArrowRight, Sun, Moon, LineChart, BookOpen } from 'lucide-react';

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
    return (
        <div className="min-h-screen flex flex-col bg-cream dark:bg-gray-950 theme-transition text-gray-900 dark:text-white">

            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-gray-900 dark:bg-white rounded-md flex items-center justify-center">
                        <BarChart2 size={14} className="text-white dark:text-gray-900" />
                    </div>
                    <span className="text-sm font-bold tracking-tight">Sentiviz</span>
                </div>
                <button
                    onClick={toggleDarkMode}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200 transition-all duration-150"
                >
                    {darkMode ? <Sun size={15} /> : <Moon size={15} />}
                    <span>{darkMode ? 'Light' : 'Dark'}</span>
                </button>
            </div>

            {/* Hero */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-dashed border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400 mb-6">
                    <span className={`w-1.5 h-1.5 rounded-full ${DEMO_MODE ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
                    {DEMO_MODE ? 'Demo mode · Black-Scholes pricing' : 'Live market data'}
                </div>

                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white max-w-2xl leading-tight">
                    Sentiviz
                </h1>

                <p className="mt-4 text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
                    Real-time sentiment + AI-powered confidence signals for stocks and ETFs.
                </p>

                <button
                    onClick={onLaunch}
                    className="mt-8 inline-flex items-center gap-2 bg-gray-900 dark:bg-white hover:bg-gray-700 dark:hover:bg-gray-100 text-white dark:text-gray-900 px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
                >
                    Launch App
                    <ArrowRight size={16} />
                </button>

                <p className="mt-3 text-xs text-gray-400 dark:text-gray-600">
                    No sign-up required
                </p>
            </div>

            {/* Feature cards */}
            <div className="px-6 pb-12 max-w-4xl mx-auto w-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {features.map(({ icon: Icon, title, description }) => (
                        <div
                            key={title}
                            className="bg-white dark:bg-gray-900 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-5 text-left theme-transition"
                        >
                            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                                <Icon size={16} className="text-gray-700 dark:text-gray-300" />
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1.5">{title}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Landing;
