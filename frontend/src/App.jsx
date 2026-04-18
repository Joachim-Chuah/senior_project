import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Confidence from './components/Confidence';
import AIAnalysis from './components/AIAnalysis';
import Landing from './components/Landing';
import MockOptionsChain from './components/MockOptionsChain';
import BlackScholesGuide from './components/BlackScholesGuide';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const TAB_ORDER = DEMO_MODE
  ? ['home', 'sentiment', 'dashboard', 'confidence', 'ai']
  : ['home', 'dashboard', 'confidence', 'ai'];

function App() {
  const [launched, setLaunched] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [crossTabTicker, setCrossTabTicker] = useState(null);
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

  // Blob + spotlight refs for direct DOM manipulation (no re-render on mousemove)
  const blob1Ref     = useRef(null);
  const blob2Ref     = useRef(null);
  const blob3Ref     = useRef(null);
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

          if (blob1Ref.current)
            blob1Ref.current.style.transform = `translate(${x * -120}px, calc(${y * -120}px + ${sy * -0.22}px))`;
          if (blob2Ref.current)
            blob2Ref.current.style.transform = `translate(${x * -60}px, calc(${y * -60}px + ${sy * -0.1}px))`;
          if (blob3Ref.current)
            blob3Ref.current.style.transform = `translate(calc(-50% + ${x * -90}px), calc(-50% + ${y * -90}px + ${sy * -0.16}px))`;

          if (spotlightRef.current) {
            const color = darkModeRef.current
              ? 'rgba(99,70,229,0.13)'
              : 'rgba(99,70,229,0.07)';
            spotlightRef.current.style.background =
              `radial-gradient(500px circle at ${rawX}px ${rawY}px, ${color}, transparent 70%)`;
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
          : <Dashboard navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} />;
      case 'sentiment':
        return <Dashboard navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} watchlist={watchlist} addToWatchlist={addToWatchlist} removeFromWatchlist={removeFromWatchlist} />;
      case 'confidence':
        return DEMO_MODE ? <BlackScholesGuide /> : <Confidence navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
      case 'ai':
        return <AIAnalysis navigateTo={navigateTo} crossTabTicker={crossTabTicker} clearCrossTabTicker={clearCrossTabTicker} />;
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

      {/* ── Noise grain overlay ── */}
      <div className="noise-overlay fixed inset-0 pointer-events-none" style={{ zIndex: 1 }} />

      {/* ── Background effects ── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle, var(--dot) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }} />
        <div className="blob-1 absolute" style={{
          top:   darkMode ? '-300px' : '-120px',
          right: darkMode ? '-300px' : '-120px',
          width:  darkMode ? '1100px' : '580px',
          height: darkMode ? '1100px' : '580px',
        }}>
          <div ref={blob1Ref} style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(79,70,229,0.55) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99,70,229,0.32) 0%, transparent 70%)',
            filter: 'blur(80px)',
            transform: `translateY(${scrollY * -0.22}px)`,
            willChange: 'transform',
          }} />
        </div>
        <div className="blob-2 absolute" style={{
          bottom: '-300px', left: '-300px',
          width:  darkMode ? '1000px' : '900px',
          height: darkMode ? '1000px' : '900px',
        }}>
          <div ref={blob2Ref} style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(6,182,212,0.38) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(13,59,102,0.40) 0%, transparent 70%)',
            filter: 'blur(80px)',
            transform: `translateY(${scrollY * -0.1}px)`,
            willChange: 'transform',
          }} />
        </div>
        <div className="blob-3 absolute" style={{
          top: '40%', left: '50%',
          width:  darkMode ? '900px' : '700px',
          height: darkMode ? '900px' : '700px',
          transform: 'translate(-50%, -50%)',
        }}>
          <div ref={blob3Ref} style={{
            width: '100%', height: '100%',
            borderRadius: '50%',
            background: darkMode
              ? 'radial-gradient(circle, rgba(79,70,229,0.55) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(99,70,229,0.20) 0%, transparent 70%)',
            opacity: 0.5,
            filter: 'blur(100px)',
            transform: `translateY(${scrollY * -0.16}px)`,
            willChange: 'transform',
          }} />
        </div>
      </div>

      <Navbar
        activeTab={activeTab}
        setActiveTab={goToTab}
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        onLogoClick={() => setLaunched(false)}
        navScrolled={scrollY > 10}
      />

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
