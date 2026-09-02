import React, { useState, useEffect } from 'react';
import type { Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveUserSyncInfo } from '../db/database';

export type MiniGameMode = 'checkout' | 'powerscoring' | 'splitscore';

interface TrainingHubProps {
  profiles: Record<string, Profile>;
  setProfiles?: (profiles: Record<string, Profile>) => void;
  onStartMiniGame: (mode: MiniGameMode, players: string[], settings: Record<string, unknown>) => void;
  initialMode?: MiniGameMode;
}

export const TrainingHub: React.FC<TrainingHubProps> = ({ profiles, setProfiles, onStartMiniGame, initialMode = 'checkout' }) => {
  const { user } = useAuthStore();
  const isGuest = !user;
  const profileNames = Object.keys(profiles);

  const [selectedMode, setSelectedMode] = useState<MiniGameMode>(() => {
    if (initialMode && ['checkout', 'powerscoring', 'splitscore'].includes(initialMode)) return initialMode;
    const saved = localStorage.getItem('dart_training_mode');
    if (saved && ['checkout', 'powerscoring', 'splitscore'].includes(saved)) return saved as MiniGameMode;
    return 'checkout';
  });

  const [playerCount, setPlayerCount] = useState<number>(() => {
    const saved = localStorage.getItem('dart_training_playerCount');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) return parsed;
    }
    return 1;
  });

  const [powerScoringRounds, setPowerScoringRounds] = useState<number>(() => {
    const saved = localStorage.getItem('dart_powerscoring_rounds');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 10;
  });

  const [checkoutRounds, setCheckoutRounds] = useState<number>(() => {
    const saved = localStorage.getItem('dart_checkout_rounds');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  });

  const [checkoutTargets, setCheckoutTargets] = useState<number>(() => {
    const saved = localStorage.getItem('dart_checkout_targets');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 10;
  });

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(() => {
    if (isGuest) return ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4'];
    const pNames = Object.keys(profiles);
    if (pNames.length > 0) {
      const initial: string[] = [];
      const humans = pNames.filter(n => !profiles[n]?.isBot);
      const bots = pNames.filter(n => profiles[n]?.isBot);
      for (let i = 0; i < 4; i++) {
        if (i === 0 && humans.length > 0) {
          initial.push(humans[0]);
        } else {
          const nextHuman = humans.find(h => !initial.includes(h));
          const nextBot = bots.find(b => !initial.includes(b));
          if (nextHuman) initial.push(nextHuman);
          else if (nextBot) initial.push(nextBot);
        }
      }
      return initial;
    }
    return [];
  });
  const [guestBots, setGuestBots] = useState<Record<string, boolean>>({});
  const [randomOrderOnStart, setRandomOrderOnStart] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('dart_training_mode', selectedMode);
  }, [selectedMode]);

  useEffect(() => {
    localStorage.setItem('dart_training_playerCount', playerCount.toString());
  }, [playerCount]);

  useEffect(() => {
    localStorage.setItem('dart_powerscoring_rounds', powerScoringRounds.toString());
  }, [powerScoringRounds]);

  useEffect(() => {
    localStorage.setItem('dart_checkout_rounds', checkoutRounds.toString());
  }, [checkoutRounds]);

  useEffect(() => {
    localStorage.setItem('dart_checkout_targets', checkoutTargets.toString());
  }, [checkoutTargets]);

  const handlePlayerChange = (index: number, name: string) => {
    const newSelected = [...selectedPlayers];
    // If the selected name is already present in another active slot, swap them!
    const existingIndex = newSelected.slice(0, playerCount).indexOf(name);
    if (existingIndex !== -1 && existingIndex !== index) {
      newSelected[existingIndex] = newSelected[index];
    }
    newSelected[index] = name;
    setSelectedPlayers(newSelected);
  };

  const handleGuestBotToggle = (index: number, isBot: boolean) => {
    const name = selectedPlayers[index] || `Gast ${index + 1}`;
    setGuestBots(prev => ({ ...prev, [name]: isBot }));
  };

  const getAvatarColor = (name: string) => {
    const colors = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--red)'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleStart = async () => {
    let chosenPlayers = selectedPlayers.slice(0, playerCount);

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      setErrorMsg("Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!");
      return;
    }
    
    const hasHuman = isGuest 
       ? chosenPlayers.some(p => !guestBots[p])
       : chosenPlayers.some(p => profiles[p] && !profiles[p].isBot);
       
    if (!hasHuman) {
      setErrorMsg("Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!");
      return;
    }

    // Wenn Gast-Sync aktiv ist: Spielstart blockieren
    try {
      const rawLocal = localStorage.getItem('dartcounter_active_sync_code');
      if (rawLocal) {
        const localDoc = JSON.parse(rawLocal);
        if (localDoc && localDoc.syncEnabled !== false && localDoc.code && new Date(localDoc.expiresAt) > new Date()) {
          const hostName = localDoc.activeHost?.hostName || localDoc.activeHosts?.[0]?.hostName;
          if (hostName) {
            setErrorMsg(`⚠️ Gast-Sync ist aktiv: Dein Profil ist aktuell auf '${hostName}' gekoppelt. Du kannst erst wieder lokal spielen, wenn du die Verbindung trennst oder Gast-Sync im Profil-Tab deaktivierst.`);
          } else {
            setErrorMsg(`⚠️ Gast-Sync ist aktiviert! Solange Gast-Sync aktiv ist, können auf diesem Gerät keine lokalen Spiele gestartet werden. Bitte deaktiviere Gast-Sync im Profil-Tab.`);
          }
          return;
        }
      }
    } catch (e) {
      console.warn("Could not read local sync code in TrainingHub", e);
    }

    if (user?.id) {
      const syncInfo = await getActiveUserSyncInfo(user.id);
      if (syncInfo && syncInfo.syncEnabled !== false && syncInfo.code && new Date(syncInfo.expiresAt) > new Date()) {
        const host = syncInfo.activeHost || syncInfo.activeHosts?.[0];
        if (host) {
          setErrorMsg(`⚠️ Gast-Sync ist aktiv: Dein Profil ist aktuell auf '${host.hostName}' gekoppelt. Du kannst erst wieder lokal spielen, wenn du die Verbindung trennst oder Gast-Sync im Profil-Tab deaktivierst.`);
        } else {
          setErrorMsg(`⚠️ Gast-Sync ist aktiviert! Solange Gast-Sync aktiv ist, können auf diesem Gerät keine lokalen Spiele gestartet werden. Bitte deaktiviere Gast-Sync im Profil-Tab.`);
        }
        return;
      }
    }

    if (isGuest && setProfiles) {
       const fakeProfiles: Record<string, Profile> = {};
       chosenPlayers.forEach(p => {
          fakeProfiles[p] = {
             wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
             isBot: guestBots[p] || false,
             targetAverage: 40
          };
       });
       setProfiles(fakeProfiles);
    }

    if (randomOrderOnStart) {
      const shuffled = [...chosenPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      chosenPlayers = shuffled;
    }

    onStartMiniGame(selectedMode, chosenPlayers, {
      rounds: powerScoringRounds,
      checkoutRounds: checkoutRounds,
      checkoutTargets: checkoutTargets
    });
  };

  const movePlayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= playerCount) return;
    const newSelected = [...selectedPlayers];
    const temp = newSelected[index];
    newSelected[index] = newSelected[targetIndex];
    newSelected[targetIndex] = temp;
    setSelectedPlayers(newSelected);
  };

  return (
    <div className="training-hub screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        .hero-glow-bg-training {
          position: absolute;
          top: -80px;
          left: 50%;
          transform: translateX(-50%);
          width: 500px;
          height: 300px;
          background: radial-gradient(circle, rgba(245, 158, 11, 0.1) 0%, rgba(59, 130, 246, 0.06) 50%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }
        .training-hub-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .training-hub-grid {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            align-items: start;
          }
        }
        .training-mode-btn {
          padding: 16px;
          text-align: left;
          font-size: 1.05em;
          border-radius: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid var(--card-border);
          transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
          color: var(--text);
          cursor: pointer;
        }
        .training-mode-btn:hover {
          transform: translateY(-2px);
          border-color: rgba(255, 255, 255, 0.18);
        }
        .training-mode-btn.active-checkout {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.22), rgba(59, 130, 246, 0.05));
          border-color: var(--blue);
          box-shadow: 0 4px 16px var(--blue-glow);
        }
        .training-mode-btn.active-powerscoring {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(239, 68, 68, 0.05));
          border-color: var(--red);
          box-shadow: 0 4px 16px var(--red-glow);
        }
        .training-mode-btn.active-splitscore {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.22), rgba(249, 115, 22, 0.05));
          border-color: var(--orange);
          box-shadow: 0 4px 16px var(--orange-glow);
        }
        .training-mode-btn.inactive {
          background: var(--surface);
          opacity: 0.7;
        }
      `}</style>

      <div className="hero-glow-bg-training" />

      <div className="app-header" style={{ marginBottom: '20px' }}>
        <h2>🎯 Training & Mini-Games</h2>
        <p className="subtitle">Verbessere deine Fähigkeiten und trainiere gezielt</p>
      </div>

      <div className="training-hub-grid">
        {/* Modes Column */}
        <div className="card">
          <div className="card-header">
            <h2>Modus wählen</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div 
              className={`training-mode-btn ${selectedMode === 'checkout' ? 'active-checkout' : 'inactive'}`}
              onClick={() => setSelectedMode('checkout')}
            >
              <span style={{ fontSize: '1.8rem', background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '12px' }}>🎯</span>
              <div>
                <div style={{ fontWeight: 800 }}>Checkout Training</div>
                <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>Zufällige Checkouts unter Druck treffen</div>
              </div>
            </div>
            
            <div 
              className={`training-mode-btn ${selectedMode === 'powerscoring' ? 'active-powerscoring' : 'inactive'}`}
              onClick={() => setSelectedMode('powerscoring')}
            >
              <span style={{ fontSize: '1.8rem', background: 'rgba(239, 68, 68, 0.15)', padding: '10px', borderRadius: '12px' }}>🔥</span>
              <div>
                <div style={{ fontWeight: 800 }}>Power Scoring</div>
                <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>Maximale Punkte in festen Runden sammeln</div>
              </div>
            </div>

            <div 
              className={`training-mode-btn ${selectedMode === 'splitscore' ? 'active-splitscore' : 'inactive'}`}
              onClick={() => setSelectedMode('splitscore')}
            >
              <span style={{ fontSize: '1.8rem', background: 'rgba(249, 115, 22, 0.15)', padding: '10px', borderRadius: '12px' }}>➗</span>
              <div>
                <div style={{ fontWeight: 800 }}>Split Score (Halve-It)</div>
                <div style={{ fontSize: '0.82em', color: 'var(--text-dim)', fontWeight: 400, marginTop: '2px' }}>Vorgegebene Segmente treffen oder Punkte halbieren</div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card">
            <div className="card-header">
              <h2>Spieler</h2>
            </div>
            <div className="segment-control" style={{ marginBottom: '15px' }}>
              {[1, 2, 3, 4].map(count => (
                <label key={count} className={playerCount === count ? 'active' : ''}>
                  <input 
                    type="radio" 
                    name="playerCount" 
                    value={count} 
                    checked={playerCount === count}
                    onChange={() => setPlayerCount(count)}
                  />
                  <span>{count}</span>
                </label>
              ))}
            </div>

            <div className="player-selects" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Array.from({ length: playerCount }).map((_, i) => {
                const playerName = selectedPlayers[i] || '';
                const isBot = isGuest ? guestBots[playerName] : profiles[playerName]?.isBot;

                return (
                  <div 
                    key={i} 
                    className="player-select-wrapper" 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '12px',
                      background: 'var(--surface)',
                      padding: '8px 12px',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--card-border)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <button 
                        type="button" 
                        onClick={() => movePlayer(i, 'up')} 
                        disabled={i === 0} 
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: i === 0 ? 'rgba(255,255,255,0.15)' : 'var(--text-dim)', 
                          padding: '2px 4px', 
                          cursor: i === 0 ? 'default' : 'pointer', 
                          fontSize: '0.75rem',
                          lineHeight: 1,
                          minHeight: 'auto'
                        }}
                        aria-label="Spieler nach oben"
                        title="Nach oben"
                      >
                        ▲
                      </button>
                      <button 
                        type="button" 
                        onClick={() => movePlayer(i, 'down')} 
                        disabled={i >= playerCount - 1} 
                        style={{ 
                          background: 'transparent', 
                          border: 'none', 
                          color: i >= playerCount - 1 ? 'rgba(255,255,255,0.15)' : 'var(--text-dim)', 
                          padding: '2px 4px', 
                          cursor: i >= playerCount - 1 ? 'default' : 'pointer', 
                          fontSize: '0.75rem',
                          lineHeight: 1,
                          minHeight: 'auto'
                        }}
                        aria-label="Spieler nach unten"
                        title="Nach unten"
                      >
                        ▼
                      </button>
                    </div>

                    <div className="avatar-circle" style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      color: 'white', 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      backgroundColor: getAvatarColor(playerName || `Spieler ${i+1}`) 
                    }}>
                      {isBot ? '🤖' : (playerName.charAt(0).toUpperCase() || '?')}
                    </div>

                    {isGuest ? (
                      <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={playerName} 
                          onChange={e => handlePlayerChange(i, e.target.value)} 
                          placeholder={`Spieler ${i + 1}`} 
                          style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '16px' }} 
                        />
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85em', color: 'var(--text-dim)', cursor: 'pointer', minWidth: '48px', minHeight: '48px', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={guestBots[playerName] || false} 
                            onChange={e => handleGuestBotToggle(i, e.target.checked)} 
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Bot
                        </label>
                      </div>
                    ) : (
                      <select 
                        value={playerName}
                        onChange={(e) => handlePlayerChange(i, e.target.value)}
                        style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: '16px', outline: 'none' }}
                      >
                        {profileNames.map(name => (
                          <option 
                            key={name} 
                            value={name}
                            style={{ color: '#000', background: '#fff' }}
                          >
                            {name} {profiles[name]?.isBot ? '(Bot)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </div>

            {errorMsg && (
              <div style={{
                background: 'var(--red)',
                color: 'white',
                padding: '12px',
                borderRadius: 'var(--radius)',
                marginTop: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontWeight: 'bold'
              }}>
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {playerCount > 1 && (
              <div style={{ marginTop: '15px' }}>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '12px 14px', 
                  background: randomOrderOnStart ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface)', 
                  border: randomOrderOnStart ? '1px solid var(--blue)' : '1px solid var(--card-border)', 
                  borderRadius: 'var(--radius)', 
                  cursor: 'pointer', 
                  transition: 'all 0.2s',
                  userSelect: 'none'
                }}>
                  <input 
                    type="checkbox" 
                    checked={randomOrderOnStart} 
                    onChange={(e) => setRandomOrderOnStart(e.target.checked)} 
                    style={{ width: '18px', height: '18px', accentColor: 'var(--blue)', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9em' }}>
                    🎲 Zufällige Reihenfolge beim Start auslosen
                  </span>
                </label>
              </div>
            )}
          </div>

          {selectedMode === 'powerscoring' && (
            <div className="card">
              <div className="card-header">
                <h2>Rundenlimit</h2>
              </div>
              <div className="segment-control">
                {[5, 10, 15, 20].map(r => (
                  <label key={r} className={powerScoringRounds === r ? 'active' : ''}>
                    <input 
                      type="radio" 
                      name="powerScoringRounds" 
                      value={r} 
                      checked={powerScoringRounds === r}
                      onChange={() => setPowerScoringRounds(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {selectedMode === 'checkout' && (
            <>
            <div className="card">
              <div className="card-header">
                <h2>Rundenlimit (Anzahl Targets)</h2>
              </div>
              <div className="segment-control">
                {[5, 10, 15, 20].map(r => (
                  <label key={r} className={checkoutTargets === r ? 'active' : ''}>
                    <input 
                      type="radio" 
                      name="checkoutTargets" 
                      value={r} 
                      checked={checkoutTargets === r}
                      onChange={() => setCheckoutTargets(r)}
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <h2>Versuche pro Finish (Runden)</h2>
              </div>
              <div className="segment-control">
                {[1, 2, 3, 5].map(r => (
                  <label key={r} className={checkoutRounds === r ? 'active' : ''}>
                    <input 
                      type="radio" 
                      name="checkoutRounds" 
                      value={r} 
                      checked={checkoutRounds === r}
                      onChange={() => setCheckoutRounds(r)}
                    />
                    <span>{r} {r === 1 ? 'Runde' : 'Runden'}</span>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '0.85em', color: 'var(--text-dim)', marginTop: '10px', textAlign: 'center' }}>
                1 Runde = 3 Darts um das Finish zu checken.
              </p>
            </div>
            </>
          )}

          <button className="btn-success btn-large" onClick={handleStart} style={{ marginTop: '5px' }}>
            🚀 Training starten
          </button>
        </div>
      </div>
      
      {/* spacer for bottom nav */}
      <div style={{ height: '120px' }}></div>
    </div>
  );
};

