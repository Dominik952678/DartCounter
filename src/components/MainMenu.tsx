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
      <style>{`
        .hero-glow-bg {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: min(500px, 90vw);
          height: 350px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Fluid, Dynamic Main Card (fills the shell above the dock) ── */
        .main-menu-screen {
          /* The .shell-fill utility derives the exact height left between the
             safe areas and the floating dock, so nothing slides under the nav. */
          display: flex;
          flex-direction: column;
        }

        .main-menu-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: min(520px, 100%);
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          transition: all 0.2s ease;
          gap: clamp(10px, 2vh, 20px);
        }

        /* ── Header Area ── */
        .menu-header-area {
          flex-shrink: 0;
          width: 100%;
          text-align: center;
          margin-top: clamp(2px, 0.8vh, 6px);
          margin-bottom: clamp(2px, 0.6vh, 6px);
        }

        .menu-header-flex {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .menu-header-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: clamp(42px, 5.5vh, 56px);
          height: clamp(42px, 5.5vh, 56px);
          border-radius: clamp(12px, 1.8vh, 18px);
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(59, 130, 246, 0.15));
          border: 1px solid rgba(245, 158, 11, 0.2);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          margin-bottom: clamp(2px, 0.6vh, 8px);
          font-size: clamp(1.3rem, 2.2vh, 1.8rem);
        }

        .menu-header-title {
          font-size: clamp(1.6rem, 2.8vh, 2.2rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, var(--primary), #FBBF24);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1.15;
        }

        .menu-header-subtitle {
          color: var(--text-dim);
          font-size: clamp(0.76em, 1.2vh, 0.88em);
          margin-top: clamp(1px, 0.3vh, 3px);
          font-weight: 500;
        }

        /* ── Command Center Content Flow ── */
        .menu-middle-wrapper {
          flex: 1;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: clamp(8px, 1.4vh, 14px);
        }

        /* ── 1. Hero CTA (Full width, dominant Amber gradient) ── */
        .hero-cta-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(14px, 2.2vh, 20px) clamp(16px, 2.2vw, 22px);
          border-radius: var(--radius, 14px);
          background: linear-gradient(135deg, var(--primary), #D97706);
          color: #000;
          cursor: pointer;
          transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease;
          width: 100%;
          box-sizing: border-box;
          animation: ctaPulse 3s infinite ease-in-out;
        }
        .hero-cta-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(245, 158, 11, 0.5);
        }
        .hero-cta-tile:active {
          transform: scale(0.98);
        }

        .hero-cta-icon {
          width: clamp(40px, 5.5vh, 48px);
          height: clamp(40px, 5.5vh, 48px);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.4rem, 2.4vh, 1.8rem);
          flex-shrink: 0;
        }

        .hero-cta-title {
          font-size: clamp(1.15em, 2vh, 1.35em);
          font-weight: 900;
          letter-spacing: -0.02em;
          color: #000;
        }

        .hero-cta-desc {
          font-size: clamp(0.76em, 1.2vh, 0.86em);
          color: rgba(0, 0, 0, 0.7);
          font-weight: 600;
          margin-top: 2px;
        }

        .hero-cta-arrow {
          font-size: clamp(1.3em, 2.2vh, 1.6em);
          font-weight: 900;
          color: #000;
          flex-shrink: 0;
        }

        /* ── 2. Secondary Grid (2-Column: Online & Stats/Auth) ── */
        .menu-secondary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(8px, 1.4vw, 12px);
          width: 100%;
        }

        .secondary-tile {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: clamp(12px, 1.8vh, 16px) clamp(12px, 1.8vw, 16px);
          border-radius: var(--radius, 14px);
          background: var(--card);
          border: 1px solid var(--card-border);
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.2s, box-shadow 0.2s;
          color: var(--text);
          box-sizing: border-box;
          min-height: clamp(80px, 12vh, 105px);
        }

        .secondary-tile:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .secondary-tile:active {
          transform: scale(0.98);
        }

        .secondary-tile-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .secondary-tile-icon {
          width: clamp(32px, 4.2vh, 38px);
          height: clamp(32px, 4.2vh, 38px);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.2rem, 1.8vh, 1.5rem);
        }

        .secondary-tile-arrow {
          font-size: 1.1em;
          font-weight: 700;
        }

        .secondary-tile-title {
          font-size: clamp(0.92em, 1.5vh, 1.05em);
          font-weight: 800;
          color: var(--text);
          margin-top: 6px;
        }

        .secondary-tile-desc {
          font-size: clamp(0.68em, 1.1vh, 0.76em);
          color: var(--text-dim);
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tile-online {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(59, 130, 246, 0.02)), var(--card);
          border-color: rgba(59, 130, 246, 0.35);
        }
        .tile-online:hover {
          border-color: var(--blue);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.2);
        }

        .tile-stats {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(249, 115, 22, 0.02)), var(--card);
          border-color: rgba(249, 115, 22, 0.35);
        }
        .tile-stats:hover {
          border-color: var(--orange);
          box-shadow: 0 6px 20px rgba(249, 115, 22, 0.2);
        }

        .tile-auth {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(139, 92, 246, 0.02)), var(--card);
          border-color: rgba(139, 92, 246, 0.35);
        }
        .tile-auth:hover {
          border-color: var(--purple);
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.2);
        }

        /* ── 3. Training Quickstart Chips (3-Column) ── */
        .menu-training-container {
          width: 100%;
        }

        .training-section-label {
          font-size: clamp(0.74em, 1.2vh, 0.8em);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: var(--text-dim);
          margin-bottom: clamp(4px, 0.6vh, 6px);
          font-weight: 700;
          padding-left: 2px;
        }

        .training-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(6px, 1.2vw, 10px);
        }

        .training-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(3px, 0.6vh, 6px);
          padding: clamp(12px, 1.8vh, 16px) clamp(6px, 1vw, 10px);
          min-height: clamp(78px, 11vh, 100px);
          background: var(--card);
          border: 1px solid var(--card-border);
          border-radius: var(--radius, 14px);
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
          color: var(--text);
          box-sizing: border-box;
          text-align: center;
        }

        .training-chip:hover {
          background: var(--surface-hover);
          transform: translateY(-2px);
          border-color: var(--primary);
        }

        .training-chip:active {
          transform: scale(0.97);
        }

        .training-chip-icon {
          font-size: clamp(1.5rem, 2.6vh, 1.9rem);
          line-height: 1;
        }

        .training-chip-title {
          font-weight: 800;
          font-size: clamp(0.86em, 1.5vh, 1em);
          letter-spacing: -0.01em;
        }

        /* ── 4. User Status Bar (Docked bottom) ── */
        .menu-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(6px, 1vh, 8px) clamp(10px, 1.5vw, 14px);
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: var(--radius-sm, 10px);
          border: 1px solid var(--card-border);
          width: 100%;
          box-sizing: border-box;
        }

        .menu-status-text {
          font-size: clamp(0.78em, 1.3vh, 0.85em);
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-status-btn {
          font-size: clamp(0.74em, 1.2vh, 0.8em);
          font-weight: 700;
          border-radius: 6px;
          cursor: pointer;
          padding: 2px 8px;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .menu-footer-area {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 100%;
          align-items: center;
        }

        /* ── Phone in landscape: ~400pt of height, so the chrome gets out
              of the way and the three columns keep their content ── */
        @media (orientation: landscape) and (max-height: 520px) {
          .main-menu-card { gap: 6px !important; }
          .menu-header-area { margin: 0 !important; }
          .menu-header-icon { display: none !important; }
          .menu-header-title { font-size: 1.2rem !important; }
          .menu-header-subtitle { display: none !important; }
          .hero-cta-icon { width: 38px !important; height: 38px !important; font-size: 1.3rem !important; }
          .hero-cta-title { font-size: 1rem !important; }
          .secondary-tile {
            min-height: 0 !important;
            padding: 8px 12px !important;
            gap: 4px !important;
          }
          .secondary-tile-icon { width: 26px !important; height: 26px !important; font-size: 1rem !important; }
          .secondary-tile-desc { display: none !important; }
          .training-section-label { display: none !important; }
          .training-chip { padding: 4px 12px !important; min-height: 0 !important; }
          .menu-status-bar { padding: 4px 10px !important; }
          .menu-version { display: none !important; }
        }

        /* ── iPad in Portrait ── */
        @media (min-width: 768px) and (orientation: portrait) {
          .main-menu-card {
            max-width: 600px !important;
            gap: 18px !important;
          }
          .hero-cta-tile {
            padding: 22px 26px !important;
          }
          .secondary-tile {
            min-height: 120px !important;
            padding: 18px !important;
          }
        }

        /* ── Landscape / Wide Mode (iPad & Desktop: 3-Column Layout) ── */
        @media (orientation: landscape) {
          .main-menu-screen {
            /* A hard height (not just min-height) is what lets the middle row
               shrink on a phone in landscape, where ~400pt has to hold header,
               tiles and status bar without anything sliding under the dock. */
            height: calc(100dvh - var(--shell-pad-top) - var(--shell-pad-bottom));
            min-height: 0;
            overflow: hidden;
            justify-content: center;
            align-items: center;
          }

          .main-menu-card {
            max-width: min(1080px, 94vw) !important;
            gap: clamp(8px, 1.6vh, 14px) !important;
          }

          /* The tile stacks in landscape, where a trailing arrow on its own row
             reads as a stray glyph rather than an affordance. */
          .hero-cta-arrow {
            display: none;
          }

          .menu-header-area {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
          }

          .menu-header-flex {
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 12px;
          }

          .menu-header-icon {
            width: 38px !important;
            height: 38px !important;
            font-size: 1.3rem !important;
            margin-bottom: 0 !important;
          }

          .menu-header-title {
            font-size: clamp(1.4rem, 3vh, 1.9rem) !important;
          }

          .menu-middle-wrapper {
            display: grid !important;
            grid-template-columns: 1.2fr 1fr 1fr !important;
            gap: clamp(10px, 1.8vw, 18px) !important;
            align-items: stretch !important;
            /* Without a ceiling the three columns stretch to fill an iPad's
               full height and the tiles turn into empty billboards. */
            flex: 1 1 0 !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }

          .menu-header-area,
          .menu-footer-area {
            flex-shrink: 0 !important;
          }

          .main-menu-card {
            min-height: 0 !important;
          }

          .secondary-tile {
            justify-content: center !important;
            gap: 10px !important;
          }
          .secondary-tile-title { margin-top: 0 !important; }

          .hero-cta-tile {
            height: 100% !important;
            flex-direction: column !important;
            justify-content: center !important;
            text-align: center !important;
            padding: 16px !important;
            gap: 8px !important;
          }

          .hero-cta-icon {
            width: 52px !important;
            height: 52px !important;
            font-size: 2rem !important;
          }

          .menu-secondary-grid {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            gap: 10px !important;
          }

          .secondary-tile {
            flex: 1 !important;
            min-height: 0 !important;
          }

          .menu-training-col {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            gap: 8px !important;
          }

          .menu-training-container {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
          }

          .training-chips-grid {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            gap: clamp(8px, 1.6vh, 14px) !important;
          }

          .training-chip {
            flex: 1 !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 14px !important;
            padding: 8px 16px !important;
            min-height: 0 !important;
          }

          .training-chip-icon {
            font-size: clamp(1.6rem, 3vh, 2.1rem) !important;
          }

          .training-chip-title {
            font-size: clamp(0.95em, 1.8vh, 1.15em) !important;
          }
        }
      `}</style>

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
          <div className="hero-cta-tile" onClick={() => navigate('/offline')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
              <div className="hero-cta-icon">
                🎯
              </div>
              <div style={{ minWidth: 0 }}>
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
          </div>

          {/* 2. Secondary Grid (Col 2 in Landscape) */}
          <div className="menu-secondary-grid">
            {/* Online Multiplayer */}
            <div className="secondary-tile tile-online" onClick={handleOnlineClick}>
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
            </div>

            {/* Stats or Auth */}
            {user ? (
              <div className="secondary-tile tile-stats" onClick={() => navigate('/stats')}>
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
              </div>
            ) : (
              <div className="secondary-tile tile-auth" onClick={() => navigate('/auth')}>
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
              </div>
            )}
          </div>

          {/* 3. Training Quickstart (Col 3 in Landscape) */}
          <div className="menu-training-col">
            <div className="menu-training-container">
              <div className="training-section-label">
                SCHNELLSTART TRAINING
              </div>
              <div className="training-chips-grid">
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=checkout')}
                >
                  <span className="training-chip-icon">🎯</span>
                  <span className="training-chip-title">Checkout</span>
                </div>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
                >
                  <span className="training-chip-icon">🔥</span>
                  <span className="training-chip-title">Scoring</span>
                </div>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=splitscore')}
                >
                  <span className="training-chip-icon">➗</span>
                  <span className="training-chip-title">Split</span>
                </div>
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

          <div
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
              cursor: 'pointer'
            }}
            onClick={() => setShowReloadPrompt(true)}
            title="Klicken zum Neuladen / Cache leeren"
          >
            <span>{APP_VERSION}</span>
            <span>•</span>
            <span>Build {BUILD_TIME}</span>
          </div>
        </div>
      </div>

      {showReloadPrompt && <AppReloadPrompt onCancel={() => setShowReloadPrompt(false)} />}
    </div>
  );
};
