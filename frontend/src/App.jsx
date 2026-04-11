import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Confidence from './components/Confidence';
import AIAnalysis from './components/AIAnalysis';
import Landing from './components/Landing';
import MockOptionsChain from './components/MockOptionsChain';
import BlackScholesGuide from './components/BlackScholesGuide';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

function App() {
  const [launched, setLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [crossTabTicker, setCrossTabTicker] = useState(null);

  function navigateTo(tabId, ticker = null) {
    setActiveTab(tabId);
    setCrossTabTicker(ticker);
  }

  function clearCrossTabTicker() {
    setCrossTabTicker(null);
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

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home />;
      case 'dashboard':
        return DEMO_MODE ? <MockOptionsChain /> : <Dashboard navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
      case 'confidence':
        return DEMO_MODE ? <BlackScholesGuide /> : <Confidence navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
      case 'sentiment':
        return <Dashboard navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
      case 'ai':
        return <AIAnalysis navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
      default:
        return <Home />;
    }
  };

  if (!launched) {
    return (
      <Landing
        onLaunch={() => setLaunched(true)}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream dark:bg-gray-950 theme-transition text-gray-900 dark:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogoClick={() => setLaunched(false)}
      />
      <main className="flex-1 mt-14 bg-cream dark:bg-gray-950 theme-transition">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
