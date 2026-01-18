import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import OptionsChain from './components/OptionsChain';
import SentimentView from './components/SentimentView';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'options':
        return <OptionsChain />;
      case 'sentiment':
        return <SentimentView />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-900 text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 ml-64">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
