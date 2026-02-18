import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import OptionsChain from './components/OptionsChain';
import AIAnalysis from './components/AIAnalysis';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
      case 'dashboard':
        return <Dashboard />;
      case 'options':
        return <OptionsChain />;
      case 'ai':
        return <AIAnalysis />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-cream dark:bg-gray-950 theme-transition text-gray-900 dark:text-white">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
      />
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0 bg-cream dark:bg-gray-950 theme-transition">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
