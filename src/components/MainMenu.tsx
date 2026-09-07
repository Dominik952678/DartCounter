import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION, BUILD_TIME } from '../version';
import { AppReloadPrompt } from './AppReloadPrompt';

export const MainMenu: React.FC = () => {
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const navigate = useNavigate();
  const { user, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleOnlineClick = () => {
    navigate('/online');
  };

  return (
    <div className="screen active-screen main-menu-screen shell-fill" style={{ width: '100%', alignItems: 'center', position: 'relative', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        {/* ── Brand Header ── */}
        <div className="menu-header-area">
          <div className="menu-header-flex">
            <div className="menu-header-icon">
              🎯
            </div>
            <div>
              <h1 className="menu-header-title">
                DARTCOUNTER
              </h1>
              <p className="menu-header-subtitle">
                Scoring, Statistiken & Multiplayer
              </p>
            </div>
          </div>
        </div>

        {/* ── Command Center Body ── */}
        <div className="menu-middle-wrapper">
          {/* 1. Hero CTA Button (Full width in Portrait / Col 1 in Landscape) */}
          <button type="button" className="hero-cta-tile" onClick={() => navigate('/offline')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <div className="hero-cta-icon">
                🎯
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div className="hero-cta-title">
                  {user ? 'NEUES SPIEL STARTEN' : 'SPIELEN ALS GAST'}
                </div>
                <div className="hero-cta-desc">
                  X01 · Sets/Legs · Training · Bots
                </div>
              </div>
            </div>
            <div className="hero-cta-arrow">
              ➔
            </div>
          </button>

          {/* 2. Secondary Grid (Col 2 in Landscape) */}
          <div className="menu-secondary-grid">
            {/* Online Multiplayer */}
            <button type="button" className="secondary-tile tile-online" onClick={handleOnlineClick}>
              <div className="secondary-tile-top">
                <div className="secondary-tile-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  🌍
                </div>
                <div className="secondary-tile-arrow" style={{ color: 'var(--blue)' }}>➔</div>
              </div>
              <div>
                <div className="secondary-tile-title">Multiplayer</div>
                <div className="secondary-tile-desc">Räume & Global</div>
              </div>
            </button>

            {/* Stats or Auth */}
            {user ? (
              <button type="button" className="secondary-tile tile-stats" onClick={() => navigate('/stats')}>
                <div className="secondary-tile-top">
                  <div className="secondary-tile-icon" style={{ background: 'rgba(249, 115, 22, 0.15)' }}>
                    📊
                  </div>
                  <div className="secondary-tile-arrow" style={{ color: 'var(--orange)' }}>➔</div>
                </div>
                <div>
                  <div className="secondary-tile-title">Statistiken</div>
                  <div className="secondary-tile-desc">Averages & Radar</div>
                </div>
              </button>
            ) : (
              <button type="button" className="secondary-tile tile-auth" onClick={() => navigate('/auth')}>
                <div className="secondary-tile-top">
                  <div className="secondary-tile-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
                    🔑
                  </div>
                  <div className="secondary-tile-arrow" style={{ color: 'var(--purple)' }}>➔</div>
                </div>
                <div>
                  <div className="secondary-tile-title">Account</div>
                  <div className="secondary-tile-desc">Login & Cloud</div>
                </div>
              </button>
            )}
          </div>

          {/* 3. Training Quickstart (Col 3 in Landscape) */}
          <div className="menu-training-col">
            <div className="menu-training-container">
              <div className="training-section-label">
                SCHNELLSTART TRAINING
              </div>
              <div className="training-chips-grid">
                <button
                  type="button"
                  className="training-chip"
                  onClick={() => navigate('/offline?tab=training&mode=checkout')}
                >
                  <span className="training-chip-icon">🎯</span>
                  <span className="training-chip-title">Checkout</span>
                </button>
                <button
                  type="button"
                  className="training-chip"
                  onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
                >
                  <span className="training-chip-icon">🔥</span>
                  <span className="training-chip-title">Scoring</span>
                </button>
                <button
                  type="button"
                  className="training-chip"
                  onClick={() => navigate('/offline?tab=training&mode=splitscore')}
                >
                  <span className="training-chip-icon">➗</span>
                  <span className="training-chip-title">Split</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Docked User Status Bar & Version ── */}
        <div className="menu-footer-area">
          <div className="menu-status-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
              <span style={{ 
                width: '7px', 
                height: '7px', 
                borderRadius: '50%', 
                backgroundColor: user ? 'var(--primary)' : 'var(--text-muted)',
                boxShadow: user ? '0 0 8px var(--primary-glow)' : 'none',
                flexShrink: 0
              }} />
              <span className="menu-status-text">
                {user ? (
                  <>Eingeloggt als <strong style={{ color: 'var(--primary)' }}>{user.user_metadata?.username || user.email}</strong></>
                ) : (
                  <span style={{ color: 'var(--text-dim)' }}>Modus: <strong style={{ color: 'var(--text)' }}>Gast</strong></span>
                )}
              </span>
            </div>
            {user ? (
              <button 
                onClick={() => { signOut(); navigate('/'); }}
                className="menu-status-btn"
                style={{ background: 'transparent', border: 'none', color: 'var(--red)' }}
              >
                Abmelden
              </button>
            ) : (
              <button 
                onClick={() => navigate('/auth')}
                className="menu-status-btn"
                style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'var(--blue)' }}
              >
                Login
              </button>
            )}
          </div>

          <button
            type="button"
            className="menu-version"
            style={{
              padding: '2px 8px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              userSelect: 'none',
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              minHeight: 'auto'
            }}
            onClick={() => setShowReloadPrompt(true)}
            title="Klicken zum Neuladen / Cache leeren"
          >
            <span>{APP_VERSION}</span>
            <span>•</span>
            <span>Build {BUILD_TIME}</span>
          </button>
        </div>
      </div>

      {showReloadPrompt && <AppReloadPrompt onCancel={() => setShowReloadPrompt(false)} />}
    </div>
  );
};
