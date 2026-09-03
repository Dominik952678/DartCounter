import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Profile, MatchHistory, GuestSyncTokenDoc } from '../types';
import { ProfileDashboard } from './ProfileDashboard';
import { DartboardHeatmap } from './DartboardHeatmap';
import { exportElementAsImage } from '../utils/exportImage';
import { MatchImageExport } from './MatchImageExport';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { generateUserSyncCode, readUserSyncDoc, redeemSyncCode, revokeHostAccess, toggleUserSync, abortGuestMatchRemote, saveMatch, supabase } from '../db/database';
import { SAMPLE_PROFILES, SAMPLE_MATCHES, SAMPLE_PROFILE_KEYS } from '../utils/sampleData';
import { APP_VERSION, BUILD_TIME } from '../version';
import { reportPersistenceError } from '../store/useNotificationStore';

interface ProfileTabProps {
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  /** Whether the account has matches beyond the loaded window. */
  hasMoreMatches?: boolean;
  onLoadMoreMatches?: () => void;
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  profiles,
  matches,
  hasMoreMatches = false,
  onLoadMoreMatches,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile
}) => {
  const { user } = useAuthStore();
  const { theme, scanlines, gridAnimation, setTheme, toggleScanlines, toggleGridAnimation } = useThemeStore();
  const navigate = useNavigate();
  const [newProfileName, setNewProfileName] = useState('');
  const [isBotChecked, setIsBotChecked] = useState(false);
  const [botLevel, setBotLevel] = useState<number>(3);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 📱 Gast-Cloud-Sync State
  const [userSyncInfo, setUserSyncInfo] = useState<GuestSyncTokenDoc | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importCode, setImportCode] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  // The import modal owns `importError`; sync failures need their own slot in
  // the sync panel or they would never be seen.
  const [syncError, setSyncError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importedGuestData, setImportedGuestData] = useState<{ profile: Profile; username: string } | null>(null);
  const [sampleDataStatus, setSampleDataStatus] = useState<string | null>(null);
  const hasSampleProfiles = SAMPLE_PROFILE_KEYS.some(key => !!profiles[key]);

  const handleLoadSampleData = async () => {
    setSampleDataStatus(null);
    Object.entries(SAMPLE_PROFILES).forEach(([name, prof]) => {
      onUpdateProfile(name, prof);
    });
    try {
      for (const m of SAMPLE_MATCHES) {
        await saveMatch(m, user?.id);
      }
    } catch (err) {
      reportPersistenceError(err, 'Testdaten konnten nicht gespeichert werden');
      return;
    }
    setSampleDataStatus("✅ 4 Testprofile & 4 Demospiele erfolgreich geladen! (Deine eigenen Profile bleiben unverändert)");
    setTimeout(() => setSampleDataStatus(null), 4000);
  };

  const handleRemoveSampleData = () => {
    setSampleDataStatus(null);
    SAMPLE_PROFILE_KEYS.forEach(key => {
      if (profiles[key]) {
        onDeleteProfile(key);
      }
    });
    setSampleDataStatus("🗑️ Testdaten sauber entfernt. Deine eigenen Stats bleiben unberührt.");
    setTimeout(() => setSampleDataStatus(null), 4000);
  };

  const profileNames = Object.keys(profiles);
  const [previewProfile, setPreviewProfile] = useState<string>(
    user?.user_metadata?.username && profiles[user.user_metadata.username] 
      ? user.user_metadata.username 
      : profileNames[0] || ''
  );

  const loadSyncInfo = useCallback(async () => {
    if (!user?.id) return;
    const { doc: info, ok } = await readUserSyncDoc(user.id);
    // A failed request is not evidence that the code is gone. Overwriting state
    // with null on a flaky read is what made a freshly generated code vanish a
    // couple of seconds after it appeared.
    if (!ok) return;
    setUserSyncInfo(prev => {
      // Toast notice if a new host just connected
      if (prev && info && info.activeHosts && prev.activeHosts) {
        if (info.activeHosts.length > prev.activeHosts.length) {
          const newest = info.activeHosts[info.activeHosts.length - 1];
          setImportSuccess(`🎉 Neues Host-Gerät verbunden: ${newest.hostName}`);
          setTimeout(() => setImportSuccess(null), 4000);
        }
      }
      return info;
    });
  }, [user]);

  /**
   * Sync is off until the user turns it on. `syncEnabled !== false` treated a
   * missing document — i.e. a user who never enabled sync — as active, so the
   * panel greeted everyone with "Sync Aktiv". Legacy documents predate the flag,
   * so an unexpired code still counts as enabled.
   */
  const isSyncEnabled = React.useMemo(() => {
    if (!userSyncInfo) return false;
    if (userSyncInfo.syncEnabled === true) return true;
    if (userSyncInfo.syncEnabled === false) return false;
    return !!userSyncInfo.code && new Date(userSyncInfo.expiresAt) > new Date();
  }, [userSyncInfo]);

  // Live Auto-Refresh & Realtime listener on user_sync_${user.id}
  useEffect(() => {
    if (!user?.id) return;
    let isMounted = true;
    (async () => {
      if (isMounted) await loadSyncInfo();
    })();

    const channel = supabase.channel(`live_sync_profile_${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.user_sync_${user.id}`
      }, (payload) => {
        const row = payload?.new as { data?: GuestSyncTokenDoc } | null;
        if (row?.data) {
          setUserSyncInfo(row.data);
        }
      })
      .subscribe();

    // The realtime subscription above is the primary signal; this is only a
    // fallback for dropped websockets.
    const poll = setInterval(() => {
      loadSyncInfo();
    }, 15000);

    return () => {
      isMounted = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadSyncInfo]);

  const handleGenerateCode = async () => {
    if (!user?.id) return;
    setSyncLoading(true);
    setSyncError(null);
    const username = user.user_metadata?.username || user.email || 'Spieler';
    const profile = profiles[username] || Object.values(profiles)[0];
    try {
      const newToken = await generateUserSyncCode(user.id, username, profile, matches);
      setUserSyncInfo(newToken);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync-Code konnte nicht erstellt werden.');
    } finally {
      setSyncLoading(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    if (!user?.id) return;
    setSyncLoading(true);
    setSyncError(null);
    const username = user.user_metadata?.username || user.email || 'Spieler';
    const profile = profiles[username] || Object.values(profiles)[0];
    try {
      const updatedDoc = await toggleUserSync(user.id, username, enabled, profile, matches);
      setUserSyncInfo(updatedDoc);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Gast-Sync konnte nicht umgeschaltet werden.');
      setSyncLoading(false);
      return;
    }
    setSyncLoading(false);
    if (!enabled) {
      setImportSuccess("Gast-Sync deaktiviert. Alle Host-Verbindungen wurden getrennt.");
      setTimeout(() => setImportSuccess(null), 3000);
    }
  };

  const handleAbortRemoteMatch = async () => {
    if (!user?.id) return;
    if (!window.confirm("Möchtest du das laufende Match auf dem Host-Gerät wirklich abbrechen und die Verbindung trennen?")) return;
    setSyncLoading(true);
    await abortGuestMatchRemote(user.id);
    await loadSyncInfo();
    setSyncLoading(false);
    setImportSuccess("🛑 Match auf Host-Gerät abgebrochen und Verbindung getrennt.");
    setTimeout(() => setImportSuccess(null), 4000);
  };

  const handleRevokeHost = async (hostId?: string) => {
    if (!user?.id) return;
    setSyncLoading(true);
    await revokeHostAccess(user.id, hostId);
    await loadSyncInfo();
    setSyncLoading(false);
  };

  const handleCopyCode = () => {
    if (!userSyncInfo?.code) return;
    navigator.clipboard.writeText(userSyncInfo.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCheckImportCode = async () => {
    setImportError(null);
    setImportSuccess(null);
    setImportedGuestData(null);

    const clean = importCode.replace(/\s+/g, '').trim();
    if (clean.length < 6) {
      setImportError("Bitte gib den 6-stelligen Sync-Code ein.");
      return;
    }

    setImportLoading(true);
    let hostId = localStorage.getItem('dartcounter_host_device_id');
    if (!hostId) {
      hostId = `host_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('dartcounter_host_device_id', hostId);
    }
    const hostName = user?.user_metadata?.username || user?.email || 'Host-Gerät';

    const res = await redeemSyncCode(clean, hostId, hostName);
    setImportLoading(false);

    if (!res.success || !res.profile || !res.username) {
      setImportError(res.error || "Code konnte nicht eingelöst werden.");
    } else {
      setImportedGuestData({ profile: res.profile, username: res.username });
    }
  };

  const handleConfirmImport = () => {
    if (!importedGuestData) return;
    onUpdateProfile(importedGuestData.username, importedGuestData.profile);
    setImportSuccess(`Gastkonto @${importedGuestData.username} erfolgreich verknüpft!`);
    setTimeout(() => {
      setShowImportModal(false);
      setImportCode('');
      setImportedGuestData(null);
      setImportSuccess(null);
    }, 1200);
  };

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
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%)',
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
            matches.map((m, i) => (
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

          {hasMoreMatches && onLoadMoreMatches && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button className="btn-ghost" onClick={onLoadMoreMatches}>
                Mehr laden
              </button>
            </div>
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
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%)',
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
          background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%);
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
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
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
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--red)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85em', marginBottom: '12px' }}>
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
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Vorhandene Profile</h2>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                type="button"
                className="btn-primary"
                onClick={() => setShowImportModal(true)}
                style={{ padding: '4px 10px', fontSize: '0.8rem', minHeight: '32px' }}
                title="Gastspieler via Sync-Code importieren"
              >
                ☁️ Gast importieren
              </button>
              <span className="card-badge">{profileNames.length}</span>
            </div>
          </div>
          
          {profileNames.length > 0 ? (
            <div className="profile-chips">
              {profileNames.map(name => {
                const isGuest = profiles[name]?.isLinkedCloudGuest;
                return (
                  <div 
                    key={name} 
                    className="profile-chip" 
                    onClick={() => setViewProfile(name)}
                    style={{ 
                      borderLeftColor: profiles[name]?.color || 'var(--card-border)',
                      position: 'relative',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{isGuest ? '🔗 ' : (profiles[name]?.isBot ? '🤖 ' : '👤 ')} {name}</span>
                    {isGuest && (
                      <span style={{ 
                        fontSize: '0.7em', 
                        marginLeft: '4px', 
                        background: 'rgba(59, 130, 246, 0.25)', 
                        color: 'var(--blue)', 
                        padding: '1px 5px', 
                        borderRadius: '4px',
                        fontWeight: 700 
                      }}>
                        Cloud
                      </span>
                    )}
                    {!isGuest && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Profil „${name}“ wirklich löschen?`)) {
                            onDeleteProfile(name);
                          }
                        }}
                        title={`Profil „${name}“ löschen`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          marginLeft: '4px',
                          padding: '0 4px',
                          display: 'flex',
                          alignItems: 'center',
                          borderRadius: '4px',
                          lineHeight: 1
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red, #ef4444)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
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

      {/* 📱 Gast-Sync & Geräte-Freigabe (Nur für angemeldete Nutzer) */}
      {user && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '1.3em' }}>📱</span>
              <h2>Gast-Sync & Geräte-Freigaben</h2>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: isSyncEnabled ? 'var(--green, #10B981)' : 'var(--text-dim)', fontWeight: 700 }}>
                {isSyncEnabled ? '🟢 Sync Aktiv' : '⚪ Sync Aus'}
              </span>
              <button
                type="button"
                className={isSyncEnabled ? 'btn-secondary' : 'btn-primary'}
                onClick={() => handleToggleSync(!isSyncEnabled)}
                disabled={syncLoading}
                style={{ padding: '4px 12px', fontSize: '0.78rem', minHeight: '30px' }}
              >
                {isSyncEnabled ? 'Deaktivieren' : 'Aktivieren'}
              </button>
            </div>
          </div>

          {/* 🔴 Live-Match Banner auf dem Main Account */}
          {userSyncInfo?.liveMatch && !userSyncInfo?.liveMatch?.isAborted && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(245, 158, 11, 0.2))',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: '12px',
              padding: '14px 16px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              boxShadow: '0 0 20px rgba(239, 68, 68, 0.25)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.3rem' }}>🎯</span>
                  <strong style={{ color: 'var(--red, #ef4444)', fontSize: '0.98rem' }}>
                    Live-Match aktiv auf {userSyncInfo.liveMatch.hostName}!
                  </strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                  Dein Profil wird gerade in einem {userSyncInfo.liveMatch.gameType || 'Standard'}-Spiel verwendet.
                </div>
              </div>
              <button
                type="button"
                className="btn-danger"
                onClick={handleAbortRemoteMatch}
                disabled={syncLoading}
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 800 }}
              >
                🛑 Match remote abbrechen & Trennen
              </button>
            </div>
          )}

          <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
            Teile deinen 6-stelligen Code mit einem Freund (Host), um auf seinem Gerät als Gast zu spielen. Dein Profil kann immer auf maximal einem Host-Gerät gekoppelt sein.
          </p>

          {syncError && (
            <div className="alert alert-error" role="alert" style={{ marginBottom: '14px' }}>
              <span aria-hidden="true">⚠️</span>
              <span>{syncError}</span>
            </div>
          )}

          <div style={{ 
            background: 'rgba(0, 0, 0, 0.35)', 
            padding: '16px', 
            borderRadius: '12px', 
            border: '1px solid var(--card-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            {!isSyncEnabled ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '14px' }}>
                  Gast-Sync ist aktuell deaktiviert. Dein Profil kann von keinem fremden Gerät verwendet werden.
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={() => handleToggleSync(true)}
                  disabled={syncLoading}
                  style={{ padding: '10px 22px', fontWeight: 800 }}
                >
                  ⚡ Gast-Sync aktivieren
                </button>
              </div>
            ) : userSyncInfo && userSyncInfo.code && new Date(userSyncInfo.expiresAt) > new Date() ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Dein aktiver Sync-Code:
                    </span>
                    <div style={{ 
                      fontSize: '2rem', 
                      fontWeight: 900, 
                      letterSpacing: '0.15em', 
                      color: 'var(--primary, #00ff88)', 
                      fontFamily: 'var(--font-mono)' 
                    }}>
                      {userSyncInfo.code.slice(0, 3)} {userSyncInfo.code.slice(3)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Gültig bis: {new Date(userSyncInfo.expiresAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      type="button" 
                      className="btn-primary" 
                      onClick={handleCopyCode}
                      style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                    >
                      {copiedCode ? '✅ Kopiert!' : '📋 Code kopieren'}
                    </button>
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      onClick={handleGenerateCode}
                      disabled={syncLoading}
                      style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                      title="Generiert einen neuen Code und invalidiert alte Codes (Anti-Stat-Washing)"
                    >
                      🔄 Code erneuern
                    </button>
                  </div>
                </div>

                {/* 🛡️ Aktive Host-Verbindung (Exklusiv max. 1 Host) */}
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>
                      Gekoppeltes Host-Gerät:
                    </span>
                    {(userSyncInfo.activeHost || (userSyncInfo.activeHosts && userSyncInfo.activeHosts.length > 0)) && (
                      <button 
                        type="button"
                        className="btn-danger"
                        onClick={() => handleRevokeHost()}
                        disabled={syncLoading}
                        style={{ padding: '3px 8px', fontSize: '0.74rem', minHeight: '26px' }}
                      >
                        ⛔ Entkoppeln
                      </button>
                    )}
                  </div>

                  {userSyncInfo.activeHost || (userSyncInfo.activeHosts && userSyncInfo.activeHosts.length > 0) ? (
                    (() => {
                      const host = userSyncInfo.activeHost || userSyncInfo.activeHosts![0];
                      return (
                        <div 
                          style={{
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <strong style={{ color: 'var(--blue)' }}>📱 {host.hostName}</strong>
                            <span style={{ color: 'var(--text-dim)', marginLeft: '8px', fontSize: '0.75rem' }}>
                              (Gekoppelt {new Date(host.linkedAt).toLocaleDateString('de-DE')})
                            </span>
                          </div>
                          <button 
                            type="button"
                            className="btn-danger"
                            onClick={() => handleRevokeHost(host.hostId)}
                            disabled={syncLoading}
                            style={{ padding: '3px 10px', fontSize: '0.75rem', minHeight: '28px' }}
                          >
                            Trennen
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                      Noch kein Host-Gerät mit diesem Code gekoppelt.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                  Du hast aktuell keinen aktiven Sync-Code. Erstelle einen Code, um dein Profil auf dem Smartphone/iPad eines Freundes freizugeben.
                </p>
                <button 
                  type="button" 
                  className="btn-primary" 
                  onClick={handleGenerateCode}
                  disabled={syncLoading}
                  style={{ padding: '10px 20px', fontWeight: 800 }}
                >
                  {syncLoading ? 'Erzeuge Code...' : '⚡ 6-stelligen Sync-Code generieren'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ☁️ Modal: Gast via Sync-Code importieren */}
      {showImportModal && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div className="modal-content card" style={{
            maxWidth: '440px',
            width: '100%',
            background: 'var(--card)',
            border: '1px solid var(--primary, #00ff88)',
            padding: '24px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>☁️ Gast via Sync-Code importieren</h3>
              <button 
                className="btn-ghost" 
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                  setImportedGuestData(null);
                }}
                style={{ fontSize: '1.2rem', padding: '2px 8px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '16px', lineHeight: 1.4 }}>
              Gib den 6-stelligen Code ein, den dein Freund auf seinem Smartphone im Profil-Tab anzeigt:
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input 
                type="text" 
                maxLength={7}
                placeholder="z.B. 482 195" 
                value={importCode}
                onChange={(e) => setImportCode(e.target.value)}
                style={{ 
                  fontSize: '1.3rem', 
                  textAlign: 'center', 
                  letterSpacing: '0.1em', 
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)' 
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckImportCode()}
              />
              <button 
                className="btn-primary" 
                onClick={handleCheckImportCode}
                disabled={importLoading || importCode.trim().length < 6}
                style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
              >
                {importLoading ? 'Prüfe...' : 'Suchen'}
              </button>
            </div>

            {importError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                color: 'var(--red)', 
                padding: '10px 12px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                marginBottom: '14px' 
              }}>
                ⚠️ {importError}
              </div>
            )}

            {importSuccess && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.15)', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                color: 'var(--green, #10B981)', 
                padding: '10px 12px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                marginBottom: '14px' 
              }}>
                ✅ {importSuccess}
              </div>
            )}

            {importedGuestData && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--card-border)',
                borderRadius: '10px',
                padding: '14px',
                marginBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: importedGuestData.profile.color || 'var(--blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    color: '#fff'
                  }}>
                    {importedGuestData.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <strong style={{ fontSize: '1.05rem', color: 'var(--text)' }}>
                      @{importedGuestData.username}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {importedGuestData.profile.matches || 0} Matches · Ø {importedGuestData.profile.dartsThrown > 0 ? (((importedGuestData.profile.pointsScored || 0) / importedGuestData.profile.dartsThrown) * 3).toFixed(1) : '0.0'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button 
                    className="btn-primary" 
                    onClick={handleConfirmImport}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    ➕ Profil zur Spielerliste hinzufügen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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

      {/* 🎨 Erscheinungsbild & Design System */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ marginBottom: '16px' }}>
          <h2>🎨 Design & Theme</h2>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', fontWeight: 600 }}>
            App-Design wählen:
          </label>
          <div className="segment-control">
            <label className={theme === 'classic' ? 'active' : ''}>
              <input 
                type="radio" 
                name="themeSelect" 
                checked={theme === 'classic'} 
                onChange={() => setTheme('classic')} 
              />
              <span>🎯 Classic Dark</span>
            </label>
            <label className={theme === 'vaporwave' ? 'active' : ''}>
              <input 
                type="radio" 
                name="themeSelect" 
                checked={theme === 'vaporwave'} 
                onChange={() => setTheme('vaporwave')} 
              />
              <span>🌆 Vaporwave</span>
            </label>
            <label className={theme === 'cyberpunk' ? 'active' : ''}>
              <input 
                type="radio" 
                name="themeSelect" 
                checked={theme === 'cyberpunk'} 
                onChange={() => setTheme('cyberpunk')} 
              />
              <span>⚡ Cyberpunk</span>
            </label>
          </div>
        </div>

        {theme === 'vaporwave' && (
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '14px', 
            borderRadius: '10px', 
            border: '1px solid rgba(255, 0, 255, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--cyan, #00FFFF)' }}>📺 CRT Scanlines Overlay</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Klassischer 80s Röhrenmonitor-Filter</span>
              </div>
              <button 
                type="button" 
                onClick={toggleScanlines}
                className={scanlines ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.8rem', minHeight: '34px' }}
              >
                {scanlines ? 'Aktiviert' : 'Deaktiviert'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--magenta, #FF00FF)' }}>🏎️ 3D Outrun Perspektiv-Grid</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Animierter Neon-Gitter-Horizont</span>
              </div>
              <button 
                type="button" 
                onClick={toggleGridAnimation}
                className={gridAnimation ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.8rem', minHeight: '34px' }}
              >
                {gridAnimation ? 'Aktiviert' : 'Deaktiviert'}
              </button>
            </div>
          </div>
        )}

        {theme === 'cyberpunk' && (
          <div style={{ 
            background: 'rgba(10, 10, 15, 0.6)', 
            padding: '14px', 
            border: '1px solid rgba(0, 255, 136, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#00ff88' }}>📺 Terminal CRT Scanlines</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Subtiler Retro-Terminal-Overlay</span>
              </div>
              <button 
                type="button" 
                onClick={toggleScanlines}
                className={scanlines ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.8rem', minHeight: '34px' }}
              >
                {scanlines ? 'Aktiviert' : 'Deaktiviert'}
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#00d4ff' }}>⚡ Circuit Matrix Grid</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Tech-Hintergrund-Raster</span>
              </div>
              <button 
                type="button" 
                onClick={toggleGridAnimation}
                className={gridAnimation ? 'btn-primary' : 'btn-secondary'}
                style={{ padding: '6px 14px', fontSize: '0.8rem', minHeight: '34px' }}
              >
                {gridAnimation ? 'Aktiviert' : 'Deaktiviert'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🧪 Testprofile & Demodaten (Sicheres Testen ohne eigene Stats zu beeinträchtigen) */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.3em' }}>🧪</span>
            <h2>Testdaten & Demospiele</h2>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Sicheres Ausprobieren</span>
        </div>

        <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
          Lade vorgefertigte Testprofile (z. B. <em>Lukas (Profi)</em>, <em>Stefan (Kneipe)</em>, <em>Leon (Cloud-Gast)</em>) und realistische Demospiele, um alle Statistiken, Heatmaps und den Gast-Sync gefahrlos zu testen.
        </p>

        {sampleDataStatus && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--blue)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            marginBottom: '14px'
          }}>
            {sampleDataStatus}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={handleLoadSampleData}
            style={{ padding: '9px 16px', fontSize: '0.88rem', fontWeight: 700 }}
          >
            🧪 Testprofile & Demospiele laden
          </button>

          {hasSampleProfiles && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleRemoveSampleData}
              style={{ padding: '9px 16px', fontSize: '0.88rem', borderColor: 'rgba(239, 68, 68, 0.4)', color: 'var(--red)' }}
            >
              🗑️ Testdaten wieder entfernen
            </button>
          )}
        </div>
      </div>

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
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)', boxShadow: '0 0 8px var(--primary-glow)' }} />
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
