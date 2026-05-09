import React, { useState, useEffect } from 'react';
import { PanelLeftOpen } from 'lucide-react';
import Sidebar from './components/Sidebar';
import PageBackground from './components/PageBackground';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Screener from './components/Screener';
import Landing from './components/Landing';
import MockOptionsChain from './components/MockOptionsChain';
import BlackScholesGuide from './components/BlackScholesGuide';
import FloatingChat from './components/FloatingChat';
import Sectors from './components/Sectors';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function App() {
  const [launched, setLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [crossTabTicker, setCrossTabTicker] = useState(null);
  const [activeTicker, setActiveTicker] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [watchlist, setWatchlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('watchlist') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('watchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  function addToWatchlist(ticker) {
    const t = ticker.toUpperCase().trim();
    if (t && !watchlist.includes(t)) setWatchlist(prev => [...prev, t]);
  }

  function removeFromWatchlist(ticker) {
    setWatchlist(prev => prev.filter(t => t !== ticker));
  }

  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('darkMode');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  function goToTab(tabId, ticker = null) {
    setActiveTab(tabId);
    if (ticker) setCrossTabTicker(ticker);
    window.history.pushState({ launched: true, tab: tabId }, '');
  }

  function clearCrossTabTicker() {
    setCrossTabTicker(null);
  }

  useEffect(() => {
    const handlePop = (e) => {
      const state = e.state;
      if (!state?.launched) {
        setLaunched(false);
        setActiveTab('home');
      } else {
        setLaunched(true);
        setActiveTab(state.tab || 'home');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  function renderSection(tab) {
    switch (tab) {
      case 'home':
        return <Home watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} navigateTo={goToTab} />;
      case 'dashboard':
        return DEMO_MODE
          ? <MockOptionsChain />
          : <Dashboard navigateTo={goToTab} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} onTickerSelect={setActiveTicker} />;
      case 'sentiment':
        return <Dashboard navigateTo={goToTab} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} onTickerSelect={setActiveTicker} />;
      case 'sectors':
        return <Sectors />;
      case 'screener':
        return <Screener navigateTo={goToTab} />;
      default:
        return null;
    }
  }

  if (!launched) {
    return (
      <Landing
        onLaunch={() => {
          setLaunched(true);
          window.history.pushState({ launched: true, tab: 'home' }, '');
        }}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden theme-transition"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Sidebar — animates in/out */}
      <div
        className="flex-shrink-0 overflow-hidden transition-all duration-200"
        style={{ width: sidebarOpen ? 224 : 0 }}
      >
        <Sidebar
          activeTab={activeTab}
          onNavigate={goToTab}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          onCollapse={() => setSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 relative overflow-y-auto min-w-0">
        <PageBackground darkMode={darkMode} />
        <FloatingChat activeTicker={activeTicker} activeTab={activeTab} />

        {/* Expand button — only visible when sidebar is hidden */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-4 left-4 z-50 p-1.5 rounded-sm transition-colors duration-100"
            style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
            title="Open sidebar"
          >
            <PanelLeftOpen size={14} />
          </button>
        )}

        <div className="relative z-10 p-6">
          {renderSection(activeTab)}
        </div>
      </div>
    </div>
  );
}

export default App;
