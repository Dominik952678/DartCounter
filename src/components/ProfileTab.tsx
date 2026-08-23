import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profile, MatchHistory } from '../types';
import { ProfileDashboard } from './ProfileDashboard';
import { DartboardHeatmap } from './DartboardHeatmap';
import { exportElementAsImage } from '../utils/exportImage';
import { MatchImageExport } from './MatchImageExport';
import { useAuthStore } from '../store/useAuthStore';
import { APP_VERSION, BUILD_TIME } from '../version';

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
  const [previewProfile, setPreviewProfile] = useState<string>(
    user?.user_metadata?.username && profiles[user.user_metadata.username] 
      ? user.user_metadata.username 
      : profileNames[0] || ''
  );

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

      {!user && (
        <div style={{
          background: 'rgba(10, 132, 255, 0.1)',
          border: '1px solid rgba(10, 132, 255, 0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '0.82em', color: 'var(--text)' }}>
            💡 <strong>Gast-Modus:</strong> Profile & Statistiken werden lokal auf diesem Gerät gespeichert.
          </span>
          <button 
            className="btn-primary"
            onClick={() => navigate('/auth')}
            style={{ padding: '4px 12px', fontSize: '0.78em', minHeight: '30px' }}
          >
            🔑 Cloud-Login
          </button>
        </div>
      )}

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

      {/* 2D Dartboard Heatmap Overview on Profile Tab */}
      {profileNames.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15em' }}>🎯 Treffer-Board Vorschau</h3>
            <select
              value={previewProfile || profileNames[0]}
              onChange={(e) => setPreviewProfile(e.target.value)}
              style={{
                background: '#24242c',
                color: '#fff',
                border: '1px solid var(--card-border)',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.85em'
              }}
            >
              {profileNames.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <DartboardHeatmap 
            profile={profiles[previewProfile || profileNames[0]]} 
            title={`2D Heatmap: ${previewProfile || profileNames[0]}`} 
          />
        </div>
      )}

      {/* App Version & Info */}
      <div 
        style={{ 
          marginTop: '30px', 
          textAlign: 'center', 
          fontSize: '0.8rem', 
          color: 'var(--text-dim)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        <div 
          style={{ 
            padding: '6px 14px', 
            borderRadius: '20px', 
            background: 'rgba(255,255,255,0.04)', 
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
          onClick={() => {
            if (window.confirm(`DartCounter ${APP_VERSION}\nBuild-Zeit: ${BUILD_TIME}\n\nMöchtest du die App neu laden und den Cache aktualisieren?`)) {
              window.location.reload();
            }
          }}
          title="Klicken zum Neuladen / Cache leeren"
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--green)', boxShadow: '0 0 8px var(--green)' }} />
          <span><strong>DartCounter Pro</strong> {APP_VERSION}</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span style={{ opacity: 0.75 }}>Build: {BUILD_TIME}</span>
        </div>
      </div>

      {/* spacer for bottom nav */}
      <div style={{ height: '120px' }}></div>
    </div>
  );
};
