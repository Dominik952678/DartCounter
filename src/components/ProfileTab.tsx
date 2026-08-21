import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profile, MatchHistory } from '../types';
import { ProfileDashboard } from './ProfileDashboard';
import { exportElementAsImage } from '../utils/exportImage';
import { MatchImageExport } from './MatchImageExport';
import { useAuthStore } from '../store/useAuthStore';

interface ProfileTabProps {
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profiles,
  matches,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [newProfileName, setNewProfileName] = useState('');
  const [isBotChecked, setIsBotChecked] = useState(false);
  const [botLevel, setBotLevel] = useState<number>(3);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  const profileNames = Object.keys(profiles);

  if (!user) {
    return (
      <div className="screen active-screen" style={{ padding: '20px', paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card" style={{ maxWidth: '420px', width: '100%', padding: '36px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ marginBottom: '12px', fontSize: '1.6em', color: 'var(--text)' }}>
            Profile & Statistiken
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.95em', lineHeight: '1.5', marginBottom: '24px' }}>
            Als Gast spielst du mit temporären Namen ohne dauerhafte Speicherung.
            Erstelle dir einen kostenlosen Account, um:
          </p>

          <div style={{ textAlign: 'left', background: 'var(--surface)', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.9em' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> <strong>Eigene Spieler & Bots</strong> anlegen und verwalten
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> <strong>Averages, First 9 & Triple-Quoten</strong> dauerhaft speichern
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> <strong>Wurfradar & Kuchendiagramme</strong> für jedes Profil
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✅</span> <strong>Head-to-Head Duelle</strong> & Match-Historie
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button 
              className="btn-primary btn-large" 
              onClick={() => navigate('/auth')}
              style={{ fontSize: '1.1em' }}
            >
              🔑 Jetzt kostenlos anmelden
            </button>
            <button 
              className="btn-ghost" 
              onClick={() => navigate('/offline')}
              style={{ color: 'var(--text-dim)' }}
            >
              Weiter als Gast spielen
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateProfile = () => {
    const name = newProfileName.trim();
    if (!name) {
      setProfileError("Bitte gib einen Namen ein.");
      return;
    }
    if (profiles[name]) {
      setProfileError(`Ein Profil mit dem Namen "${name}" existiert bereits.`);
      return;
    }
    setProfileError(null);
    onCreateProfile(name, isBotChecked, isBotChecked ? (botLevel * 10 + 20) : undefined);
    setNewProfileName('');
    setIsBotChecked(false);
    setBotLevel(3);
  };



  if (showHistory) {
    return (
      <div className="screen active-screen app-container" style={{ position: 'relative', overflowX: 'hidden', paddingBottom: '120px' }}>
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(94, 92, 230, 0.12) 0%, rgba(10, 132, 255, 0.06) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div className="app-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', position: 'relative', zIndex: 1 }}>
          <button className="btn-ghost" onClick={() => setShowHistory(false)} style={{ padding: '6px 14px', fontSize: '0.9em' }}>
            &larr; Zurück
          </button>
          <h2 style={{ margin: 0, fontSize: '1.5em' }}>📜 Match Historie</h2>
          <div style={{ width: '60px' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          {matches.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
              <div style={{ fontSize: '2em', marginBottom: '10px' }}>🎯</div>
              <p>Noch keine Matches gespeichert.</p>
            </div>
          ) : (
            [...matches].reverse().map((m, i) => (
              <div key={i} id={`history-item-${i}`} className="history-item card" style={{ marginBottom: '10px' }}>
                <div className="history-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="history-winner" style={{ fontWeight: 'bold', color: profiles[m.winner]?.color || 'var(--blue)' }}>🏆 {m.winner}</span>
                  <span className="history-date" style={{ color: 'var(--text-dim)', fontSize: '0.85em' }}>{m.date}</span>
                </div>
                <div className="history-players">
                  {m.players.map((p, j) => (
                    <div key={j} style={{ borderBottom: j < m.players.length - 1 ? '1px solid var(--card-border)' : 'none', paddingBottom: '8px', marginBottom: '8px' }}>
                      <div className="history-player-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span className="history-player-name" style={{ flex: 2, color: profiles[p.name]?.color }}>{p.name}</span>
                        <span className="history-player-score" style={{ flex: 1, textAlign: 'center', fontWeight: 'bold' }}>{p.sets}:{p.legs}</span>
                        <span className="history-player-avg" style={{ flex: 1, textAlign: 'right', color: 'var(--text-dim)' }}>Ø {p.avg}</span>
                        <span className="history-player-f9" style={{ flex: 1, textAlign: 'right', color: 'var(--text-dim)' }}>F9: {p.first9}</span>
                      </div>
                      {p.legHistory && p.legHistory.length > 0 && (
                        <div style={{ fontSize: '0.75em', color: 'var(--text-dim)', marginTop: '4px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {p.legHistory.map((legAvg, li) => (
                            <span key={li} style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                              L{li+1}: Ø{legAvg}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '10px', textAlign: 'right' }}>
                  <button 
                    className="btn-ghost" 
                    style={{ fontSize: '0.85em', padding: '4px 8px' }}
                    onClick={() => exportElementAsImage(`export-node-${i}`, `Dartcounter-Match-${m.date.replace(/[^a-zA-Z0-9]/g, '-')}.png`)}
                  >
                    📸 Als Bild teilen
                  </button>
                  <div style={{ position: 'absolute', left: '-15000px', top: 0 }}>
                    <MatchImageExport matchData={m} profiles={profiles} exportId={`export-node-${i}`} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  if (viewProfile && profiles[viewProfile]) {
    return (
      <div className="screen active-screen app-container" style={{ position: 'relative', overflowX: 'hidden', paddingBottom: '120px' }}>
        <div style={{
          position: 'absolute',
          top: '-80px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '500px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(10, 132, 255, 0.12) 0%, rgba(94, 92, 230, 0.06) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <ProfileDashboard 
            profileName={viewProfile}
            profile={profiles[viewProfile]}
            allProfiles={profiles}
            matches={matches}
            onClose={() => setViewProfile(null)}
            onUpdateProfile={(name, updates) => onUpdateProfile(name, updates)}
            onDeleteProfile={(name) => {
              onDeleteProfile(name);
              setViewProfile(null);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        .hero-glow-bg-profile {
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 300px;
          background: radial-gradient(circle, rgba(94, 92, 230, 0.12) 0%, rgba(10, 132, 255, 0.06) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .profile-tab-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .profile-tab-grid {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            align-items: start;
          }
        }
      `}</style>

      <div className="hero-glow-bg-profile" />

      <div className="app-header">
        <h1>👤 Profile & Historie</h1>
        <p className="subtitle">Verwalte deine Spieler und Statistiken</p>
      </div>

      <div className="profile-tab-grid">
        <div className="card">
          <div className="card-header">
            <h2>Neues Profil erstellen</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: profileError ? '6px' : '12px' }}>
            <input 
              type="text" 
              placeholder="Spielername" 
              value={newProfileName} 
              onChange={(e) => {
                setNewProfileName(e.target.value);
                if (profileError) setProfileError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
            />
            <button className="btn-primary" onClick={handleCreateProfile} style={{ padding: '0 20px' }}>+</button>
          </div>

          {profileError && (
            <div style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.3)', color: 'var(--red)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85em', marginBottom: '12px' }}>
              ⚠️ {profileError}
            </div>
          )}
          
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '0.9em', color: 'var(--text-dim)' }}>
            <input 
              type="checkbox" 
              checked={isBotChecked} 
              onChange={(e) => setIsBotChecked(e.target.checked)} 
              style={{ width: 'auto', accentColor: 'var(--blue)' }}
            />
            Als Bot (Computergegner) erstellen
          </label>

          {isBotChecked && (
            <div style={{ marginTop: '10px' }}>
              <label className="section-label">Bot Level: {botLevel} (Avg: ~{botLevel * 10 + 20})</label>
              <input 
                type="range" 
                min="1" max="10" 
                value={botLevel} 
                onChange={(e) => setBotLevel(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Vorhandene Profile</h2>
            <span className="card-badge">{profileNames.length}</span>
          </div>
          
          {profileNames.length > 0 ? (
            <div className="profile-chips">
              {profileNames.map(name => (
                <button 
                  key={name} 
                  className="profile-chip" 
                  onClick={() => setViewProfile(name)}
                  style={{ borderLeftColor: profiles[name]?.color || 'var(--card-border)' }}
                >
                  {profiles[name]?.isBot ? '🤖 ' : '👤 '}{name}
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', textAlign: 'center', padding: '20px 0' }}>
              Noch keine Profile vorhanden. Erstelle jetzt dein erstes Profil!
            </p>
          )}

          <button className="btn-secondary" onClick={() => setShowHistory(true)} style={{ marginTop: '16px', width: '100%' }}>
            📜 Match Historie ansehen
          </button>
        </div>
      </div>



      {/* spacer for bottom nav */}
      <div style={{ height: '120px' }}></div>
    </div>
  );
};
