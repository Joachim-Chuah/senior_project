import React, { useState, useEffect } from 'react';
import { HouseIcon, PanelsTopLeftIcon, SettingsIcon, ArrowLeft } from 'lucide-react';
import { Tabs, TabsList, TabsTab, TabsPanel } from './components/ui/tabs';
import PageBackground from './components/PageBackground';
import FloatingChat from './components/FloatingChat';
import Landing from './components/Landing';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Screener from './components/Screener';
import Sectors from './components/Sectors';
import MockOptionsChain from './components/MockOptionsChain';
import OverviewTab from './components/tabs/OverviewTab';
import FeaturesTab from './components/tabs/FeaturesTab';
import SettingsTab from './components/tabs/SettingsTab';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

// Maps feature IDs (from the tree) to the rendered component
function FeatureView({ feature, crossTabTicker, clearCrossTabTicker, watchlist, addToWatchlist, removeFromWatchlist, onTickerSelect, navigateTo }) {
  switch (feature) {
    case 'home':
      return (
        <Home
          watchlist={watchlist}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          navigateTo={navigateTo}
        />
      );
    case 'dashboard':
      return DEMO_MODE ? (
        <MockOptionsChain />
      ) : (
        <Dashboard
          navigateTo={navigateTo}
          crossTabTicker={crossTabTicker}
          clearCrossTabTicker={clearCrossTabTicker}
          watchlist={watchlist}
          addToWatchlist={addToWatchlist}
          removeFromWatchlist={removeFromWatchlist}
          onTickerSelect={onTickerSelect}
        />
      );
    case 'sectors':
      return <Sectors />;
    case 'screener':
      return <Screener navigateTo={navigateTo} />;
    default:
      return null;
  }
}

export default function App() {
  const [launched, setLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeFeature, setActiveFeature] = useState(null);
  const [crossTabTicker, setCrossTabTicker] = useState(null);
  const [activeTicker, setActiveTicker] = useState(null);

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
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  function handleTabChange(tab) {
    setActiveTab(tab);
    setActiveFeature(null);
    window.history.pushState({ launched: true, tab }, '');
  }

  function handleFeatureSelect(featureId) {
    setActiveFeature(featureId);
    window.history.pushState({ launched: true, tab: 'features', feature: featureId }, '');
  }

  function navigateTo(featureId, ticker = null) {
    if (ticker) setCrossTabTicker(ticker);
    setActiveFeature(featureId);
    setActiveTab('features');
  }

  function clearCrossTabTicker() {
    setCrossTabTicker(null);
  }

  useEffect(() => {
    const handlePop = (e) => {
      const state = e.state;
      if (!state?.launched) {
        setLaunched(false);
      } else {
        setLaunched(true);
        setActiveTab(state.tab || 'overview');
        setActiveFeature(state.feature || null);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  if (!launched) {
    return (
      <Landing
        onLaunch={() => {
          setLaunched(true);
          window.history.pushState({ launched: true, tab: 'overview' }, '');
        }}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(p => !p)}
      />
    );
  }

  return (
    <div
      className="min-h-screen theme-transition"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <PageBackground darkMode={darkMode} />
      <FloatingChat activeTicker={activeTicker} activeTab={activeTab} />

      <div className="relative z-10">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          {/* ── Tab bar ──────────────────────────────────── */}
          <div
            className="sticky top-0 z-20 flex justify-center border-b pt-8 pb-0"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}
          >
            <TabsList variant="underline" className="px-0">
              <TabsTab value="overview">
                <HouseIcon aria-hidden="true" />
                Overview
              </TabsTab>
              <TabsTab value="features">
                <PanelsTopLeftIcon aria-hidden="true" />
                Features
              </TabsTab>
              <TabsTab value="settings">
                <SettingsIcon aria-hidden="true" />
                Settings
              </TabsTab>
            </TabsList>
          </div>

          {/* ── Overview ─────────────────────────────────── */}
          <TabsPanel value="overview">
            <OverviewTab />
          </TabsPanel>

          {/* ── Features ─────────────────────────────────── */}
          <TabsPanel value="features">
            {activeFeature ? (
              <div>
                {/* Back button */}
                <div className="flex items-center gap-2 px-6 pt-4 pb-0">
                  <button
                    onClick={() => setActiveFeature(null)}
                    className="flex items-center gap-1.5 text-xs transition-colors duration-100"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  >
                    <ArrowLeft size={12} />
                    Back to features
                  </button>
                </div>
                <FeatureView
                  feature={activeFeature}
                  crossTabTicker={crossTabTicker}
                  clearCrossTabTicker={clearCrossTabTicker}
                  watchlist={watchlist}
                  addToWatchlist={addToWatchlist}
                  removeFromWatchlist={removeFromWatchlist}
                  onTickerSelect={setActiveTicker}
                  navigateTo={navigateTo}
                />
              </div>
            ) : (
              <FeaturesTab onSelect={handleFeatureSelect} />
            )}
          </TabsPanel>

          {/* ── Settings ─────────────────────────────────── */}
          <TabsPanel value="settings">
            <SettingsTab darkMode={darkMode} toggleDarkMode={() => setDarkMode(p => !p)} />
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}
