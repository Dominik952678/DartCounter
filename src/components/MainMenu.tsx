import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION, BUILD_TIME } from '../version';

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

        /* ── Fluid, Dynamic Main Card (Full height above navbar) ── */
        .main-menu-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: min(500px, 100%);
          min-height: calc(100dvh - max(calc(env(safe-area-inset-top) + 8px), 12px) - max(calc(env(safe-area-inset-bottom) + 64px), 74px));
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          transition: all 0.2s ease;
        }

        /* ── Header Area (Ganz oben fest) ── */
        .menu-header-area {
          flex-shrink: 0;
          width: 100%;
          text-align: center;
          margin-top: clamp(2px, 0.8vh, 6px);
          margin-bottom: clamp(4px, 1vh, 8px);
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
          width: clamp(44px, 6vh, 60px);
          height: clamp(44px, 6vh, 60px);
          border-radius: clamp(12px, 1.8vh, 18px);
          background: linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(10, 132, 255, 0.2));
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
          margin-bottom: clamp(4px, 0.8vh, 10px);
          font-size: clamp(1.4rem, 2.4vh, 1.9rem);
        }

        .menu-header-title {
          font-size: clamp(1.7rem, 3vh, 2.3rem);
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
          font-size: clamp(0.78em, 1.3vh, 0.92em);
          margin-top: clamp(1px, 0.3vh, 3px);
          font-weight: 500;
        }

        /* ── Vertically Centered Middle Wrapper ── */
        .menu-middle-wrapper {
          flex: 1;
          min-height: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        /* ── Content Grid Hierarchy ── */
        .menu-content-grid {
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 1.4vh, 12px);
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
          gap: clamp(6px, 1.2vh, 10px);
        }

        .menu-action-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: clamp(10px, 1.8vh, 16px) clamp(12px, 1.8vw, 18px);
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
          width: clamp(36px, 5vh, 44px);
          height: clamp(36px, 5vh, 44px);
          font-size: clamp(1.5rem, 2.4vh, 2rem);
          border-radius: clamp(9px, 1.3vh, 12px);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .tile-title {
          font-size: clamp(1.02em, 1.7vh, 1.2em);
          font-weight: 800;
          color: var(--text);
        }

        .tile-desc {
          font-size: clamp(0.74em, 1.2vh, 0.82em);
          color: var(--text-dim);
          margin-top: 2px;
        }

        .tile-arrow {
          font-size: clamp(1.15em, 1.8vh, 1.35em);
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
          margin-top: clamp(0px, 0.4vh, 3px);
        }

        .training-section-label {
          font-size: clamp(0.72em, 1.2vh, 0.78em);
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--text-dim);
          margin-bottom: clamp(4px, 0.8vh, 8px);
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
          padding: clamp(8px, 1.3vh, 11px) clamp(4px, 1vw, 8px);
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
          font-size: clamp(1.3rem, 2.2vh, 1.55rem);
        }

        .training-chip-title {
          font-weight: 700;
          font-size: clamp(0.75em, 1.3vh, 0.84em);
          margin-top: 2px;
        }

        /* ── iPad in Portrait (Non-scrollable, perfectly fitted) ── */
        @media (min-width: 768px) and (orientation: portrait) {
          .main-menu-screen {
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            overscroll-behavior: none !important;
          }

          .main-menu-card {
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            overflow: hidden !important;
          }
        }

        /* ── Landscape / Wide Mode (Fluid dynamic scaling & zero scroll) ── */
        @media (orientation: landscape) {
          .main-menu-screen {
            height: 100% !important;
            max-height: 100% !important;
            overflow: hidden !important;
            overscroll-behavior: none !important;
            touch-action: manipulation !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
          }

          .main-menu-card {
            height: 100% !important;
            max-height: 100% !important;
            min-height: 0 !important;
            max-width: min(1060px, 94vw) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            gap: 0 !important;
          }

          .menu-header-area {
            flex-shrink: 0 !important;
            width: 100% !important;
            text-align: center;
            margin-top: 0 !important;
            margin-bottom: clamp(2px, 0.8vh, 8px) !important;
          }

          .menu-header-icon {
            width: clamp(34px, 5.5vh, 52px) !important;
            height: clamp(34px, 5.5vh, 52px) !important;
            font-size: clamp(1.2rem, 2.2vh, 1.8rem) !important;
            margin-bottom: 0 !important;
            border-radius: clamp(8px, 1.2vh, 14px) !important;
          }

          .menu-header-title {
            font-size: clamp(1.4rem, 3.2vh, 2.2rem) !important;
            line-height: 1.1 !important;
          }

          .menu-header-subtitle {
            font-size: clamp(0.72em, 1.2vh, 0.88em) !important;
            margin-top: 1px !important;
          }

          .menu-header-flex {
            display: inline-flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: clamp(8px, 1.5vw, 14px);
          }

          .menu-middle-wrapper {
            flex: 1 !important;
            min-height: 0 !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            align-items: center !important;
          }

          .menu-content-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: clamp(10px, 2vw, 22px) !important;
            align-items: stretch !important;
            width: 100% !important;
          }

          .menu-left-box {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            height: 100% !important;
            gap: clamp(6px, 1.2vh, 12px) !important;
          }

          .menu-status-container {
            order: unset !important;
          }

          .menu-status-bar {
            padding: clamp(6px, 1.2vh, 12px) clamp(10px, 1.6vw, 16px) !important;
            border-radius: clamp(10px, 1.4vh, 14px) !important;
          }

          .menu-status-text {
            font-size: clamp(0.8em, 1.3vh, 0.95em) !important;
          }

          .menu-status-btn {
            font-size: clamp(0.76em, 1.2vh, 0.86em) !important;
            padding: clamp(3px, 0.5vh, 5px) clamp(6px, 1vw, 12px) !important;
          }

          .menu-training-container {
            order: unset !important;
            margin-top: 0 !important;
          }

          .training-section-label {
            font-size: clamp(0.72em, 1.1vh, 0.82em) !important;
            margin-bottom: clamp(2px, 0.5vh, 6px) !important;
          }

          .training-chips-grid {
            gap: clamp(6px, 1vw, 10px) !important;
          }

          .training-chip {
            aspect-ratio: 1 / 1 !important;
            padding: clamp(6px, 1.2vh, 14px) clamp(4px, 0.8vw, 10px) !important;
            border-radius: clamp(10px, 1.5vh, 16px) !important;
          }

          .training-chip-icon {
            font-size: clamp(1.3rem, 2.4vh, 2rem) !important;
          }

          .training-chip-title {
            font-size: clamp(0.75em, 1.3vh, 0.88em) !important;
          }

          .menu-right-box {
            order: unset !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            gap: clamp(6px, 1.2vh, 12px) !important;
            height: 100% !important;
          }

          .menu-action-tile {
            padding: clamp(8px, 1.6vh, 18px) clamp(12px, 1.8vw, 22px) !important;
            border-radius: clamp(10px, 1.6vh, 16px) !important;
          }

          .tile-icon {
            width: clamp(34px, 5vh, 48px) !important;
            height: clamp(34px, 5vh, 48px) !important;
            font-size: clamp(1.3rem, 2.2vh, 1.9rem) !important;
            border-radius: clamp(8px, 1.2vh, 12px) !important;
          }

          .tile-title {
            font-size: clamp(0.98em, 1.7vh, 1.22em) !important;
          }

          .tile-desc {
            font-size: clamp(0.72em, 1.2vh, 0.82em) !important;
          }

          .tile-arrow {
            font-size: clamp(1.15em, 1.8vh, 1.35em) !important;
          }
        }
      `}</style>

      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        {/* ── Brand Header (Fest oben arretiert) ── */}
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

        {/* ── Vertikal mittig zentrierter Bereich ── */}
        <div className="menu-middle-wrapper">
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

          {/* ── Version & Update Badge ── */}
          <div 
            style={{ 
              marginTop: 'clamp(6px, 1vh, 12px)', 
              padding: '4px 10px', 
              borderRadius: '12px', 
              background: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px', 
              fontSize: '0.72rem', 
              color: 'var(--text-dim)',
              userSelect: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              if (window.confirm(`DartCounter ${APP_VERSION}\nBuild: ${BUILD_TIME}\n\nMöchtest du die App neu laden und den Zwischenspeicher (Cache) aktualisieren?`)) {
                window.location.reload();
              }
            }}
            title="Klicken zum Neuladen / Cache leeren"
          >
            <span style={{ 
              width: '6px', 
              height: '6px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--green)', 
              boxShadow: '0 0 6px var(--green)' 
            }} />
            <span>DartCounter {APP_VERSION}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ opacity: 0.7 }}>Build {BUILD_TIME}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
