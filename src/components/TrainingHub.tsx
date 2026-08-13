import React, { useState, useEffect } from 'react';
import type { Profile } from '../types';

export type MiniGameMode = 'checkout' | 'powerscoring' | 'splitscore';

interface TrainingHubProps {
  profiles: Record<string, Profile>;
  onStartMiniGame: (mode: MiniGameMode, players: string[], settings: any) => void;
}

export const TrainingHub: React.FC<TrainingHubProps> = ({ profiles, onStartMiniGame }) => {
  const [selectedMode, setSelectedMode] = useState<MiniGameMode>('checkout');
  const [playerCount, setPlayerCount] = useState<number>(1);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [powerScoringRounds, setPowerScoringRounds] = useState<number>(10);
  const [checkoutRounds, setCheckoutRounds] = useState<number>(1);
  const [checkoutTargets, setCheckoutTargets] = useState<number>(10);

  const profileNames = Object.keys(profiles);

  useEffect(() => {
    if (profileNames.length > 0 && selectedPlayers.length === 0) {
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
  }, [profileNames.length]);

  const handlePlayerChange = (index: number, name: string) => {
    const newSelected = [...selectedPlayers];
    newSelected[index] = name;
    setSelectedPlayers(newSelected);
  };

  const handleStart = () => {
    const chosenPlayers = selectedPlayers.slice(0, playerCount);

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      alert("Ein Spieler kann nicht mehrfach antreten. Bitte wähle unterschiedliche Spieler!");
      return;
    }
    
    const hasHuman = chosenPlayers.some(p => profiles[p] && !profiles[p].isBot);
    if (!hasHuman) {
      alert("Ein Spiel nur mit Bots ist nicht möglich. Bitte wähle mindestens einen echten Spieler!");
      return;
    }

    onStartMiniGame(selectedMode, chosenPlayers, {
      rounds: powerScoringRounds,
      checkoutRounds: checkoutRounds,
      checkoutTargets: checkoutTargets
    });
  };

  return (
    <div className="training-hub screen active-screen">
      <div className="app-header" style={{ marginBottom: '20px' }}>
        <h2>Training & Mini-Games</h2>
        <p className="subtitle">Verbessere deine Fähigkeiten</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'stretch' }}>
        {/* Modes Column */}
        <div className="card">
          <div className="card-header">
            <h2>Modus wählen</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              className={`btn ${selectedMode === 'checkout' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedMode('checkout')}
              style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em' }}
            >
              🎯 Checkout Training
            </button>
            <button 
              className={`btn ${selectedMode === 'powerscoring' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedMode('powerscoring')}
              style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em' }}
            >
              🔥 Power Scoring
            </button>
            <button 
              className={`btn ${selectedMode === 'splitscore' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedMode('splitscore')}
              style={{ padding: '15px', textAlign: 'left', fontSize: '1.1em' }}
            >
              ➗ Split Score (Halve-It)
            </button>
          </div>
        </div>

        {/* Settings Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h2>Spieler</h2>
            </div>
            <div className="segment-control">
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
            <div className="player-selects">
              {Array.from({ length: playerCount }).map((_, i) => (
                <select 
                  key={i} 
                  value={selectedPlayers[i] || ''}
                  onChange={(e) => handlePlayerChange(i, e.target.value)}
                >
                  {profileNames.map(name => (
                    <option 
                      key={name} 
                      value={name}
                      disabled={selectedPlayers.includes(name) && selectedPlayers[i] !== name}
                    >
                      {profiles[name]?.isBot ? '🤖 ' : ''}{name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
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
              <p style={{ fontSize: '0.85em', color: '#888', marginTop: '10px', textAlign: 'center' }}>
                1 Runde = 3 Darts um das Finish zu checken.
              </p>
            </div>
            </>
          )}

          <button className="btn-success btn-large" onClick={handleStart}>
            🚀 Starten
          </button>
        </div>
      </div>
      
      {/* spacer for bottom nav */}
      <div style={{ height: '120px' }}></div>
    </div>
  );
};
