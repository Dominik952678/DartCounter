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
          display: grid;
          grid-template-columns: 1fr;
          grid-template-areas:
            "header"
            "status"
            "modes"
            "training";
          gap: 12px;
          transition: all 0.2s ease;
        }
        .menu-header-area {
          grid-area: header;
          text-align: center;
          margin-top: 4px;
        }
        .menu-header-flex {
          display: block;
        }
        .menu-status-area {
          grid-area: status;
        }
        .menu-modes-area {
          grid-area: modes;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .menu-training-area {
          grid-area: training;
          margin-top: 2px;
        }
        .training-chips-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
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
          justify-content: center;
          gap: 8px;
          padding: 10px 8px;
          background: var(--surface);
          border: 1px solid var(--card-border);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          color: var(--text);
          font-size: 0.88em;
          box-sizing: border-box;
        }
        .training-chip:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-2px);
        }
        .training-chip:active {
          transform: scale(0.97);
        }

        /* ── Landscape Widescreen Mode (Left: Training & Header, Right: Modes) ── */
        @media (orientation: landscape) and (min-width: 540px), (min-width: 860px) {
          .main-menu-card {
            max-width: 840px;
            grid-template-columns: 1fr 1.2fr;
            grid-template-areas:
              "header modes"
              "status modes"
              "training modes";
            gap: 10px 18px;
            align-items: start;
          }
          .menu-header-area {
            text-align: left;
            margin-top: 0;
          }
          .menu-header-flex {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .menu-header-icon {
            width: 44px !important;
            height: 44px !important;
            font-size: 1.5rem !important;
            margin-bottom: 0 !important;
          }
          .menu-header-title {
            font-size: 1.8rem !important;
            line-height: 1.1 !important;
          }
          .training-chips-grid {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .training-chip {
            flex-direction: row !important;
            justify-content: flex-start !important;
            padding: 8px 12px !important;
            gap: 10px !important;
            text-align: left !important;
          }
          .training-chip span:first-child {
            font-size: 1.3rem !important;
          }
          .menu-action-tile {
            padding: 12px 16px;
          }
        }
      `}</style>

      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        {/* Brand Header Area */}
        <div className="menu-header-area">
          <div className="menu-header-flex">
            <div className="menu-header-icon" style={{ 
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
            <div>
              <h1 className="menu-header-title" style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--green), var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0, lineHeight: 1.15 }}>
                DARTCOUNTER
              </h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.88em', marginTop: '2px', fontWeight: 500 }}>
                Scoring, Statistiken & Multiplayer
              </p>
            </div>
          </div>
        </div>

        {/* User Account / Guest Status Bar Area */}
        <div className="menu-status-area" style={{ 
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
              style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)', fontSize: '0.8em', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', padding: '3px 8px', flexShrink: 0 }}
            >
              Login
            </button>
          )}
        </div>

        {/* Primary Game Modes Grid Area (Right Column on Landscape) */}
        <div className="menu-modes-area">
          {/* Offline Match */}
          <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 210, 106, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                  {user ? 'Offline Match' : 'Als Gast spielen'}
                </div>
                <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                  X01, Sets/Legs, Training & Bots
                </div>
              </div>
            </div>
            <div style={{ fontSize: '1.3em', color: 'var(--green)', fontWeight: 700 }}>
              ➔
            </div>
          </div>

          {/* Online Multiplayer */}
          <div className="menu-action-tile tile-online" onClick={handleOnlineClick}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 132, 255, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                🌍
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                    Online Multiplayer
                  </span>
                </div>
                <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Räume erstellen & global gegeneinander spielen
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
                <div style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 159, 10, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                    Statistiken & Profile
                  </div>
                  <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Averages, Triple-Quoten, Radar & Historie
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
                <div style={{ fontSize: '2rem', width: '44px', height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94, 92, 230, 0.15)', borderRadius: '12px', flexShrink: 0 }}>
                  🔑
                </div>
                <div>
                  <div style={{ fontSize: '1.2em', fontWeight: 800, color: 'var(--text)' }}>
                    Account erstellen / Login
                  </div>
                  <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Profile anlegen & Statistiken dauerhaft sichern
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.3em', color: 'var(--purple)', fontWeight: 700 }}>
                ➔
              </div>
            </div>
          )}
        </div>

        {/* Quick Training Shortcuts Area (Left Column under Status on Landscape) */}
        <div className="menu-training-area">
          <div style={{ fontSize: '0.78em', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-dim)', marginBottom: '6px', fontWeight: 700, paddingLeft: '2px' }}>
            Schnellstart Training
          </div>
          <div className="training-chips-grid">
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=checkout')}
            >
              <span style={{ fontSize: '1.3rem' }}>🎯</span>
              <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Checkout Training</span>
            </div>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
            >
              <span style={{ fontSize: '1.3rem' }}>🔥</span>
              <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Power Scoring</span>
            </div>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=splitscore')}
            >
              <span style={{ fontSize: '1.3rem' }}>➗</span>
              <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Split Score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
