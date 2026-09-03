import React, { useState, useEffect } from 'react';
import type { GameConfig, Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';
import { getActiveUserSyncInfo, redeemSyncCode, removeLinkedGuestProfiles, saveProfiles, validateGuestSyncTokens } from '../db/database';
import { reportPersistenceError } from '../store/useNotificationStore';

interface MatchSetupProps {
  profiles: Record<string, Profile>;
  onStartGame: (players: string[], config: GameConfig) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  onDiscardSavedGame?: () => void;
  setProfiles?: (profiles: Record<string, Profile>) => void;
}

interface SavedMatchSummary {
  players: { name: string; score: number; legs: number; sets: number; isBot?: boolean; team?: number }[];
  config: GameConfig;
}

/** Humans first, bots to fill up — the line-up most people want by default. */
function buildDefaultLineup(profiles: Record<string, Profile>): string[] {
  const names = Object.keys(profiles);
  if (names.length === 0) return [];
  const humans = names.filter(n => !profiles[n]?.isBot);
  const bots = names.filter(n => profiles[n]?.isBot);
  const ordered = [...humans, ...bots];
  const lineup: string[] = [];
  for (let i = 0; i < 4; i++) {
    lineup.push(ordered[i] ?? ordered[ordered.length - 1] ?? names[0]);
  }
  return lineup;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ 
  profiles, 
  onStartGame, 
  hasSavedGame, 
  onResumeGame, 
  onDiscardSavedGame, 
  setProfiles 
}) => {
  const { user } = useAuthStore();
  const isGuest = !user;

  // 📱 Gast-Cloud-Sync State
  const [showGuestSyncModal, setShowGuestSyncModal] = useState(false);
  const [guestSyncCode, setGuestSyncCode] = useState('');
  const [guestSyncLoading, setGuestSyncLoading] = useState(false);
  const [guestSyncError, setGuestSyncError] = useState<string | null>(null);
  const [guestSyncSuccess, setGuestSyncSuccess] = useState<string | null>(null);
  const [importedGuestData, setImportedGuestData] = useState<{ profile: Profile; username: string } | null>(null);

  const [savedMatch, setSavedMatch] = useState<SavedMatchSummary | null>(() => {
    try {
      const raw = localStorage.getItem('dartcounter_saved_game');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.players && parsed.config) {
          return { players: parsed.players, config: parsed.config };
        }
      }
    } catch (e) {
      console.error("Error reading saved match in MatchSetup", e);
    }
    return null;
  });

  const [isSavedBannerDismissed, setIsSavedBannerDismissed] = useState(false);
  const [showOverwriteModal, setShowOverwriteModal] = useState(false);

  const [setsToWin, setSetsToWin] = useState<number | ''>(() => {
    const saved = localStorage.getItem('dart_x01_sets');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  });

  const [legsToWin, setLegsToWin] = useState<number | ''>(() => {
    const saved = localStorage.getItem('dart_x01_legs');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1) return parsed;
    }
    return 1;
  });

  const [startScore, setStartScore] = useState<number>(() => {
    const saved = localStorage.getItem('dart_x01_startScore');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && [301, 501, 701].includes(parsed)) return parsed;
    }
    return 501;
  });

  const [outMode, setOutMode] = useState<'SO' | 'DO' | 'MO'>(() => {
    const saved = localStorage.getItem('dart_x01_outMode');
    if (saved && ['SO', 'DO', 'MO'].includes(saved)) return saved as 'SO' | 'DO' | 'MO';
    return 'DO';
  });

  const [is2v2, setIs2v2] = useState<boolean>(() => {
    return localStorage.getItem('dart_x01_is2v2') === 'true';
  });

  const [playerCount, setPlayerCount] = useState<number>(() => {
    const saved2v2 = localStorage.getItem('dart_x01_is2v2') === 'true';
    if (saved2v2) return 4;
    const saved = localStorage.getItem('dart_x01_playerCount');
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 4) return parsed;
    }
    return 2;
  });

  /**
   * Only the slots the user actually touched are stored; everything else is
   * derived from the current profiles. Profiles load asynchronously (local
   * cache first, cloud second), so a plain state snapshot taken on mount left
   * the selects empty and started matches with blank player names.
   */
  const [playerOverrides, setPlayerOverrides] = useState<(string | null)[]>([null, null, null, null]);
  const [guestBots, setGuestBots] = useState<Record<string, boolean>>({});

  const defaultLineup = React.useMemo(
    () => (isGuest ? ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4'] : buildDefaultLineup(profiles)),
    [isGuest, profiles]
  );

  const selectedPlayers = React.useMemo(
    () => Array.from({ length: 4 }, (_, i) => {
      const chosen = playerOverrides[i];
      // A slot keeps its pick only while that profile still exists; guests may
      // legitimately clear a name field, so empty strings are preserved.
      if (chosen !== null && (isGuest || profiles[chosen])) return chosen;
      return defaultLineup[i] ?? '';
    }),
    [playerOverrides, defaultLineup, profiles, isGuest]
  );

  const selectedPlayersRef = React.useRef(selectedPlayers);
  useEffect(() => {
    selectedPlayersRef.current = selectedPlayers;
  });

  const setSelectedPlayers = React.useCallback((update: string[] | ((prev: string[]) => string[])) => {
    const next = typeof update === 'function' ? update(selectedPlayersRef.current) : update;
    selectedPlayersRef.current = next;
    setPlayerOverrides([next[0] ?? null, next[1] ?? null, next[2] ?? null, next[3] ?? null]);
  }, []);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [randomOrderOnStart, setRandomOrderOnStart] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const shuffleIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    };
  }, []);

  const profileNames = Object.keys(profiles);

  useEffect(() => {
    localStorage.setItem('dart_x01_is2v2', is2v2 ? 'true' : 'false');
  }, [is2v2]);

  useEffect(() => {
    if (typeof setsToWin === 'number' && setsToWin >= 1) {
      localStorage.setItem('dart_x01_sets', setsToWin.toString());
    }
  }, [setsToWin]);

  useEffect(() => {
    if (typeof legsToWin === 'number' && legsToWin >= 1) {
      localStorage.setItem('dart_x01_legs', legsToWin.toString());
    }
  }, [legsToWin]);

  useEffect(() => {
    localStorage.setItem('dart_x01_startScore', startScore.toString());
  }, [startScore]);

  useEffect(() => {
    localStorage.setItem('dart_x01_outMode', outMode);
  }, [outMode]);

  useEffect(() => {
    if (!is2v2) {
      localStorage.setItem('dart_x01_playerCount', playerCount.toString());
    }
  }, [playerCount, is2v2]);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before styling the original
    setTimeout(() => {
      if (e.target instanceof HTMLElement) {
        e.target.style.opacity = '0.5';
      }
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedIndex(null);
    if (e.target instanceof HTMLElement) {
      e.target.style.opacity = '1';
    }
  };

  const handleDragOver = (e: React.DragEvent, _index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      const newSelected = [...selectedPlayers];
      const draggedItem = newSelected.splice(draggedIndex, 1)[0];
      newSelected.splice(index, 0, draggedItem);
      setSelectedPlayers(newSelected);
    }
    setDraggedIndex(null);
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

  const randomizeOrder = () => {
    if (isShuffling) return;
    setIsShuffling(true);
    
    let iterations = 0;
    const maxIterations = 10;
    const currentChosen = selectedPlayers.slice(0, playerCount);
    
    if (shuffleIntervalRef.current) clearInterval(shuffleIntervalRef.current);
    shuffleIntervalRef.current = setInterval(() => {
      const shuffled = [...currentChosen].sort(() => Math.random() - 0.5);
      const newSelected = [...selectedPlayers];
      for (let i = 0; i < playerCount; i++) {
        newSelected[i] = shuffled[i];
      }
      setSelectedPlayers(newSelected);
      
      iterations++;
      if (iterations >= maxIterations) {
        if (shuffleIntervalRef.current) {
          clearInterval(shuffleIntervalRef.current);
          shuffleIntervalRef.current = null;
        }
        setIsShuffling(false);
      }
    }, 50);
  };

  const handleCheckGuestSyncCode = async () => {
    setGuestSyncError(null);
    setGuestSyncSuccess(null);
    setImportedGuestData(null);

    const clean = guestSyncCode.replace(/\s+/g, '').trim();
    if (clean.length < 6) {
      setGuestSyncError("Bitte gib den 6-stelligen Sync-Code ein.");
      return;
    }

    setGuestSyncLoading(true);
    let hostId = localStorage.getItem('dartcounter_host_device_id');
    if (!hostId) {
      hostId = `host_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      localStorage.setItem('dartcounter_host_device_id', hostId);
    }
    const hostName = user?.user_metadata?.username || user?.email || 'Host-Gerät';

    const res = await redeemSyncCode(clean, hostId, hostName);
    setGuestSyncLoading(false);

    if (!res.success || !res.profile || !res.username) {
      setGuestSyncError(res.error || "Code konnte nicht eingelöst werden.");
    } else {
      setImportedGuestData({ profile: res.profile, username: res.username });
    }
  };

  const handleConfirmGuestImport = () => {
    if (!importedGuestData || !setProfiles) return;
    const newProfiles = { ...profiles, [importedGuestData.username]: importedGuestData.profile };
    setProfiles(newProfiles);
    if (user?.id) {
      saveProfiles(newProfiles, user.id).catch(err => reportPersistenceError(err, 'Gastprofil konnte nicht gespeichert werden'));
    }
    // Setze neu importierten Gast direkt in ersten freien oder nächsten Slot
    setSelectedPlayers(prev => {
      const next = [...prev];
      const emptyOrBotIdx = next.findIndex(p => !p || profiles[p]?.isBot);
      if (emptyOrBotIdx >= 0) {
        next[emptyOrBotIdx] = importedGuestData.username;
      }
      return next;
    });

    setGuestSyncSuccess(`Gastkonto @${importedGuestData.username} erfolgreich hinzugefügt!`);
    setTimeout(() => {
      setShowGuestSyncModal(false);
      setGuestSyncCode('');
      setImportedGuestData(null);
      setGuestSyncSuccess(null);
    }, 1200);
  };

  const executeStartGame = () => {
    let chosenPlayers = selectedPlayers.slice(0, playerCount);
    if (randomOrderOnStart) {
      const shuffled = [...chosenPlayers];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      chosenPlayers = shuffled;
    }

    if (onDiscardSavedGame) {
      onDiscardSavedGame();
    } else {
      localStorage.removeItem('dartcounter_saved_game');
    }
    setSavedMatch(null);

    onStartGame(chosenPlayers, {
      startScore,
      outMode,
      setsToWin: typeof setsToWin === 'number' ? setsToWin : 1,
      legsToWin: typeof legsToWin === 'number' ? legsToWin : 1,
      is2v2
    });
  };

  const handleStartGame = async () => {
    const chosenPlayers = selectedPlayers.slice(0, playerCount);

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      setErrorMsg("Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!");
      return;
    }
    
    if (chosenPlayers.some(p => !p || !p.trim())) {
      setErrorMsg('Bitte gib für jeden Spielerplatz einen Namen ein.');
      return;
    }

    const hasHuman = isGuest
       ? chosenPlayers.some(p => !guestBots[p])
       : chosenPlayers.some(p => profiles[p] && !profiles[p].isBot);

    if (!hasHuman) {
      setErrorMsg("Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!");
      return;
    }

    // 1. Nur blockieren, wenn dieses Profil GERADE auf einem fremden Gerät läuft.
    //
    // Previously any live sync code blocked local play, so simply owning a code
    // — or importing someone else's — meant you had to go and switch your own
    // sync off before you could start a match on your own device.
    if (user?.id) {
      const syncInfo = await getActiveUserSyncInfo(user.id);
      const coupledHost = syncInfo?.activeHost || syncInfo?.activeHosts?.[0];
      const syncOn = syncInfo?.syncEnabled === true
        || (syncInfo?.syncEnabled === undefined && !!syncInfo?.code && new Date(syncInfo.expiresAt) > new Date());
      if (syncInfo && syncOn && coupledHost) {
        setErrorMsg(`⚠️ Dein Profil ist aktuell auf '${coupledHost.hostName}' gekoppelt. Trenne die Verbindung im Profil-Tab, um hier wieder lokal zu spielen.`);
        return;
      }
    }

    // 2. Pre-flight: Sind verknüpfte Cloud-Gäste noch autorisiert?
    const hasLinkedGuests = chosenPlayers.some(p => profiles[p]?.isLinkedCloudGuest);
    if (hasLinkedGuests) {
      const check = await validateGuestSyncTokens(chosenPlayers, profiles);
      if (!check.valid) {
        // A cut link means the guest is gone: drop the profile and free the slot
        // rather than leaving a dead entry the user has to clear by hand.
        const { profiles: cleaned, removed } = removeLinkedGuestProfiles(profiles, check.revokedGuests);
        if (removed.length > 0 && setProfiles) {
          setProfiles(cleaned);
          saveProfiles(cleaned, user?.id).catch(err => reportPersistenceError(err, 'Profile konnten nicht gespeichert werden'));
          setPlayerOverrides(prev => prev.map(slot => (slot && removed.includes(slot) ? null : slot)));
        }
        setErrorMsg(`⚠️ Die Verbindung zu @${check.revokedGuests.join(', @')} wurde getrennt. Das Gastprofil wurde entfernt — bitte einen neuen Sync-Code anfordern.`);
        return;
      }
    }

    if (isGuest && setProfiles) {
      // Merge, never replace: a guest's accumulated stats live in these
      // profiles, and overwriting them with zeroed records wiped the local
      // history on every single start.
      const nextProfiles: Record<string, Profile> = { ...profiles };
      chosenPlayers.forEach(p => {
        const existing = nextProfiles[p];
        nextProfiles[p] = existing
          ? { ...existing, isBot: guestBots[p] || false }
          : {
              wins: 0, matches: 0, dartsThrown: 0, pointsScored: 0, highestThrow: 0,
              targetAverage: 40,
              isBot: guestBots[p] || false
            };
      });
      setProfiles(nextProfiles);
      saveProfiles(nextProfiles, null).catch(err => reportPersistenceError(err, 'Gastprofile konnten nicht gespeichert werden'));
    }

    if (hasSavedGame && savedMatch && !isSavedBannerDismissed) {
      setShowOverwriteModal(true);
      return;
    }

    executeStartGame();
  };

  // Avatar color generator based on name
  const getAvatarColor = (name: string) => {
    const colors = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--red)'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="screen active-screen" style={{ position: 'relative', overflowX: 'hidden' }}>
      <style>{`
        .hero-glow-bg-setup {
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
        .match-setup-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }
        @media (min-width: 768px) {
          .match-setup-grid {
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            align-items: start;
          }
        }
        @keyframes pulse-soft {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes slide-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .player-slot {
          transition: all 0.3s ease;
          overflow: hidden;
        }
        .player-slot.entering {
          animation: slide-down 0.3s ease forwards;
        }
        .drag-handle {
          cursor: grab;
          opacity: 0.5;
          padding: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 0.2s;
        }
        .drag-handle:hover {
          opacity: 1;
        }
        .drag-handle:active {
          cursor: grabbing;
        }
        .avatar-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
      `}</style>

      <div className="hero-glow-bg-setup" />

      <div className="app-header">
        <h1>🎯 Neues Spiel</h1>
        <p className="subtitle">Konfiguriere dein Match</p>
      </div>

      {hasSavedGame && !isSavedBannerDismissed && savedMatch && (
        <div className="card saved-game-card" style={{ 
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.18) 0%, rgba(15, 23, 42, 0.98) 100%)', 
          border: '1.5px solid rgba(59, 130, 246, 0.65)', 
          borderRadius: '16px',
          padding: '16px 18px',
          marginBottom: '22px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(59, 130, 246, 0.2)',
          position: 'relative'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.6rem' }}>🎯</span>
              <div>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.05rem', fontWeight: 800 }}>Laufendes Match gefunden</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #aaa)' }}>
                  {savedMatch.config.startScore} {savedMatch.config.outMode} {savedMatch.config.is2v2 ? '· 2v2 Doppel' : ''} · {savedMatch.config.setsToWin > 1 ? `Best of ${savedMatch.config.setsToWin} Sets` : `Best of ${savedMatch.config.legsToWin} Legs`}
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsSavedBannerDismissed(true)}
              style={{
                background: 'rgba(148, 163, 184, 0.12)',
                border: 'none',
                color: 'var(--text-dim, #aaa)',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '6px'
              }}
              title="Schließen"
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(savedMatch.players.length, 4)}, 1fr)`,
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.35)',
            padding: '10px',
            borderRadius: '10px',
            marginBottom: '14px'
          }}>
            {savedMatch.players.map((p, idx) => (
              <div key={idx} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.isBot ? '🤖 ' : ''}{p.name}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--blue, #3B82F6)' }}>
                  {p.score}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #888)' }}>
                  {p.legs} {p.legs === 1 ? 'Leg' : 'Legs'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button 
              className="btn-primary" 
              onClick={onResumeGame} 
              style={{ 
                flex: '1 1 160px', 
                fontWeight: 800, 
                padding: '11px 14px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                fontSize: '0.9rem'
              }}
            >
              ▶️ Spiel fortsetzen
            </button>

            <button 
              className="btn-secondary" 
              onClick={() => {
                if (onDiscardSavedGame) onDiscardSavedGame();
                else localStorage.removeItem('dartcounter_saved_game');
                setSavedMatch(null);
              }} 
              style={{ 
                flex: '1 1 160px', 
                fontWeight: 700, 
                padding: '11px 14px', 
                borderColor: 'rgba(255, 69, 58, 0.45)', 
                color: '#ff453a', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                fontSize: '0.9rem'
              }}
            >
              🗑️ Altes Spiel verwerfen
            </button>

            <button 
              className="btn-secondary" 
              onClick={() => setIsSavedBannerDismissed(true)} 
              style={{ 
                flex: '0 0 auto', 
                fontWeight: 600, 
                padding: '11px 14px',
                fontSize: '0.9rem'
              }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}

      <div className="match-setup-grid">
        <div className="card">
          <div className="card-header">
            <h2>Modus & Spieler</h2>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div className="segment-control" style={{ marginBottom: '10px' }}>
              <label className={!is2v2 ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="matchMode2v2" 
                  checked={!is2v2}
                  onChange={() => {
                    setIs2v2(false);
                    // 2v2 forces four slots; going back to singles restores the
                    // player count the user last chose there.
                    const saved = parseInt(localStorage.getItem('dart_x01_playerCount') || '2', 10);
                    setPlayerCount(!isNaN(saved) && saved >= 1 && saved <= 4 ? saved : 2);
                  }}
                />
                <span>👤 Einzel</span>
              </label>
              <label className={is2v2 ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="matchMode2v2" 
                  checked={is2v2} 
                  onChange={() => {
                    setIs2v2(true);
                    setPlayerCount(4);
                  }} 
                />
                <span>👥 2v2 Doppel</span>
              </label>
            </div>

            {is2v2 ? (
              <div style={{
                background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.12), rgba(90, 200, 250, 0.06))',
                border: '1px solid rgba(10, 132, 255, 0.3)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.82rem',
                lineHeight: 1.4,
                color: 'var(--text)',
                marginBottom: '12px'
              }}>
                ❄️ <strong>Freeze-Regel:</strong> Geworfen wird alternierend (T1 ➔ T2 ➔ T1 ➔ T2). Ein Team gewinnt bei 0 Rest nur, wenn die eigenen Teampunkte ≤ den Gegnerpunkten sind!
              </div>
            ) : (
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
                    <span>{count} {count === 1 ? 'Spieler' : 'Spieler'}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        
          <div className="player-selects" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {Array.from({ length: 4 }).map((_, i) => {
            const isVisible = i < playerCount;
            const playerName = selectedPlayers[i] || '';
            const isBot = isGuest ? guestBots[playerName] : profiles[playerName]?.isBot;
            const slotTeam = (i % 2 === 0 ? 1 : 2);
            const teamColor = slotTeam === 1 ? 'var(--blue, #3B82F6)' : 'var(--orange, #F97316)';
            
            return (
              <div 
                key={i} 
                className="player-slot"
                style={{ 
                  display: isVisible ? 'block' : 'none',
                  opacity: isVisible ? 1 : 0,
                  height: isVisible ? 'auto' : 0,
                }}
                draggable={isVisible}
                onDragStart={(e) => handleDragStart(e, i)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, i)}
                onDrop={(e) => handleDrop(e, i)}
              >
                <div 
                  className="player-select-wrapper" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    background: 'var(--surface)',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius)',
                    border: is2v2 ? `1px solid ${teamColor}` : '1px solid var(--card-border)',
                    borderLeft: is2v2 ? `4px solid ${teamColor}` : undefined
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="drag-handle" title="Zum Verschieben ziehen">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 4h12v2H2V4zm0 6h12v2H2v-2z" />
                      </svg>
                    </div>
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
                  </div>

                  {is2v2 && (
                    <span style={{
                      background: slotTeam === 1 ? 'rgba(10, 132, 255, 0.2)' : 'rgba(255, 159, 10, 0.2)',
                      color: teamColor,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      flexShrink: 0
                    }}>
                      T{slotTeam}
                    </span>
                  )}
                  
                  <div className="avatar-circle" style={{ backgroundColor: is2v2 ? teamColor : getAvatarColor(playerName || `Gast ${i+1}`) }}>
                    {isBot ? '🤖' : (playerName.charAt(0).toUpperCase() || '?')}
                  </div>

                  {isGuest ? (
                     <div style={{ flex: 1, display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input 
                          type="text" 
                          value={playerName} 
                          onChange={e => handlePlayerChange(i, e.target.value)} 
                          placeholder={is2v2 ? `Team ${slotTeam} Spieler ${i < 2 ? 1 : 2}` : `Spieler ${i + 1}`} 
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
                      {profileNames.map(name => {
                        const isCloudGuest = profiles[name]?.isLinkedCloudGuest;
                        const isBot = profiles[name]?.isBot;
                        return (
                          <option 
                            key={name} 
                            value={name} 
                            style={{ color: '#000', background: '#fff' }}
                          >
                            {isCloudGuest ? '🔗 ' : (isBot ? '🤖 ' : '👤 ')}{name}{isCloudGuest ? ' (Cloud-Gast)' : (isBot ? ' (Bot)' : '')}
                          </option>
                        );
                      })}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isGuest && (
          <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowGuestSyncModal(true)}
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              ☁️ Cloud-Gast via Sync-Code hinzufügen
            </button>
          </div>
        )}

        {errorMsg && (
          <div style={{
            background: 'var(--red)',
            color: 'white',
            padding: '12px',
            borderRadius: 'var(--radius)',
            marginTop: '15px',
            animation: 'slide-down 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 'bold'
          }}>
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
           <label style={{ 
             display: 'flex', 
             alignItems: 'center', 
             gap: '12px', 
             padding: '14px 16px', 
             background: randomOrderOnStart ? 'rgba(10, 132, 255, 0.12)' : 'var(--surface)', 
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
               style={{ width: '20px', height: '20px', accentColor: 'var(--blue)', cursor: 'pointer' }}
             />
             <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
               <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95em' }}>
                 🎲 Zufällige Reihenfolge beim Start
               </span>
               <span style={{ fontSize: '0.8em', color: 'var(--text-dim)' }}>
                 {randomOrderOnStart 
                   ? 'Aktiv: Reihenfolge wird beim Klick auf „Spiel starten“ ausgelost' 
                   : 'Inaktiv: Ausgewählte Reihenfolge wird übernommen'}
               </span>
             </div>
           </label>

           {!randomOrderOnStart && (
             <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button 
                  className="btn-secondary" 
                  onClick={randomizeOrder} 
                  style={{ 
                    fontSize: '0.9em', 
                    padding: '8px 16px', 
                    minHeight: '40px',
                    transform: isShuffling ? 'scale(0.95)' : 'scale(1)',
                    transition: 'transform 0.1s'
                  }}
                >
                   🔀 Jetzt einmalig mischen
                </button>
             </div>
           )}
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ marginBottom: '15px', borderBottom: '1px solid var(--card-border)', paddingBottom: '10px' }}>
          <h2>Spieleinstellungen</h2>
        </div>
        
        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '14px', color: 'var(--text)' }}>Distanz</h3>
          <div className="distance-grid">
            <div className="distance-card">
              <div className="distance-header">
                <span className="distance-title">Sets</span>
                <span className="distance-subtitle">Gewinnsätze</span>
              </div>
              <div className="stepper-box">
                <button 
                  type="button"
                  className="stepper-btn" 
                  onClick={() => setSetsToWin(Math.max(1, (parseInt(setsToWin.toString()) || 1) - 1))}
                  disabled={parseInt(setsToWin.toString()) <= 1}
                  aria-label="Sets verringern"
                >
                  −
                </button>
                <div className="stepper-val-wrap">
                  <input 
                    type="number" 
                    min="1" 
                    max="10" 
                    value={setsToWin} 
                    onChange={(e) => setSetsToWin(e.target.value === '' ? '' : Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} 
                    onBlur={() => { if (setsToWin === '') setSetsToWin(1) }}
                    className="stepper-input"
                  />
                  <span className="stepper-unit">First to {setsToWin || 1}</span>
                </div>
                <button 
                  type="button"
                  className="stepper-btn" 
                  onClick={() => setSetsToWin(Math.min(10, (parseInt(setsToWin.toString()) || 1) + 1))}
                  disabled={parseInt(setsToWin.toString()) >= 10}
                  aria-label="Sets erhöhen"
                >
                  +
                </button>
              </div>
            </div>

            <div className="distance-card">
              <div className="distance-header">
                <span className="distance-title">Legs</span>
                <span className="distance-subtitle">pro Satz</span>
              </div>
              <div className="stepper-box">
                <button 
                  type="button"
                  className="stepper-btn" 
                  onClick={() => setLegsToWin(Math.max(1, (parseInt(legsToWin.toString()) || 1) - 1))}
                  disabled={parseInt(legsToWin.toString()) <= 1}
                  aria-label="Legs verringern"
                >
                  −
                </button>
                <div className="stepper-val-wrap">
                  <input 
                    type="number" 
                    min="1" 
                    max="15" 
                    value={legsToWin} 
                    onChange={(e) => setLegsToWin(e.target.value === '' ? '' : Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))} 
                    onBlur={() => { if (legsToWin === '') setLegsToWin(1) }}
                    className="stepper-input"
                  />
                  <span className="stepper-unit">First to {legsToWin || 1}</span>
                </div>
                <button 
                  type="button"
                  className="stepper-btn" 
                  onClick={() => setLegsToWin(Math.min(15, (parseInt(legsToWin.toString()) || 1) + 1))}
                  disabled={parseInt(legsToWin.toString()) >= 15}
                  aria-label="Legs erhöhen"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '15px', color: 'var(--text)' }}>Startpunktzahl</h3>
          <div className="segment-control">
            {[301, 501, 701, 1001].map(score => (
              <label key={score} className={startScore === score ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="startScore" 
                  value={score} 
                  checked={startScore === score}
                  onChange={() => setStartScore(score)}
                />
                <span>{score}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <h3 style={{ fontSize: '1.1em', marginBottom: '15px', color: 'var(--text)' }}>Out-Modus</h3>
          <div className="segment-control">
            {([['SO', 'Single'], ['DO', 'Double'], ['MO', 'Master']] as const).map(([value, label]) => (
              <label key={value} className={outMode === value ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="outMode" 
                  value={value}
                  checked={outMode === value}
                  onChange={() => setOutMode(value as 'SO' | 'DO' | 'MO')}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>

      <div style={{ 
        position: 'sticky', 
        bottom: '20px', 
        zIndex: 10,
        padding: '0 10px'
      }}>
        <button 
          className="btn-success btn-large" 
          onClick={handleStartGame} 
          style={{ 
            width: '100%', 
            minHeight: '56px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            fontSize: '1.2em'
          }}
        >
          🎯 Spiel starten
        </button>
      </div>
      
      {/* spacer for bottom nav */}
      <div style={{ height: '80px' }}></div>

      {showOverwriteModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.78)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="card" style={{
            maxWidth: '460px',
            width: '100%',
            background: 'rgba(24, 24, 34, 0.98)',
            border: '1.5px solid rgba(10, 132, 255, 0.65)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)'
          }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Laufendes Match gefunden
            </h3>
            <p style={{ color: 'var(--text-dim, #ccc)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '20px' }}>
              Du hast noch ein unvollendetes Spiel gespeichert. Wie möchtest du fortfahren?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowOverwriteModal(false);
                  if (onResumeGame) onResumeGame();
                }}
                style={{ padding: '13px', fontWeight: 800, fontSize: '0.95rem' }}
              >
                ▶️ Aktuelles Spiel fortsetzen
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  setShowOverwriteModal(false);
                  executeStartGame();
                }}
                style={{ background: 'linear-gradient(135deg, #ff3b30, #c70000)', borderColor: '#ff3b30', padding: '13px', fontWeight: 800, fontSize: '0.95rem' }}
              >
                🆕 Altes verwerfen & Neues Spiel starten
              </button>
              <button
                className="btn-secondary"
                onClick={() => setShowOverwriteModal(false)}
                style={{ padding: '11px', fontWeight: 600 }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ☁️ Modal: Gast via Sync-Code importieren */}
      {showGuestSyncModal && (
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
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>☁️ Gast via Sync-Code hinzufügen</h3>
              <button 
                className="btn-ghost" 
                onClick={() => {
                  setShowGuestSyncModal(false);
                  setGuestSyncError(null);
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
                value={guestSyncCode}
                onChange={(e) => setGuestSyncCode(e.target.value)}
                style={{ 
                  fontSize: '1.3rem', 
                  textAlign: 'center', 
                  letterSpacing: '0.1em', 
                  fontWeight: 800,
                  fontFamily: 'var(--font-mono)' 
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckGuestSyncCode()}
              />
              <button 
                className="btn-primary" 
                onClick={handleCheckGuestSyncCode}
                disabled={guestSyncLoading || guestSyncCode.trim().length < 6}
                style={{ padding: '0 16px', whiteSpace: 'nowrap' }}
              >
                {guestSyncLoading ? 'Prüfe...' : 'Suchen'}
              </button>
            </div>

            {guestSyncError && (
              <div style={{ 
                background: 'rgba(239, 68, 68, 0.15)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                color: 'var(--red)', 
                padding: '10px 12px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                marginBottom: '14px' 
              }}>
                ⚠️ {guestSyncError}
              </div>
            )}

            {guestSyncSuccess && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.15)', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                color: 'var(--green, #10B981)', 
                padding: '10px 12px', 
                borderRadius: '8px', 
                fontSize: '0.85rem', 
                marginBottom: '14px' 
              }}>
                ✅ {guestSyncSuccess}
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
                    onClick={handleConfirmGuestImport}
                    style={{ flex: 1, padding: '10px' }}
                  >
                    ➕ Als Mitspieler hinzufügen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
