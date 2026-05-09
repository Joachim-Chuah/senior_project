import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PageBackground from './components/PageBackground';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Confidence from './components/Confidence';
import Landing from './components/Landing';
import MockOptionsChain from './components/MockOptionsChain';
import BlackScholesGuide from './components/BlackScholesGuide';
import FloatingChat from './components/FloatingChat';
import Sectors from './components/Sectors';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const TAB_ORDER = DEMO_MODE
  ? ['home', 'sentiment', 'dashboard', 'confidence']
  : ['home', 'dashboard', 'sectors', 'confidence'];

const TAB_LABELS = {
  home: 'Home',
  dashboard: DEMO_MODE ? 'Options Chain' : 'Dashboard',
  sentiment: 'Sentiment',
  sectors: 'Sectors',
  confidence: DEMO_MODE ? 'B-S Guide' : 'Confidence',
};

function ScrollDots({ tabs, activeTab, onNavigate }) {
  return (
    <div className="fixed right-5 top-1/2 -translate-y-1/2 z-50 flex flex-col items-end gap-3.5 hidden lg:flex">
      {tabs.map(tab => {
        const isActive = tab === activeTab;
        return (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className="group flex items-center gap-2.5 cursor-pointer"
          >
            <span
              className="text-xs font-medium transition-all duration-200 opacity-0 group-hover:opacity-100 whitespace-nowrap"
              style={{ color: 'var(--text-muted)' }}
            >
              {TAB_LABELS[tab]}
            </span>
            <div
              className="rounded-full transition-all duration-300 flex-shrink-0"
              style={{
                width: isActive ? 10 : 5,
                height: isActive ? 10 : 5,
                background: isActive ? 'var(--accent)' : 'var(--border-hover)',
                boxShadow: isActive ? '0 0 10px rgba(99,70,229,0.7)' : 'none',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

function App() {
  const [launched, setLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [crossTabTicker, setCrossTabTicker] = useState(null);
  const [activeTicker, setActiveTicker] = useState(null);
  const [scrollY, setScrollY] = useState(0);

  const sectionRefs = useRef({});
  const scrollContainerRef = useRef(null);
  const scrollTopRef = useRef(0);

  function goToTab(tabId, ticker = null) {
    setActiveTab(tabId);
    if (ticker) setCrossTabTicker(ticker);
    window.history.pushState({ launched: true, tab: tabId }, '');
    const el = sectionRefs.current[tabId];
    if (el && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
    }
  }

  function navigateTo(tabId, ticker = null) {
    goToTab(tabId, ticker);
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
        const tab = state.tab || 'home';
        setLaunched(true);
        setActiveTab(tab);
        const el = sectionRefs.current[tab];
        if (el && scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
        }
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

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

  // Spotlight + mouse refs for direct DOM manipulation (no re-render on mousemove)
  const spotlightRef = useRef(null);
  const mouseRef     = useRef({ x: 0, y: 0, rawX: 0, rawY: 0 });
  const darkModeRef  = useRef(darkMode);
  const rafRef       = useRef(null);

  // Scroll listener on the snap container
  useEffect(() => {
    if (!launched) return;
    const container = scrollContainerRef.current;
    if (!container) return;
    const onScroll = () => {
      const top = container.scrollTop;
      scrollTopRef.current = top;
      setScrollY(top);
    };
    container.addEventListener('scroll', onScroll, { passive: true });
    return () => container.removeEventListener('scroll', onScroll);
  }, [launched]);

  useEffect(() => { darkModeRef.current = darkMode; }, [darkMode]);

  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current = {
        x: e.clientX / window.innerWidth  - 0.5,
        y: e.clientY / window.innerHeight - 0.5,
        rawX: e.clientX,
        rawY: e.clientY,
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const { x, y, rawX, rawY } = mouseRef.current;
          const sy = scrollTopRef.current;

          if (spotlightRef.current) {
            const color = darkModeRef.current
              ? 'rgba(255,255,255,0.055)'
              : 'rgba(44,62,80,0.08)';
            spotlightRef.current.style.background =
              `radial-gradient(280px circle at ${rawX}px ${rawY}px, ${color}, transparent 70%)`;
          }
        });
      }
    };
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // IntersectionObserver — sync active tab + fade+scale animation
  useEffect(() => {
    if (!launched) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observers = [];

    TAB_ORDER.forEach((tab, i) => {
      const el = sectionRefs.current[tab];
      if (!el) return;

      // Sync active tab when majority visible
      const syncObs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveTab(tab);
            window.history.replaceState({ launched: true, tab }, '');
          }
        },
        { root: container, threshold: 0.6 }
      );
      syncObs.observe(el);
      observers.push(syncObs);

      // Fade+scale: show when just entering view
      const animObs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) el.classList.add('snap-visible');
        },
        { root: container, threshold: 0.05 }
      );
      animObs.observe(el);
      observers.push(animObs);

      // First section is immediately visible
      if (i === 0) requestAnimationFrame(() => el.classList.add('snap-visible'));
    });

    return () => observers.forEach(o => o.disconnect());
  }, [launched]);

  const renderSection = (tab) => {
    switch (tab) {
      case 'home':
        return <Home watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} navigateTo={navigateTo} />;
      case 'dashboard':
        return DEMO_MODE
          ? <MockOptionsChain />
          : <Dashboard navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} onTickerSelect={setActiveTicker} />;
      case 'sentiment':
        return <Dashboard navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} onTickerSelect={setActiveTicker} />;
      case 'sectors':
        return <Sectors />;
      case 'confidence':
        return DEMO_MODE ? <BlackScholesGuide /> : <Confidence navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
      default:
        return null;
    }
  };

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
      className="theme-transition"
      style={{ height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* ── Cursor spotlight ── */}
      <div ref={spotlightRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      {/* ── Noise grain overlay (light mode only) ── */}
      {!darkMode && <div className="noise-overlay fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} />}

      {/* ── Dotted wave background (both modes) ── */}
      <PageBackground darkMode={darkMode} />

      <Navbar
        activeTab={activeTab}
        setActiveTab={goToTab}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogoClick={() => goToTab('home')}
        navScrolled={scrollY > 10}
      />

      <ScrollDots tabs={TAB_ORDER} activeTab={activeTab} onNavigate={goToTab} />

      <FloatingChat activeTicker={activeTicker} activeTab={activeTab} />

      {/* ── Snap scroll container ── */}
      <div
        ref={scrollContainerRef}
        className="relative z-10"
        style={{
          height: '100vh',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
        }}
      >
        {TAB_ORDER.map(tab => (
          <div
            key={tab}
            ref={el => { sectionRefs.current[tab] = el; }}
            className="snap-section"
            style={{
              height: '100vh',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              overflowY: 'auto',
              paddingTop: '4rem',
            }}
          >
            {renderSection(tab)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
