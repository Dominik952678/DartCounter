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
    <div className="screen active-screen main-menu-wrapper" style={{ width: '100%', height: 'calc(100dvh - max(calc(env(safe-area-inset-bottom) + 72px), 80px))', maxHeight: 'calc(100dvh - max(calc(env(safe-area-inset-bottom) + 72px), 80px))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', boxSizing: 'border-box' }}>
      <style>{`
        .hero-glow-bg {
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 350px;
          background: radial-gradient(circle, rgba(0, 210, 106, 0.12) 0%, rgba(10, 132, 255, 0.08) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .main-menu-portrait {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 8px;
          box-sizing: border-box;
          padding: 4px 0;
        }
        .main-menu-landscape {
          display: none;
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 920px;
          height: 100%;
          box-sizing: border-box;
          padding: 4px 8px;
        }
        .menu-action-tile {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-radius: 14px;
          background: var(--card);
          border: 1px solid var(--card-border);
          cursor: pointer;
          transition: transform 0.15s ease, border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
          text-align: left;
          width: 100%;
          color: var(--text);
          box-sizing: border-box;
          flex: 1;
          min-height: 0;
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
          justify-content: center;
          gap: 6px;
          padding: 8px 4px;
          background: var(--surface);
          border: 1px solid var(--card-border);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text);
          font-size: 0.85em;
          box-sizing: border-box;
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
          .main-menu-wrapper {
            height: calc(100dvh - max(calc(env(safe-area-inset-bottom) + 50px), 56px)) !important;
            max-height: calc(100dvh - max(calc(env(safe-area-inset-bottom) + 50px), 56px)) !important;
          }
          .main-menu-portrait {
            display: none !important;
          }
          .main-menu-landscape {
            display: grid !important;
            grid-template-columns: 1fr 1.25fr;
            gap: 14px;
            align-items: stretch;
            height: 100%;
          }
          .landscape-left-pane {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 8px;
            height: 100%;
          }
          .landscape-right-pane {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 8px;
            height: 100%;
          }
          .landscape-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            flex: 1;
            min-height: 0;
          }
          .menu-action-tile {
            padding: 8px 12px;
          }
        }
      `}</style>

      <div className="hero-glow-bg" />

      {/* ── PORTRAIT MODE LAYOUT (100% Zero-Scroll) ── */}
      <div className="main-menu-portrait">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginTop: '2px', flexShrink: 0 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '46px', 
            height: '46px', 
            borderRadius: '14px', 
            background: 'linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(10, 132, 255, 0.2))', 
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
            marginBottom: '4px',
            fontSize: '1.5rem'
          }}>
            🎯
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--green), var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.1 }}>
            DARTCOUNTER
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.82em', marginTop: '2px', fontWeight: 500 }}>
            Scoring, Statistiken & Multiplayer
          </p>
        </div>

        {/* User Account / Guest Status Bar */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '6px 12px', 
          background: 'rgba(255, 255, 255, 0.03)', 
          backdropFilter: 'blur(12px)',
          borderRadius: '10px', 
          border: '1px solid var(--card-border)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, overflow: 'hidden' }}>
            <span style={{ 
              width: '7px', 
              height: '7px', 
              borderRadius: '50%', 
              backgroundColor: user ? 'var(--green)' : 'var(--orange)',
              boxShadow: user ? '0 0 8px var(--green)' : '0 0 8px var(--orange)',
              flexShrink: 0
            }} />
            <span style={{ fontSize: '0.82em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
              style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.78em', fontWeight: 600, cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}
            >
              Abmelden
            </button>
          ) : (
            <button 
              onClick={() => navigate('/auth')}
              style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)', fontSize: '0.78em', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}
            >
              Login
            </button>
          )}
        </div>

        {/* Primary Game Modes Grid (Flex-grow to smoothly fill vertical space) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0 }}>
          {/* Offline Match */}
          <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.6rem', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 210, 106, 0.15)', borderRadius: '10px', flexShrink: 0 }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '1.05em', fontWeight: 800, color: 'var(--text)' }}>
                  {user ? 'Offline Match' : 'Als Gast spielen'}
                </div>
                <div style={{ fontSize: '0.76em', color: 'var(--text-dim)', marginTop: '1px' }}>
                  X01, Sets/Legs, Training & Bots
                </div>
              </div>
            </div>
            <div style={{ fontSize: '1.2em', color: 'var(--green)', fontWeight: 700 }}>
              ➔
            </div>
          </div>

          {/* Online Multiplayer */}
          <div className="menu-action-tile tile-online" onClick={handleOnlineClick}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.6rem', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 132, 255, 0.15)', borderRadius: '10px', flexShrink: 0 }}>
                🌍
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '1.05em', fontWeight: 800, color: 'var(--text)' }}>
                    Online Multiplayer
                  </span>
                </div>
                <div style={{ fontSize: '0.76em', color: 'var(--text-dim)', marginTop: '1px' }}>
                  Räume erstellen & global spielen
                </div>
              </div>
            </div>
            <div style={{ fontSize: '1.2em', color: 'var(--blue)', fontWeight: 700 }}>
              ➔
            </div>
          </div>

          {/* Stats or Auth */}
          {user ? (
            <div className="menu-action-tile tile-stats" onClick={() => navigate('/stats')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '1.6rem', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 159, 10, 0.15)', borderRadius: '10px', flexShrink: 0 }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: '1.05em', fontWeight: 800, color: 'var(--text)' }}>
                    Statistiken & Profile
                  </div>
                  <div style={{ fontSize: '0.76em', color: 'var(--text-dim)', marginTop: '1px' }}>
                    Averages, Heatmap & Historie
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.2em', color: 'var(--orange)', fontWeight: 700 }}>
                ➔
              </div>
            </div>
          ) : (
            <div className="menu-action-tile tile-auth" onClick={() => navigate('/auth')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '1.6rem', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94, 92, 230, 0.15)', borderRadius: '10px', flexShrink: 0 }}>
                  🔑
                </div>
                <div>
                  <div style={{ fontSize: '1.05em', fontWeight: 800, color: 'var(--text)' }}>
                    Account erstellen / Login
                  </div>
                  <div style={{ fontSize: '0.76em', color: 'var(--text-dim)', marginTop: '1px' }}>
                    Profile anlegen & Cloud Sync
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.2em', color: 'var(--purple)', fontWeight: 700 }}>
                ➔
              </div>
            </div>
          )}
        </div>

        {/* Quick Training Shortcuts */}
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 700, paddingLeft: '2px' }}>
            Schnellstart Training
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=checkout')}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '6px 4px' }}
            >
              <span style={{ fontSize: '1.2rem' }}>🎯</span>
              <span style={{ fontWeight: 700, fontSize: '0.78em' }}>Checkout</span>
            </div>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '6px 4px' }}
            >
              <span style={{ fontSize: '1.2rem' }}>🔥</span>
              <span style={{ fontWeight: 700, fontSize: '0.78em' }}>Scoring</span>
            </div>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=splitscore')}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '6px 4px' }}
            >
              <span style={{ fontSize: '1.2rem' }}>➗</span>
              <span style={{ fontWeight: 700, fontSize: '0.78em' }}>Split Score</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── LANDSCAPE MODE LAYOUT (Widescreen Console UI with Zero-Scroll) ── */}
      <div className="main-menu-landscape">
        {/* Left Pane: Branding + Status + Training */}
        <div className="landscape-left-pane">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                width: '42px', 
                height: '42px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, rgba(0, 210, 106, 0.2), rgba(10, 132, 255, 0.2))', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                fontSize: '1.4rem',
                flexShrink: 0
              }}>
                🎯
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--green), var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.1 }}>
                  DARTCOUNTER
                </h1>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.78em', marginTop: '1px', fontWeight: 500 }}>
                  Scoring & Multiplayer
                </p>
              </div>
            </div>

            {/* Status Bar */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '6px 10px', 
              background: 'rgba(255, 255, 255, 0.03)', 
              backdropFilter: 'blur(12px)',
              borderRadius: '10px', 
              border: '1px solid var(--card-border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
                <span style={{ 
                  width: '6px', 
                  height: '6px', 
                  borderRadius: '50%', 
                  backgroundColor: user ? 'var(--green)' : 'var(--orange)',
                  boxShadow: user ? '0 0 6px var(--green)' : '0 0 6px var(--orange)',
                  flexShrink: 0
                }} />
                <span style={{ fontSize: '0.78em', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user ? user.user_metadata?.username || user.email : 'Modus: Gast'}
                </span>
              </div>
              {user ? (
                <button 
                  onClick={() => { signOut(); navigate('/'); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.74em', fontWeight: 600, cursor: 'pointer', padding: '2px 4px', flexShrink: 0 }}
                >
                  Abmelden
                </button>
              ) : (
                <button 
                  onClick={() => navigate('/auth')}
                  style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)', fontSize: '0.74em', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}
                >
                  Login
                </button>
              )}
            </div>
          </div>

          {/* Quick Training Chips */}
          <div>
            <div style={{ fontSize: '0.72em', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', marginBottom: '4px', fontWeight: 700, paddingLeft: '2px' }}>
              Schnellstart Training
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <div 
                className="training-chip" 
                onClick={() => navigate('/offline?tab=training&mode=checkout')}
                style={{ flexDirection: 'column', textAlign: 'center', padding: '6px 4px' }}
              >
                <span style={{ fontSize: '1.15rem' }}>🎯</span>
                <span style={{ fontWeight: 700, fontSize: '0.75em' }}>Checkout</span>
              </div>
              <div 
                className="training-chip" 
                onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
                style={{ flexDirection: 'column', textAlign: 'center', padding: '6px 4px' }}
              >
                <span style={{ fontSize: '1.15rem' }}>🔥</span>
                <span style={{ fontWeight: 700, fontSize: '0.75em' }}>Scoring</span>
              </div>
              <div 
                className="training-chip" 
                onClick={() => navigate('/offline?tab=training&mode=splitscore')}
                style={{ flexDirection: 'column', textAlign: 'center', padding: '6px 4px' }}
              >
                <span style={{ fontSize: '1.15rem' }}>➗</span>
                <span style={{ fontWeight: 700, fontSize: '0.75em' }}>Split</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Pane: Hero Offline Tile + Row with Online & Stats */}
        <div className="landscape-right-pane">
          {/* Offline Match (Hero Card) */}
          <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')} style={{ flex: 1.15 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '1.8rem', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 210, 106, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '1.1em', fontWeight: 800, color: 'var(--text)' }}>
                  {user ? 'Offline Match' : 'Als Gast spielen'}
                </div>
                <div style={{ fontSize: '0.78em', color: 'var(--text-dim)', marginTop: '2px' }}>
                  X01, Sets/Legs, Training & Bots
                </div>
              </div>
            </div>
            <div style={{ fontSize: '1.3em', color: 'var(--green)', fontWeight: 700 }}>
              ➔
            </div>
          </div>

          {/* 2 Tiles Side-by-Side: Online + Stats/Auth */}
          <div className="landscape-row">
            {/* Online Multiplayer */}
            <div className="menu-action-tile tile-online" onClick={handleOnlineClick}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '1.5rem', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 132, 255, 0.15)', borderRadius: '8px', flexShrink: 0 }}>
                  🌍
                </div>
                <div>
                  <div style={{ fontSize: '0.95em', fontWeight: 800, color: 'var(--text)' }}>
                    Multiplayer
                  </div>
                  <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: '1px' }}>
                    Online Räume
                  </div>
                </div>
              </div>
            </div>

            {/* Stats or Auth */}
            {user ? (
              <div className="menu-action-tile tile-stats" onClick={() => navigate('/stats')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '1.5rem', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 159, 10, 0.15)', borderRadius: '8px', flexShrink: 0 }}>
                    📊
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95em', fontWeight: 800, color: 'var(--text)' }}>
                      Statistiken
                    </div>
                    <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: '1px' }}>
                      Profile & Heatmap
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="menu-action-tile tile-auth" onClick={() => navigate('/auth')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '1.5rem', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94, 92, 230, 0.15)', borderRadius: '8px', flexShrink: 0 }}>
                    🔑
                  </div>
                  <div>
                    <div style={{ fontSize: '0.95em', fontWeight: 800, color: 'var(--text)' }}>
                      Account
                    </div>
                    <div style={{ fontSize: '0.72em', color: 'var(--text-dim)', marginTop: '1px' }}>
                      Login & Sync
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
