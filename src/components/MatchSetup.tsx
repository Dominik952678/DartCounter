import React, { useState, useEffect } from 'react';
import type { GameConfig, Profile } from '../types';

interface MatchSetupProps {
  profiles: Record<string, Profile>;
  onStartGame: (players: string[], config: GameConfig) => void;
}

export const MatchSetup: React.FC<MatchSetupProps> = ({ profiles, onStartGame }) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [setsToWin, setSetsToWin] = useState<number | ''>(1);
  const [legsToWin, setLegsToWin] = useState<number | ''>(3);
  const [startScore, setStartScore] = useState(501);
  const [outMode, setOutMode] = useState<'SO' | 'DO' | 'MO'>('DO');

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

  const handleStartGame = () => {
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

    onStartGame(chosenPlayers, {
      startScore,
      outMode,
      setsToWin: typeof setsToWin === 'number' ? setsToWin : 1,
      legsToWin: typeof legsToWin === 'number' ? legsToWin : 3
    });
  };

  return (
    <div className="screen active-screen">
      <div className="app-header">
        <h1>🎯 Neues Spiel</h1>
        <p className="subtitle">Konfiguriere dein Match</p>
      </div>

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
            <div key={i} className="player-select-wrapper">
              <span className="player-number">{i + 1}</span>
              <select 
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
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Spielmodus</h2>
        </div>
        
        <div className="input-row">
          <div>
            <label className="section-label">Sets</label>
            <input 
              type="number" 
              min="1" 
              max="10" 
              value={setsToWin} 
              onChange={(e) => setSetsToWin(e.target.value === '' ? '' : Math.min(10, Math.max(1, parseInt(e.target.value) || 1)))} 
              onBlur={() => { if (setsToWin === '') setSetsToWin(1) }}
            />
          </div>
          <div>
            <label className="section-label">Legs</label>
            <input 
              type="number" 
              min="1" 
              max="15" 
              value={legsToWin} 
              onChange={(e) => setLegsToWin(e.target.value === '' ? '' : Math.min(15, Math.max(1, parseInt(e.target.value) || 1)))} 
              onBlur={() => { if (legsToWin === '') setLegsToWin(1) }}
            />
          </div>
        </div>

        <label className="section-label">Punkte</label>
        <div className="segment-control">
          {[301, 501].map(score => (
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
        
        <label className="section-label">Out-Modus</label>
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

      <button className="btn-success btn-large" onClick={handleStartGame} style={{ marginTop: '10px' }}>
        🎯 Spiel starten
      </button>
      
      {/* spacer for bottom nav */}
      <div style={{ height: '120px' }}></div>
    </div>
  );
};
