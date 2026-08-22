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
          width: 500px;
          height: 350px;
          background: radial-gradient(circle, rgba(0, 210, 106, 0.12) 0%, rgba(10, 132, 255, 0.08) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .main-menu-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          transition: all 0.2s ease;
        }

        .menu-header-area {
          text-align: center;
          margin-top: 10px;
          margin-bottom: 8px;
        }

        .menu-content-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
        }

        .menu-left-box {
          display: contents;
        }

        .menu-status-container {
          order: 1;
        }

        .menu-right-box {
          order: 2;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .menu-training-container {
          order: 3;
          margin-top: 0;
        }

        .training-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .training-chip {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 6px;
          background: var(--surface);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text);
          box-sizing: border-box;
          text-align: center;
        }

        .training-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }

        .training-chip:active {
          transform: scale(0.97);
        }

        .menu-action-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 20px;
          border-radius: 16px;
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

        /* ── Compact iPhone Scaling (<= 500px: Zero-Scroll Guarantee) ── */
        @media (max-width: 500px) {
          .main-menu-card {
            gap: 8px;
          }
          .menu-content-grid {
            gap: 8px;
          }
          .menu-header-icon {
            width: 44px !important;
            height: 44px !important;
            font-size: 1.45rem !important;
          }
          .menu-header-subtitle {
            font-size: 0.8em !important;
            margin-top: 1px !important;
          }
          .menu-status-container > div {
            padding: 6px 12px !important;
            border-radius: 10px !important;
          }
          .menu-status-container span {
            font-size: 0.82em !important;
          }
          .menu-right-box {
            gap: 8px !important;
          }
          .menu-action-tile {
            padding: 10px 14px !important;
            border-radius: 12px !important;
          }
          .training-chip span:last-child {
            font-size: 0.76em !important;
          }
        }

        /* ── Landscape Widescreen Mode (Logo Top Center | Left Box == Right Box Exactly Aligned) ── */
        @media (orientation: landscape) and (min-width: 540px), (min-width: 860px) {
          .main-menu-card {
            max-width: 900px;
            gap: 10px;
          }
          .menu-header-area {
            text-align: center;
            margin-top: 0;
            margin-bottom: 2px;
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
            align-items: center;
            justify-content: center;
            gap: 10px;
          }

          .menu-content-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 16px !important;
            align-items: stretch !important;
          }

          .menu-left-box {
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            gap: 10px !important;
            height: 100% !important;
          }

          .menu-status-container {
            order: unset !important;
          }
          .menu-status-container > div {
            padding: 8px 12px !important;
          }

          .menu-training-container {
            order: unset !important;
            margin-top: 0 !important;
          }
          .training-chips-grid {
            gap: 8px !important;
          }
          .training-chip {
            aspect-ratio: 1 / 1 !important;
            padding: 8px 4px !important;
            border-radius: 14px !important;
          }

          .menu-right-box {
            order: unset !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            gap: 8px !important;
            height: 100% !important;
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
        }

        /* ── iPad & Tablet Enhancements (>= 768px: Fill space luxuriously) ── */
        @media (min-width: 768px) {
          .main-menu-card {
            max-width: 680px;
            gap: 16px;
          }
          .menu-header-icon {
            width: 64px !important;
            height: 64px !important;
            font-size: 2.1rem !important;
            margin-bottom: 6px !important;
          }
          .menu-header-title {
            font-size: 2.5rem !important;
          }
          .menu-header-subtitle {
            font-size: 0.95em !important;
          }
          .menu-status-container > div {
            padding: 10px 16px !important;
            border-radius: 14px !important;
          }
          .menu-status-container span {
            font-size: 0.92em !important;
          }
          .menu-right-box {
            gap: 12px !important;
          }
          .menu-action-tile {
            padding: 18px 22px !important;
            border-radius: 16px !important;
          }
        }

        @media (min-width: 768px) and (orientation: landscape) {
          .main-menu-card {
            max-width: 1000px !important;
            gap: 14px !important;
          }
          .menu-content-grid {
            gap: 24px !important;
          }
          .menu-header-icon {
            width: 48px !important;
            height: 48px !important;
            font-size: 1.6rem !important;
          }
          .menu-header-title {
            font-size: 2rem !important;
          }
          .menu-header-subtitle {
            font-size: 0.88em !important;
          }
          .training-chip {
            padding: 14px 10px !important;
          }
          .menu-action-tile {
            padding: 14px 18px !important;
          }
        }
      `}</style>

      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        {/* ── Brand Header (Ganz oben zentriert) ── */}
        <div className="menu-header-area">
          <div className="menu-header-flex">
            <div className="menu-header-icon" style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              width: '64px', 
              height: '64px', 
              borderRadius: '20px', 
              background: 'linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(10, 132, 255, 0.2))', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              boxShadow: '0 8px 20px rgba(0,0,0,0.3)', 
              marginBottom: '12px', 
              fontSize: '2rem' 
            }}>
              🎯
            </div>
            <div>
              <h1 className="menu-header-title" style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--green), var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.15 }}>
                DARTCOUNTER
              </h1>
              <p className="menu-header-subtitle" style={{ color: 'var(--text-dim)', fontSize: '0.95em', marginTop: '4px', fontWeight: 500 }}>
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
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '10px 16px', 
                background: 'rgba(255, 255, 255, 0.03)', 
                backdropFilter: 'blur(12px)',
                borderRadius: '14px', 
                border: '1px solid var(--card-border)' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, overflow: 'hidden' }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: user ? 'var(--green)' : 'var(--orange)',
                    boxShadow: user ? '0 0 8px var(--green)' : '0 0 8px var(--orange)',
                    flexShrink: 0
                  }} />
                  <span style={{ fontSize: '0.88em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                    style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.82em', fontWeight: 600, cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                  >
                    Abmelden
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate('/auth')}
                    style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)', fontSize: '0.82em', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', padding: '4px 10px', flexShrink: 0 }}
                  >
                    Login / Registrieren
                  </button>
                )}
              </div>
            </div>

            {/* Schnellstart Training */}
            <div className="menu-training-container">
              <div style={{ fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 700, paddingLeft: '4px' }}>
                Schnellstart Training
              </div>
              <div className="training-chips-grid">
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=checkout')}
                >
                  <span style={{ fontSize: '1.5rem' }}>🎯</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Checkout</span>
                </div>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
                >
                  <span style={{ fontSize: '1.5rem' }}>🔥</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Scoring</span>
                </div>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=splitscore')}
                >
                  <span style={{ fontSize: '1.5rem' }}>➗</span>
                  <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Split Score</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── RECHTE BOX: Die 3 Haupt-Buttons ── */}
          <div className="menu-right-box">
            {/* Offline Match */}
            <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="tile-icon" style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 210, 106, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                  🎯
                </div>
                <div>
                  <div className="tile-title" style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                    {user ? 'Offline Match' : 'Als Gast spielen'}
                  </div>
                  <div className="tile-desc" style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
                    X01, Sets/Legs, Training & Bots
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.4em', color: 'var(--green)', fontWeight: 700 }}>
                ➔
              </div>
            </div>

            {/* Online Multiplayer */}
            <div className="menu-action-tile tile-online" onClick={handleOnlineClick}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div className="tile-icon" style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 132, 255, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                  🌍
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tile-title" style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                      Online Multiplayer
                    </span>
                  </div>
                  <div className="tile-desc" style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Räume erstellen & global gegeneinander spielen
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.4em', color: 'var(--blue)', fontWeight: 700 }}>
                ➔
              </div>
            </div>

            {/* Stats or Auth */}
            {user ? (
              <div className="menu-action-tile tile-stats" onClick={() => navigate('/stats')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="tile-icon" style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 159, 10, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                    📊
                  </div>
                  <div>
                    <div className="tile-title" style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                      Statistiken & Profile
                    </div>
                    <div className="tile-desc" style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Averages, Triple-Quoten, Radar & Historie
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.4em', color: 'var(--orange)', fontWeight: 700 }}>
                  ➔
                </div>
              </div>
            ) : (
              <div className="menu-action-tile tile-auth" onClick={() => navigate('/auth')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div className="tile-icon" style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94, 92, 230, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                    🔑
                  </div>
                  <div>
                    <div className="tile-title" style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                      Account erstellen / Login
                    </div>
                    <div className="tile-desc" style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Profile anlegen & Statistiken dauerhaft sichern
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.4em', color: 'var(--purple)', fontWeight: 700 }}>
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
