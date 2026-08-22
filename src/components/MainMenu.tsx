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
    <div className="screen active-screen main-menu-screen" style={{ width: '100%', minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflowX: 'hidden', boxSizing: 'border-box' }}>
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
        }
        .main-menu-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .menu-action-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
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
        .training-chip {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 14px;
          background: var(--surface);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text);
          font-size: 0.95em;
        }
        .training-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .training-chip:active {
          transform: scale(0.97);
        }

        /* ── Landscape Console Layout (Zero Scroll on Tablets & Phones in Landscape) ── */
        @media (orientation: landscape) {
          .main-menu-screen {
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
            padding: max(calc(env(safe-area-inset-top) + 4px), 8px) 16px max(calc(env(safe-area-inset-bottom) + 4px), 8px) !important;
          }
          .main-menu-card {
            max-width: 860px !important;
            height: 100% !important;
            justify-content: center !important;
            gap: 10px !important;
          }
          .main-menu-grid {
            display: grid !important;
            grid-template-columns: 1fr 1.15fr !important;
            gap: 14px !important;
            align-items: stretch !important;
          }
          .menu-col-left {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 10px;
          }
          .menu-col-right {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 10px;
          }
        }
        @media (orientation: landscape) and (max-height: 520px) {
          .main-menu-card {
            max-width: 800px !important;
            gap: 6px !important;
          }
          .main-menu-grid {
            gap: 10px !important;
          }
          .brand-icon {
            width: 42px !important;
            height: 42px !important;
            font-size: 1.4rem !important;
            margin-bottom: 4px !important;
            border-radius: 12px !important;
          }
          .brand-title {
            font-size: 1.6rem !important;
            line-height: 1.1 !important;
          }
          .brand-subtitle {
            font-size: 0.78em !important;
          }
          .user-status-bar {
            padding: 6px 10px !important;
            border-radius: 10px !important;
            font-size: 0.82em !important;
          }
          .menu-action-tile {
            padding: 8px 12px !important;
            border-radius: 12px !important;
          }
          .tile-icon {
            font-size: 1.6rem !important;
            width: 38px !important;
            height: 38px !important;
            border-radius: 10px !important;
          }
          .tile-title {
            font-size: 1.05em !important;
          }
          .tile-desc {
            font-size: 0.75em !important;
          }
          .training-chip {
            padding: 8px 4px !important;
            border-radius: 10px !important;
          }
        }
      `}</style>

      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        <div className="main-menu-grid">
          {/* Left Column (Brand + Status + Offline Match) */}
          <div className="menu-col-left">
            {/* Brand Header */}
            <div style={{ textAlign: 'center' }}>
              <div className="brand-icon" style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '56px', 
                height: '56px', 
                borderRadius: '18px', 
                background: 'linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(10, 132, 255, 0.2))', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 20px rgba(0,0,0,0.3)',
                marginBottom: '8px',
                fontSize: '1.8rem'
              }}>
                🎯
              </div>
              <h1 className="brand-title" style={{ fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--green), var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.15 }}>
                DARTCOUNTER
              </h1>
              <p className="brand-subtitle" style={{ color: 'var(--text-dim)', fontSize: '0.9em', marginTop: '3px', fontWeight: 500 }}>
                Scoring, Statistiken & Multiplayer
              </p>
            </div>

            {/* User Account / Guest Status Bar */}
            <div className="user-status-bar" style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '8px 14px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              backdropFilter: 'blur(12px)',
              borderRadius: '12px', 
              border: '1px solid var(--card-border)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                <span style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: user ? 'var(--green)' : 'var(--orange)',
                  boxShadow: user ? '0 0 8px var(--green)' : '0 0 8px var(--orange)',
                  flexShrink: 0
                }} />
                <span style={{ fontSize: '0.86em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.8em', fontWeight: 600, cursor: 'pointer', padding: '3px 6px', flexShrink: 0 }}
                >
                  Abmelden
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/auth')}
                  style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)', fontSize: '0.8em', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', padding: '4px 8px', flexShrink: 0 }}
                >
                  Login / Registrieren
                </button>
              )}
            </div>

            {/* Offline Match */}
            <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="tile-icon" style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 210, 106, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                  🎯
                </div>
                <div>
                  <div className="tile-title" style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                    {user ? 'Offline Match' : 'Als Gast spielen'}
                  </div>
                  <div className="tile-desc" style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                    X01, Sets/Legs, Training & Bots
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.3em', color: 'var(--green)', fontWeight: 700 }}>
                ➔
              </div>
            </div>
          </div>

          {/* Right Column (Online + Stats/Auth + Training) */}
          <div className="menu-col-right">
            {/* Online Multiplayer */}
            <div className="menu-action-tile tile-online" onClick={handleOnlineClick}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div className="tile-icon" style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 132, 255, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                  🌍
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="tile-title" style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                      Online Multiplayer
                    </span>
                  </div>
                  <div className="tile-desc" style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Räume erstellen & global spielen
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.3em', color: 'var(--blue)', fontWeight: 700 }}>
                ➔
              </div>
            </div>

            {/* Stats or Auth */}
            {user ? (
              <div className="menu-action-tile tile-stats" onClick={() => navigate('/stats')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="tile-icon" style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 159, 10, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                    📊
                  </div>
                  <div>
                    <div className="tile-title" style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                      Statistiken & Profile
                    </div>
                    <div className="tile-desc" style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Averages, Heatmap & Historie
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.3em', color: 'var(--orange)', fontWeight: 700 }}>
                  ➔
                </div>
              </div>
            ) : (
              <div className="menu-action-tile tile-auth" onClick={() => navigate('/auth')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div className="tile-icon" style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94, 92, 230, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                    🔑
                  </div>
                  <div>
                    <div className="tile-title" style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                      Account erstellen / Login
                    </div>
                    <div className="tile-desc" style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                      Profile anlegen & Cloud Sync
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '1.3em', color: 'var(--purple)', fontWeight: 700 }}>
                  ➔
                </div>
              </div>
            )}

            {/* Quick Training Shortcuts */}
            <div style={{ marginTop: '2px' }}>
              <div style={{ fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 700, paddingLeft: '2px' }}>
                Schnellstart Training
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=checkout')}
                  style={{ flexDirection: 'column', textAlign: 'center', padding: '10px 4px' }}
                >
                  <span style={{ fontSize: '1.4rem' }}>🎯</span>
                  <span style={{ fontWeight: 700, fontSize: '0.82em' }}>Checkout</span>
                </div>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
                  style={{ flexDirection: 'column', textAlign: 'center', padding: '10px 4px' }}
                >
                  <span style={{ fontSize: '1.4rem' }}>🔥</span>
                  <span style={{ fontWeight: 700, fontSize: '0.82em' }}>Scoring</span>
                </div>
                <div 
                  className="training-chip" 
                  onClick={() => navigate('/offline?tab=training&mode=splitscore')}
                  style={{ flexDirection: 'column', textAlign: 'center', padding: '10px 4px' }}
                >
                  <span style={{ fontSize: '1.4rem' }}>➗</span>
                  <span style={{ fontWeight: 700, fontSize: '0.82em' }}>Split Score</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
