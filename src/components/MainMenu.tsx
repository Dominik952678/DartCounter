import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export const MainMenu: React.FC = () => {
  const navigate = useNavigate();
  const { user, initialize, signOut } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleOnlineClick = () => {
    navigate('/online');
  };

  return (
    <div className="screen active-screen main-menu-screen" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflowX: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        .hero-glow-bg {
          position: absolute;
          top: -100px;
          left: 50%;
          transform: translateX(-50%);
          width: min(500px, 90vw);
          height: 350px;
          background: radial-gradient(circle, rgba(0, 210, 106, 0.12) 0%, rgba(10, 132, 255, 0.08) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        /* ── Fluid, Dynamic Main Card ── */
        .main-menu-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: min(500px, 100%);
          display: flex;
          flex-direction: column;
          gap: clamp(10px, 1.8vh, 16px);
          transition: all 0.2s ease;
        }

        /* ── Header Area ── */
        .menu-header-area {
          text-align: center;
          margin-top: clamp(2px, 1vh, 10px);
          margin-bottom: clamp(2px, 0.8vh, 8px);
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
          width: clamp(48px, 6.5vh, 64px);
          height: clamp(48px, 6.5vh, 64px);
          border-radius: clamp(14px, 2vh, 20px);
          background: linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(10, 132, 255, 0.2));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          margin-bottom: clamp(6px, 1.2vh, 12px);
          font-size: clamp(1.5rem, 2.5vh, 2rem);
        }

        .menu-header-title {
          font-size: clamp(1.8rem, 3.2vh, 2.4rem);
          font-weight: 900;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, var(--green), var(--blue));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0;
          line-height: 1.15;
        }

        .menu-header-subtitle {
          color: var(--text-dim);
          font-size: clamp(0.8em, 1.4vh, 0.95em);
          margin-top: clamp(2px, 0.4vh, 4px);
          font-weight: 500;
        }

        /* ── Content Grid Hierarchy ── */
        .menu-content-grid {
          display: flex;
          flex-direction: column;
          gap: clamp(10px, 1.8vh, 16px);
          width: 100%;
        }

        .menu-left-box {
          display: contents;
        }

        .menu-status-container {
          order: 1;
        }

        .menu-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(8px, 1.2vh, 10px) clamp(12px, 1.8vw, 16px);
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: clamp(10px, 1.5vh, 14px);
          border: 1px solid var(--card-border);
        }

        .menu-status-text {
          font-size: clamp(0.8em, 1.4vh, 0.88em);
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .menu-status-btn {
          font-size: clamp(0.76em, 1.3vh, 0.82em);
          font-weight: 700;
          border-radius: 8px;
          cursor: pointer;
          padding: clamp(3px, 0.5vh, 4px) clamp(6px, 1vw, 10px);
          flex-shrink: 0;
          transition: all 0.15s ease;
        }

        .menu-right-box {
          order: 2;
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 1.4vh, 12px);
        }

        .menu-action-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(12px, 2vh, 18px) clamp(14px, 2vw, 20px);
          border-radius: clamp(12px, 1.8vh, 16px);
          background: var(--card);
          border: 1px solid var(--card-border);
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
          text-align: left;
          width: 100%;
          color: var(--text);
          box-sizing: border-box;
        }

        .menu-action-tile:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }

        .menu-action-tile:active {
          transform: scale(0.98);
        }

        .tile-icon {
          width: clamp(38px, 5.5vh, 48px);
          height: clamp(38px, 5.5vh, 48px);
          font-size: clamp(1.6rem, 2.6vh, 2.2rem);
          border-radius: clamp(10px, 1.4vh, 12px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tile-title {
          font-size: clamp(1.05em, 1.8vh, 1.25em);
          font-weight: 800;
          color: var(--text);
        }

        .tile-desc {
          font-size: clamp(0.76em, 1.3vh, 0.85em);
          color: var(--text-dim);
          margin-top: 2px;
        }

        .tile-arrow {
          font-size: clamp(1.2em, 2vh, 1.4em);
          font-weight: 700;
          flex-shrink: 0;
        }

        .tile-offline {
          background: linear-gradient(135deg, rgba(0, 210, 106, 0.12), rgba(0, 210, 106, 0.02)), var(--card);
          border-color: rgba(0, 210, 106, 0.35);
        }
        .tile-offline:hover {
          border-color: var(--green);
          box-shadow: 0 8px 24px rgba(0, 210, 106, 0.15);
        }

        .tile-online {
          background: linear-gradient(135deg, rgba(10, 132, 255, 0.12), rgba(10, 132, 255, 0.02)), var(--card);
          border-color: rgba(10, 132, 255, 0.35);
        }
        .tile-online:hover {
          border-color: var(--blue);
          box-shadow: 0 8px 24px rgba(10, 132, 255, 0.15);
        }

        .tile-stats {
          background: linear-gradient(135deg, rgba(255, 159, 10, 0.12), rgba(255, 159, 10, 0.02)), var(--card);
          border-color: rgba(255, 159, 10, 0.35);
        }
        .tile-stats:hover {
          border-color: var(--orange);
          box-shadow: 0 8px 24px rgba(255, 159, 10, 0.15);
        }

        .tile-auth {
          background: linear-gradient(135deg, rgba(94, 92, 230, 0.12), rgba(94, 92, 230, 0.02)), var(--card);
          border-color: rgba(94, 92, 230, 0.35);
        }
        .tile-auth:hover {
          border-color: var(--purple);
          box-shadow: 0 8px 24px rgba(94, 92, 230, 0.15);
        }

        .menu-training-container {
          order: 3;
          margin-top: clamp(0px, 0.5vh, 4px);
        }

        .training-section-label {
          font-size: clamp(0.74em, 1.2vh, 0.8em);
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-dim);
          margin-bottom: clamp(6px, 1vh, 10px);
          font-weight: 700;
          padding-left: 4px;
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
          padding: clamp(8px, 1.4vh, 12px) clamp(4px, 1vw, 8px);
          background: var(--surface);
          border: 1px solid var(--card-border);
          border-radius: clamp(10px, 1.5vh, 14px);
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text);
          box-sizing: border-box;
          text-align: center;
        }

        .training-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.22);
        }

        .training-chip:active {
          transform: scale(0.97);
        }

        .training-chip-icon {
          font-size: clamp(1.3rem, 2.2vh, 1.6rem);
        }

        .training-chip-title {
          font-weight: 700;
          font-size: clamp(0.76em, 1.3vh, 0.85em);
          margin-top: 2px;
        }

        /* ── Landscape / Wide Mode (Compact, perfectly proportioned, tight gaps) ── */
        @media (orientation: landscape) and (min-width: 540px), (min-width: 860px) {
          .main-menu-screen {
            height: auto !important;
            min-height: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .main-menu-card {
            max-width: 840px !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 10px !important;
          }

          .menu-header-area {
            text-align: center;
            margin-top: 0 !important;
            margin-bottom: 2px !important;
          }

          .menu-header-icon {
            width: 38px !important;
            height: 38px !important;
            font-size: 1.3rem !important;
            margin-bottom: 0 !important;
            border-radius: 10px !important;
          }

          .menu-header-title {
            font-size: 1.6rem !important;
            line-height: 1.1 !important;
          }

          .menu-header-subtitle {
            font-size: 0.76em !important;
            margin-top: 1px !important;
          }

          .menu-header-flex {
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 10px;
          }

          .menu-content-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 14px !important;
            align-items: stretch !important;
          }

          .menu-left-box {
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: 8px !important;
          }

          .menu-status-container {
            order: unset !important;
          }

          .menu-status-bar {
            padding: 8px 12px !important;
            border-radius: 12px !important;
          }

          .menu-status-text {
            font-size: 0.82em !important;
          }

          .menu-status-btn {
            font-size: 0.78em !important;
            padding: 3px 8px !important;
          }

          .menu-training-container {
            order: unset !important;
            margin-top: 0 !important;
          }

          .training-section-label {
            font-size: 0.76em !important;
            margin-bottom: 4px !important;
          }

          .training-chips-grid {
            gap: 6px !important;
          }

          .training-chip {
            aspect-ratio: 1 / 1 !important;
            padding: 6px 4px !important;
            border-radius: 12px !important;
          }

          .training-chip-icon {
            font-size: 1.4rem !important;
          }

          .training-chip-title {
            font-size: 0.78em !important;
          }

          .menu-right-box {
            order: unset !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: 8px !important;
          }

          .menu-action-tile {
            padding: 10px 14px !important;
            border-radius: 14px !important;
          }

          .tile-icon {
            width: 38px !important;
            height: 38px !important;
            font-size: 1.6rem !important;
            border-radius: 10px !important;
          }

          .tile-title {
            font-size: 1.05em !important;
          }

          .tile-desc {
            font-size: 0.75em !important;
          }

          .tile-arrow {
            font-size: 1.2em !important;
          }
        }

        /* ── iPad & Large Displays in Landscape (min-width: 768px, min-height: 500px) ── */
        @media (min-width: 768px) and (orientation: landscape) and (min-height: 500px) {
          .main-menu-card {
            max-width: 900px !important;
            gap: 12px !important;
          }

          .menu-header-area {
            margin-bottom: 4px !important;
          }

          .menu-header-icon {
            width: 44px !important;
            height: 44px !important;
            font-size: 1.5rem !important;
            border-radius: 12px !important;
          }

          .menu-header-title {
            font-size: 1.9rem !important;
          }

          .menu-header-subtitle {
            font-size: 0.84em !important;
          }

          .menu-header-flex {
            gap: 12px !important;
          }

          .menu-content-grid {
            gap: 18px !important;
          }

          .menu-left-box {
            gap: 10px !important;
          }

          .menu-status-bar {
            padding: 10px 14px !important;
            border-radius: 12px !important;
          }

          .menu-status-text {
            font-size: 0.88em !important;
          }

          .menu-status-btn {
            padding: 4px 10px !important;
            font-size: 0.82em !important;
          }

          .training-section-label {
            font-size: 0.8em !important;
            margin-bottom: 6px !important;
          }

          .training-chips-grid {
            gap: 8px !important;
          }

          .training-chip {
            padding: 8px 6px !important;
            border-radius: 14px !important;
          }

          .training-chip-icon {
            font-size: 1.6rem !important;
          }

          .training-chip-title {
            font-size: 0.84em !important;
          }

          .menu-right-box {
            gap: 10px !important;
          }

          .menu-action-tile {
            padding: 12px 16px !important;
            border-radius: 14px !important;
          }

          .tile-icon {
            width: 42px !important;
            height: 42px !important;
            font-size: 1.8rem !important;
            border-radius: 12px !important;
          }

          .tile-title {
            font-size: 1.12em !important;
          }

          .tile-desc {
            font-size: 0.78em !important;
          }

          .tile-arrow {
            font-size: 1.25em !important;
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

        {/* ── Content Grid: Linke Box & Rechte Box ── */}
        <div className="menu-content-grid">
          {/* ── LINKE BOX: Oben Anmeldung, darunter Schnellstart Training ── */}
          <div className="menu-left-box">
            {/* Anmeldung / User-Status-Bar */}
            <div className="menu-status-container">
              <div className="menu-status-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: user ? 'var(--green)' : 'var(--orange)',
                    boxShadow: user ? '0 0 8px var(--green)' : '0 0 8px var(--orange)',
                    flexShrink: 0
                  }} />
                  <span className="menu-status-text">
                    {user ? (
                      <>Eingeloggt als <strong style={{ color: 'var(--blue)' }}>{user.user_metadata?.username || user.email}</strong></>
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
                    style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)' }}
                  >
                    Login / Registrieren
                  </button>
                )}
              </div>
            </div>

            {/* Schnellstart Training */}
            <div className="menu-training-container">
              <div className="training-section-label">
                Schnellstart Training
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
                  <span className="training-chip-title">Split Score</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RECHTE BOX: Die 3 Haupt-Buttons ── */}
          <div className="menu-right-box">
            {/* Offline Match */}
            <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.8vw, 16px)', minWidth: 0 }}>
                <div className="tile-icon" style={{ background: 'rgba(0, 210, 106, 0.15)' }}>
                  🎯
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="tile-title">
                    {user ? 'Offline Match' : 'Als Gast spielen'}
                  </div>
                  <div className="tile-desc">
                    X01, Sets/Legs, Training & Bots
                  </div>
                </div>
              </div>
              <div className="tile-arrow" style={{ color: 'var(--green)' }}>
                ➔
              </div>
            </div>

            {/* Online Multiplayer */}
            <div className="menu-action-tile tile-online" onClick={handleOnlineClick}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.8vw, 16px)', minWidth: 0 }}>
                <div className="tile-icon" style={{ background: 'rgba(10, 132, 255, 0.15)' }}>
                  🌍
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="tile-title">
                    Online Multiplayer
                  </div>
                  <div className="tile-desc">
                    Räume erstellen & global gegeneinander spielen
                  </div>
                </div>
              </div>
              <div className="tile-arrow" style={{ color: 'var(--blue)' }}>
                ➔
              </div>
            </div>

            {/* Stats or Auth */}
            {user ? (
              <div className="menu-action-tile tile-stats" onClick={() => navigate('/stats')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.8vw, 16px)', minWidth: 0 }}>
                  <div className="tile-icon" style={{ background: 'rgba(255, 159, 10, 0.15)' }}>
                    📊
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tile-title">
                      Statistiken & Profile
                    </div>
                    <div className="tile-desc">
                      Averages, Triple-Quoten, Radar & Historie
                    </div>
                  </div>
                </div>
                <div className="tile-arrow" style={{ color: 'var(--orange)' }}>
                  ➔
                </div>
              </div>
            ) : (
              <div className="menu-action-tile tile-auth" onClick={() => navigate('/auth')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 1.8vw, 16px)', minWidth: 0 }}>
                  <div className="tile-icon" style={{ background: 'rgba(94, 92, 230, 0.15)' }}>
                    🔑
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="tile-title">
                      Account erstellen / Login
                    </div>
                    <div className="tile-desc">
                      Profile anlegen & Statistiken dauerhaft sichern
                    </div>
                  </div>
                </div>
                <div className="tile-arrow" style={{ color: 'var(--purple)' }}>
                  ➔
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
