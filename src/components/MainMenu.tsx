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
    <div className="screen active-screen" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px 60px', position: 'relative', overflowX: 'hidden' }}>
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
          padding: 14px 16px;
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
      `}</style>

      <div className="hero-glow-bg" />

      <div className="main-menu-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '8px' }}>
          <div style={{ 
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
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, var(--green), var(--blue))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            DARTCOUNTER
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95em', marginTop: '4px', fontWeight: 500 }}>
            Scoring, Statistiken & Multiplayer
          </p>
        </div>

        {/* User Account / Guest Status Bar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: user ? 'var(--green)' : 'var(--orange)',
              boxShadow: user ? '0 0 8px var(--green)' : '0 0 8px var(--orange)'
            }} />
            <span style={{ fontSize: '0.88em', color: 'var(--text)' }}>
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
              style={{ background: 'transparent', border: 'none', color: 'var(--red)', fontSize: '0.82em', fontWeight: 600, cursor: 'pointer', padding: '4px 8px' }}
            >
              Abmelden
            </button>
          ) : (
            <button 
              onClick={() => navigate('/auth')}
              style={{ background: 'rgba(10, 132, 255, 0.15)', border: '1px solid rgba(10, 132, 255, 0.3)', color: 'var(--blue)', fontSize: '0.82em', fontWeight: 700, borderRadius: '8px', cursor: 'pointer', padding: '4px 10px' }}
            >
              Login / Registrieren
            </button>
          )}
        </div>

        {/* Primary Game Modes Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
          {/* Offline Match */}
          <div className="menu-action-tile tile-offline" onClick={() => navigate('/offline')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 210, 106, 0.15)', borderRadius: '12px' }}>
                🎯
              </div>
              <div>
                <div style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                  {user ? 'Offline Match' : 'Als Gast spielen'}
                </div>
                <div style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
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
              <div style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10, 132, 255, 0.15)', borderRadius: '12px' }}>
                🌍
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                    Online Multiplayer
                  </span>
                </div>
                <div style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
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
                <div style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 159, 10, 0.15)', borderRadius: '12px' }}>
                  📊
                </div>
                <div>
                  <div style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                    Statistiken & Profile
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
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
                <div style={{ fontSize: '2.2rem', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(94, 92, 230, 0.15)', borderRadius: '12px' }}>
                  🔑
                </div>
                <div>
                  <div style={{ fontSize: '1.25em', fontWeight: 800, color: 'var(--text)' }}>
                    Account erstellen / Login
                  </div>
                  <div style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '2px' }}>
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

        {/* Quick Training Shortcuts */}
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '0.8em', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 700, paddingLeft: '4px' }}>
            Schnellstart Training
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=checkout')}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '12px 6px' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🎯</span>
              <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Checkout</span>
            </div>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=powerscoring')}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '12px 6px' }}
            >
              <span style={{ fontSize: '1.5rem' }}>🔥</span>
              <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Scoring</span>
            </div>
            <div 
              className="training-chip" 
              onClick={() => navigate('/offline?tab=training&mode=splitscore')}
              style={{ flexDirection: 'column', textAlign: 'center', padding: '12px 6px' }}
            >
              <span style={{ fontSize: '1.5rem' }}>➗</span>
              <span style={{ fontWeight: 700, fontSize: '0.85em' }}>Split Score</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
