import React, { useState, useEffect } from 'react';
import type { Profile, Dart } from '../types';
import { Keypad } from './Keypad';
import { getBotDart } from '../utils/bot';
import { playDartHitSound, playSciFiHitSound, speak, play180Sound } from '../utils/audio';

interface PowerScoringProps {
  players: string[];
  profiles: Record<string, Profile>;
  rounds: number;
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

export const PowerScoring: React.FC<PowerScoringProps> = ({ players, profiles, rounds, onFinish, onAbort }) => {
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => ({
      name: p,
      score: 0,
      isBot: profiles[p]?.isBot || false,
      targetAverage: profiles[p]?.targetAverage || 40,
      color: profiles[p]?.color
    }))
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeP = gameState[activePlayer];

  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRound <= rounds) {
      const timer = setTimeout(() => {
        // Bot just tries to score as high as possible. We can use getBotDart but give it a high score
        // However getBotDart with currentScore > 120 will just aim for 20s.
        const botThrow = getBotDart(activeP.targetAverage, 501); 
        handleDart(botThrow.base);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, currentRoundDarts, isProcessing, currentRound]);

  const handleDart = (base: number) => {
    if (isProcessing) return;

    let mult = currentMultiplier;
    // Validate modifiers for Bull
    if (base === 25 && mult === 3) {
      mult = 1;
    }
    
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
    const roundScore = darts.reduce((sum, d) => sum + d.value, 0);
    
    // Announce score
    if (roundScore === 180) {
      play180Sound();
    } else {
      speak(roundScore.toString());
    }
    
    setGameState(prev => {
      const newState = [...prev];
      newState[activePlayer].score += roundScore;
      return newState;
    });

    if (activePlayer === players.length - 1) {
      if (currentRound === rounds) {
        // Game Over
        setCurrentRoundDarts([]); // Fix visual double bug
        
        const finalResults = gameState.map((p, i) => ({
           name: p.name,
           score: p.score + (i === activePlayer ? roundScore : 0)
        }));
        onFinish(finalResults);
        return;
      } else {
        setCurrentRound(prev => prev + 1);
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

  return (
    <div className="screen active-screen">
      <div className="app-header" style={{ marginBottom: '10px' }}>
        <button className="btn-danger" onClick={onAbort} style={{ width: 'auto' }}>Abbrechen</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ margin: 0 }}>🔥 Power Scoring</h2>
          <span style={{ color: '#999', fontSize: '0.9em' }}>Runde {currentRound} / {rounds}</span>
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
              {p.score + (i === activePlayer ? currentRoundDarts.reduce((s, d) => s + d.value, 0) : 0)}
            </div>
            {i === activePlayer && (
               <div style={{ color: '#0a84ff', fontWeight: 'bold' }}>
                 Diese Runde: {currentRoundDarts.reduce((s, d) => s + d.value, 0)}
               </div>
            )}
          </div>
        ))}
      </div>

      <Keypad 
        currentRoundDarts={currentRoundDarts}
        currentMultiplier={currentMultiplier}
        isProcessing={isProcessing}
        roundBust={false}
        addDart={handleDart}
        toggleMultiplier={(m) => setCurrentMultiplier(m)}
        undoSingleDart={undoSingleDart}
        abortGame={onAbort}
      />
    </div>
  );
};
