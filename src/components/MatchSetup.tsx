import React, { useState, useEffect } from 'react';
import type { GameConfig, Profile } from '../types';
import { useAuthStore } from '../store/useAuthStore';

interface MatchSetupProps {
  profiles: Record<string, Profile>;
  onStartGame: (players: string[], config: GameConfig) => void;
  hasSavedGame?: boolean;
  onResumeGame?: () => void;
  setProfiles?: (profiles: Record<string, Profile>) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ profiles, onStartGame, hasSavedGame, onResumeGame, setProfiles }) => {
  const { user } = useAuthStore();
  const isGuest = !user;

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

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>(
    isGuest ? ['Gast 1', 'Gast 2', 'Gast 3', 'Gast 4'] : []
  );
  const [guestBots, setGuestBots] = useState<Record<string, boolean>>({});
  
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
    if (is2v2) {
      setPlayerCount(4);
    }
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

  useEffect(() => {
    if (!isGuest && profileNames.length > 0 && selectedPlayers.length === 0) {
      const initial: string[] = [];
      const humans = profileNames.filter(n => !profiles[n].isBot);
      const bots = profileNames.filter(n => profiles[n].isBot);
      
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
      setSelectedPlayers(initial);
    }
  }, [profileNames.length, isGuest]);

  useEffect(() => {
     if (isGuest) {
        setSelectedPlayers(prev => {
           const next = [...prev];
           for (let i = 0; i < playerCount; i++) {
              if (!next[i]) next[i] = `Gast ${i + 1}`;
           }
           return next;
        });
     }
  }, [playerCount, isGuest]);

  // Clear error when selected players change
  useEffect(() => {
    if (errorMsg) setErrorMsg(null);
  }, [selectedPlayers, guestBots, playerCount]);

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

  const handleStartGame = () => {
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

    onStartGame(chosenPlayers, {
      startScore,
      outMode,
      setsToWin: typeof setsToWin === 'number' ? setsToWin : 1,
      legsToWin: typeof legsToWin === 'number' ? legsToWin : 1,
      is2v2
    });
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
          background: radial-gradient(circle, rgba(0, 210, 106, 0.12) 0%, rgba(10, 132, 255, 0.06) 50%, transparent 70%);
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
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(10, 132, 255, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(10, 132, 255, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(10, 132, 255, 0); }
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

      {hasSavedGame && onResumeGame && (
        <div className="card" style={{ 
          background: 'linear-gradient(135deg, rgba(10, 132, 255, 0.2), rgba(10, 132, 255, 0.05))', 
          borderColor: 'var(--blue)', 
          marginBottom: '20px',
          animation: 'pulse-soft 2s infinite ease-in-out'
        }}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>Laufendes Match gefunden</h3>
            <button 
              className="btn-primary" 
              onClick={onResumeGame} 
              style={{ fontWeight: 'bold' }}
            >
              Laufendes Match fortsetzen
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
                  onChange={() => setIs2v2(false)} 
                />
                <span>👤 Einzel</span>
              </label>
              <label className={is2v2 ? 'active' : ''}>
                <input 
                  type="radio" 
                  name="matchMode2v2" 
                  checked={is2v2} 
                  onChange={() => setIs2v2(true)} 
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
            const teamColor = slotTeam === 1 ? 'var(--blue, #0a84ff)' : 'var(--orange, #ff9f0a)';
            
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
    </div>
  );
};
