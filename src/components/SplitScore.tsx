import React, { useState, useEffect } from 'react';
import type { Profile, Dart } from '../types';
import { playDartHitSound, playSciFiHitSound } from '../utils/audio';

interface SplitScoreProps {
  players: string[];
  profiles: Record<string, Profile>;
  onFinish: (results: { name: string; score: number }[]) => void;
  onAbort: () => void;
}

interface PlayerState {
  name: string;
  score: number;
  isBot: boolean;
  targetAverage: number;
  color?: string;
}

const TARGETS = [
  { label: '15', type: 'number', val: 15 },
  { label: '16', type: 'number', val: 16 },
  { label: 'Double', type: 'modifier', val: 2 },
  { label: '17', type: 'number', val: 17 },
  { label: '18', type: 'number', val: 18 },
  { label: 'Triple', type: 'modifier', val: 3 },
  { label: '19', type: 'number', val: 19 },
  { label: '20', type: 'number', val: 20 },
  { label: 'BULL', type: 'number', val: 25 },
];

export const SplitScore: React.FC<SplitScoreProps> = ({ players, profiles, onFinish, onAbort }) => {
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => ({
      name: p,
      score: 40,
      isBot: profiles[p]?.isBot || false,
      targetAverage: profiles[p]?.targetAverage || 40,
      color: profiles[p]?.color
    }))
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRoundIndex, setCurrentRoundIndex] = useState(0);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeP = gameState[activePlayer];
  const currentTarget = TARGETS[currentRoundIndex];

  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRoundIndex < TARGETS.length) {
      const timer = setTimeout(() => {
        // Bot logic for SplitScore
        // To simplify, if target is number, try to hit it using its targetAverage
        // If target is Double/Triple, aim for 20 Double/Triple or just random
        let aimBase = 20;
        if (currentTarget.type === 'number') {
            aimBase = currentTarget.val;
        }

        // Just use getBotDart, but we will hack it a bit for specific targets
        let mult = 1;
        let base = aimBase;
        
        const hitChance = Math.max(0.1, Math.min(0.8, activeP.targetAverage / 120));
        
        if (currentTarget.type === 'modifier') {
            if (Math.random() < hitChance) {
                mult = currentTarget.val; // hit double or triple
                base = 20; // assumed 20
            } else {
                mult = 1; // missed modifier
                base = 20;
            }
        } else {
            if (Math.random() < hitChance) {
                base = aimBase;
                if (Math.random() < 0.2) mult = 2; // lucky double
                if (Math.random() < 0.1 && base !== 25) mult = 3; // lucky triple
            } else {
                base = 1; // missed
            }
        }

        handleDart(base, mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, currentRoundDarts, isProcessing, currentRoundIndex]);

  const handleDart = (base: number, overrideMult?: number) => {
    if (isProcessing) return;

    let mult = overrideMult ?? currentMultiplier;
    if (base === 25 && mult === 3) mult = 1;
    
    const value = base * mult;
    const dart: Dart = {
      base,
      mult,
      value,
      label: base === 0 ? 'MISS' : base === 25 ? (mult === 2 ? 'DB' : 'BULL') : `${mult === 3 ? 'T' : mult === 2 ? 'D' : ''}${base}`
    };

    const newDarts = [...currentRoundDarts, dart];
    setCurrentRoundDarts(newDarts);
    setCurrentMultiplier(1);

    if (base === 20 && mult === 3) {
      playSciFiHitSound('T20');
    } else if (base === 19 && mult === 3) {
      playSciFiHitSound('T19');
    } else if (base === 25 && mult === 2) {
      playSciFiHitSound('Bull');
    } else {
      playDartHitSound();
    }

    if (newDarts.length === 3) {
      setIsProcessing(true);
      setTimeout(() => {
        processRoundEnd(newDarts);
      }, 1000);
    }
  };

  const processRoundEnd = (darts: Dart[]) => {
    let roundScore = 0;
    let hitAny = false;

    for (const d of darts) {
      if (currentTarget.type === 'number') {
        if (d.base === currentTarget.val) {
          roundScore += d.value;
          hitAny = true;
        }
      } else if (currentTarget.type === 'modifier') {
        if (d.mult === currentTarget.val && d.base !== 0) {
          roundScore += d.value;
          hitAny = true;
        }
      }
    }
    
    setGameState(prev => {
      const newState = [...prev];
      if (hitAny) {
        newState[activePlayer].score += roundScore;
      } else {
        newState[activePlayer].score = Math.floor(newState[activePlayer].score / 2);
      }
      return newState;
    });

    if (activePlayer === players.length - 1) {
      if (currentRoundIndex === TARGETS.length - 1) {
        // Game Over
        setTimeout(() => {
          // calculate final results with the updated state
          setGameState(finalState => {
            onFinish(finalState.map(p => ({ name: p.name, score: p.score })));
            return finalState;
          });
        }, 100);
        return;
      } else {
        setCurrentRoundIndex(prev => prev + 1);
      }
    }
    
    setActivePlayer((activePlayer + 1) % players.length);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  };

  const undoSingleDart = () => {
    if (currentRoundDarts.length > 0 && !isProcessing) {
      setCurrentRoundDarts(prev => prev.slice(0, -1));
    }
  };

  // Compute live score for active player
  const getLiveScore = () => {
    let rs = 0;
    for (const d of currentRoundDarts) {
      if (currentTarget.type === 'number' && d.base === currentTarget.val) {
        rs += d.value;
      } else if (currentTarget.type === 'modifier' && d.mult === currentTarget.val && d.base !== 0) {
        rs += d.value;
      }
    }
    return activeP.score + rs;
  };

  return (
    <div className="screen active-screen">
      <div className="app-header" style={{ marginBottom: '10px' }}>
        <button className="btn-danger" onClick={onAbort} style={{ width: 'auto' }}>Abbrechen</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ margin: 0 }}>➗ Split Score</h2>
          <span style={{ color: '#999', fontSize: '0.9em' }}>Ziel: {currentTarget?.label} ({currentRoundIndex + 1}/{TARGETS.length})</span>
        </div>
        <div style={{ width: '80px' }}></div>
      </div>

      <div className="scoreboard" style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0' }}>
        {gameState.map((p, i) => (
          <div 
            key={i} 
            className={`player ${i === activePlayer ? 'active' : ''}`}
            style={{ flex: 1, minWidth: '150px', borderLeftColor: i === activePlayer ? p.color : undefined }}
          >
            <h3 className="player-name">{p.isBot ? '🤖 ' : ''}{p.name}</h3>
            <div className="score" style={{ fontSize: '3em', margin: '10px 0' }}>
              {i === activePlayer ? getLiveScore() : p.score}
            </div>
            {i === activePlayer && (
               <div style={{ color: currentRoundDarts.length > 0 ? (getLiveScore() > p.score ? '#34c759' : '#ff3b30') : '#999', fontWeight: 'bold' }}>
                 {currentRoundDarts.length === 3 && getLiveScore() === p.score ? 'Halbiert!' : 'Wurf...'}
               </div>
            )}
          </div>
        ))}
      </div>
      
      <div style={{ textAlign: 'center', padding: '20px', background: '#1c1c1e', borderRadius: '12px', margin: '10px 20px' }}>
         <div style={{ fontSize: '1.2em', color: '#999' }}>Aktuelles Ziel</div>
         <div style={{ fontSize: '4em', fontWeight: 'bold', color: '#fff' }}>{currentTarget?.label}</div>
      </div>

      {/* Custom Keypad for Split Score */}
      <div className="keypad" style={{ marginTop: '20px', padding: '0 20px' }}>
        <div className="dart-display">
          {[0,1,2].map(i => (
            <div key={i} className={`dart-box ${currentRoundDarts[i] ? 'dart-filled' : ''} ${currentRoundDarts[i]?.mult === 2 ? 'dart-double' : ''} ${currentRoundDarts[i]?.mult === 3 ? 'dart-triple' : ''}`}>
              {currentRoundDarts[i]?.label || ''}
            </div>
          ))}
          <div className="round-total">
            {currentRoundDarts.length > 0 ? getLiveScore() - activeP.score : 0}
          </div>
        </div>

        {currentTarget?.type === 'number' && currentTarget?.val !== 25 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button className="num-btn" onClick={() => handleDart(0, 1)} style={{ color: 'var(--red)' }}>Miss</button>
            <button className="num-btn" onClick={() => handleDart(currentTarget.val, 1)}>Single ({currentTarget.val})</button>
            <button className="num-btn" onClick={() => handleDart(currentTarget.val, 2)} style={{ color: 'var(--orange)' }}>Double ({currentTarget.val * 2})</button>
            <button className="num-btn" onClick={() => handleDart(currentTarget.val, 3)} style={{ color: 'var(--red)' }}>Triple ({currentTarget.val * 3})</button>
          </div>
        )}

        {currentTarget?.type === 'number' && currentTarget?.val === 25 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <button className="num-btn" onClick={() => handleDart(0, 1)} style={{ color: 'var(--red)' }}>Miss</button>
            <button className="num-btn" onClick={() => handleDart(25, 1)}>Single Bull (25)</button>
            <button className="num-btn" onClick={() => handleDart(25, 2)} style={{ color: 'var(--red)' }}>Double Bull (50)</button>
          </div>
        )}

        {currentTarget?.type === 'modifier' && (
          <div className="numpad-grid">
            {Array.from({length: 20}, (_, i) => i + 1).map(num => (
              <button 
                key={num} 
                className="num-btn" 
                onClick={() => handleDart(num, currentTarget.val)}
                style={{ color: currentTarget.val === 2 ? 'var(--orange)' : 'var(--red)' }}
              >
                {num}
              </button>
            ))}
            {currentTarget.val === 2 && (
              <button className="num-btn" onClick={() => handleDart(25, 2)} style={{ color: 'var(--red)' }}>BULL</button>
            )}
            <button className="num-btn" onClick={() => handleDart(0, 1)} style={{ color: 'var(--text-dim)', gridColumn: currentTarget.val === 2 ? 'span 4' : 'span 5' }}>MISS</button>
          </div>
        )}

        <div className="keypad-actions" style={{ marginTop: '15px' }}>
          <button className="btn-secondary" onClick={undoSingleDart} disabled={currentRoundDarts.length === 0 || isProcessing}>
            ↩ Rückgängig
          </button>
        </div>
      </div>
    </div>
  );
};
