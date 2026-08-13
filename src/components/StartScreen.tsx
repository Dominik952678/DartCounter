import React, { useState } from 'react';
import type { GameConfig, Profile, MatchHistory } from '../types';
import { ProfileDashboard } from './ProfileDashboard';

interface StartScreenProps {
  profiles: Record<string, Profile>;
  matches: MatchHistory[];
  onCreateProfile: (name: string, isBot?: boolean, targetAverage?: number) => void;
  onUpdateProfile: (name: string, updates: Partial<Profile>) => void;
  onDeleteProfile: (name: string) => void;
  onStartGame: (players: string[], config: GameConfig) => void;
  onShowHistory: () => void;
  onStartTraining: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  profiles,
  matches,
  onCreateProfile,
  onUpdateProfile,
  onDeleteProfile,
  onStartGame,
  onShowHistory,
  onStartTraining
}) => {
  const [newProfileName, setNewProfileName] = useState('');
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [setsToWin, setSetsToWin] = useState(1);
  const [legsToWin, setLegsToWin] = useState(3);
  const [startScore, setStartScore] = useState(501);
  const [outMode, setOutMode] = useState<'SO' | 'DO' | 'MO'>('DO');
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  
  const [isBotChecked, setIsBotChecked] = useState(false);
  const [botLevel, setBotLevel] = useState<number>(3);

  const handleCreateProfile = () => {
    const name = newProfileName.trim();
    if (!name || profiles[name]) {
      alert("Ungültiger oder bestehender Name.");
      return;
    }
    onCreateProfile(name, isBotChecked, isBotChecked ? (botLevel * 10 + 20) : undefined);
    setNewProfileName('');
    setIsBotChecked(false);
    setBotLevel(3);
  };

  const handlePlayerChange = (index: number, name: string) => {
    const newSelected = [...selectedPlayers];
    newSelected[index] = name;
    setSelectedPlayers(newSelected);
  };

  const handleStartGame = () => {
    const chosenPlayers = selectedPlayers.slice(0, playerCount);
    
    const profileNames = Object.keys(profiles);
    for (let i = 0; i < playerCount; i++) {
        if (!chosenPlayers[i]) {
            chosenPlayers[i] = profileNames[i % profileNames.length] || `Gast ${i+1}`;
        }
    }

    if (new Set(chosenPlayers).size !== chosenPlayers.length) {
      if (!window.confirm("Doppelte Spieler gewählt. Starten?")) return;
    }

    onStartGame(chosenPlayers, {
      startScore,
      outMode,
      setsToWin,
      legsToWin
    });
  };

  const profileNames = Object.keys(profiles);

  return (
    <div className="start-screen">
      <div className="app-header">
        <h1>🎯 Dartcounter</h1>
      </div>
      
      {/* Profiles Section */}
      <div className="card">
        <div className="card-header">
          <h2>Profile</h2>
          <span className="card-badge">{profileNames.length}</span>
        </div>
        
        {profileNames.length > 0 && (
          <div className="profile-chips">
            {profileNames.map(name => (
              <button 
                key={name} 
                className="profile-chip" 
                onClick={() => setViewProfile(name)}
              >
                <span className="chip-icon">{profiles[name]?.isBot ? '🤖' : '👤'}</span>
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
        
        <div className="create-profile-form">
          <div className="form-row">
            <input 
              type="text" 
              placeholder="Neues Profil erstellen..."
              value={newProfileName}
              onChange={(e) => setNewProfileName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
            />
            <button className="btn-primary" onClick={handleCreateProfile}>+</button>
          </div>
          <div className="form-options">
            <label className="checkbox-label">
              <input 
                type="checkbox" 
                checked={isBotChecked}
                onChange={(e) => setIsBotChecked(e.target.checked)}
              />
              <span>🤖 Bot</span>
            </label>
            {isBotChecked && (
              <select 
                value={botLevel}
                onChange={(e) => setBotLevel(parseInt(e.target.value) || 3)}
                className="bot-level-select"
              >
                {[1,2,3,4,5,6,7,8,9,10].map(l => (
                  <option key={l} value={l}>Lvl {l} · Avg {l*10 + 20}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Player Selection */}
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
              value={selectedPlayers[i] || profileNames[i] || ''}
              onChange={(e) => handlePlayerChange(i, e.target.value)}
            >
              {profileNames.map(name => (
                <option key={name} value={name}>{profiles[name]?.isBot ? '🤖 ' : ''}{name}</option>
              ))}
            </select>
          ))}
        </div>
      </div>

      {/* Game Config */}
      <div className="card">
        <div className="card-header">
          <h2>Modus</h2>
        </div>
        
        <div className="config-grid">
          <div className="config-item">
            <label className="section-label">Sets</label>
            <input 
              type="number" 
              value={setsToWin} 
              min="1" max="10"
              onChange={(e) => setSetsToWin(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="config-item">
            <label className="section-label">Legs</label>
            <input 
              type="number" 
              value={legsToWin} 
              min="1" max="15"
              onChange={(e) => setLegsToWin(parseInt(e.target.value) || 1)}
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

      {/* Actions */}
      <div className="start-actions">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <button className="btn-secondary btn-large" onClick={onStartTraining} style={{ flex: 1, padding: '15px' }}>
            🏋️ Training & Modi
          </button>
          <button className="btn-secondary btn-large" onClick={() => onStartGame(selectedPlayers.slice(0, playerCount), { startScore: 501, outMode: 'DO', setsToWin: 1, legsToWin: 3 })} style={{ flex: 1, padding: '15px' }}>
            ⚡ Schnelles Spiel
          </button>
        </div>
        
        <button className="btn-success btn-large" onClick={handleStartGame}>
          🎯 Spiel starten
        </button>
        <button className="btn-ghost" onClick={onShowHistory}>
          Match Historie
        </button>
      </div>

      {viewProfile && profiles[viewProfile] && (
        <ProfileDashboard 
          profileName={viewProfile}
          profile={profiles[viewProfile]}
          matches={matches}
          onUpdateProfile={onUpdateProfile}
          onDeleteProfile={onDeleteProfile}
          allProfiles={profiles}
          onClose={() => setViewProfile(null)}
        />
      )}
    </div>
  );
};
