import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const pathname = location.pathname;

  const isHome = pathname === '/';
  const isOffline = pathname.startsWith('/offline') || pathname.startsWith('/training');
  const isOnline = pathname.startsWith('/online') || pathname.startsWith('/lobby');
  const isStats = pathname.startsWith('/stats');
  const isProfile = pathname.startsWith('/profile') || pathname.startsWith('/auth');

  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      <button 
        className={`nav-item ${isHome ? 'active' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Home"
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </button>

      <button 
        className={`nav-item ${isOffline ? 'active' : ''}`}
        onClick={() => navigate('/offline')}
        aria-label="Offline Match"
      >
        <span className="nav-icon">🎯</span>
        <span className="nav-label">Offline</span>
      </button>

      <button 
        className={`nav-item ${isOnline ? 'active' : ''}`}
        onClick={() => navigate('/online')}
        aria-label="Online Multiplayer"
      >
        <span className="nav-icon">🌍</span>
        <span className="nav-label">Online</span>
      </button>

      <button 
        className={`nav-item ${isStats ? 'active' : ''}`}
        onClick={() => navigate('/stats')}
        aria-label="Statistiken"
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">Stats</span>
      </button>

      <button 
        className={`nav-item ${isProfile ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
        aria-label="Profil"
      >
        <span className="nav-icon">👤</span>
        <span className="nav-label">Profil</span>
      </button>
    </nav>
  );
};
