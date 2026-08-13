import React, { useState, useEffect } from 'react';
import type { Profile, Dart } from '../types';
import { Keypad } from './Keypad';
import { getCheckoutSuggestion } from '../utils/checkouts';
import { getBotDart } from '../utils/bot';
import { playDartHitSound, playSciFiHitSound, speak } from '../utils/audio';

interface CheckoutTrainingProps {
  players: string[];
  profiles: Record<string, Profile>;
  checkoutRounds: number;
  checkoutTargets: number;
  onFinish: (results: { name: string; score: number; roundsCompleted: number; attempts: number; dartsUsed: number }[]) => void;
  onAbort: () => void;
}

interface PlayerState {
  name: string;
  isBot: boolean;
  targetAverage: number;
  color?: string;
  targetScore: number;
  currentScore: number;
  scoreAtStartOfRound: number;
  roundsOnCurrentTarget: number;
  dartsUsed: number;
  roundsCompleted: number;
  attempts: number;
  bestCheckout: number;
}

const generateRandomScore = () => Math.floor(Math.random() * (120 - 2 + 1)) + 2;

export const CheckoutTraining: React.FC<CheckoutTrainingProps> = ({ players, profiles, checkoutRounds, checkoutTargets, onFinish, onAbort }) => {
  const [gameState, setGameState] = useState<PlayerState[]>(() => 
    players.map(p => {
        const target = generateRandomScore();
        return {
            name: p,
            isBot: profiles[p]?.isBot || false,
            targetAverage: profiles[p]?.targetAverage || 40,
            color: profiles[p]?.color,
            targetScore: target,
            currentScore: target,
            scoreAtStartOfRound: target,
            roundsOnCurrentTarget: 0,
            dartsUsed: 0,
            roundsCompleted: 0,
            attempts: 0,
            bestCheckout: 0
        };
    })
  );
  
  const [activePlayer, setActivePlayer] = useState(0);
  const [currentRoundDarts, setCurrentRoundDarts] = useState<Dart[]>([]);
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeP = gameState[activePlayer];

  useEffect(() => {
    if (activeP.isBot && !isProcessing) {
      const timer = setTimeout(() => {
        const botThrow = getBotDart(activeP.targetAverage, activeP.currentScore); 
        handleDart(botThrow.base, botThrow.mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, currentRoundDarts, isProcessing, activeP.currentScore]);

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

    const tempScore = activeP.currentScore - value;
    
    if (tempScore === 0 && mult === 2) {
      // Checked out!
      setIsProcessing(true);
      setTimeout(() => processCheckout(newDarts.length), 1000);
    } else if (tempScore <= 1) {
      // Bust
      setIsProcessing(true);
      setTimeout(() => processBust(), 1000);
    } else if (newDarts.length === 3) {
      // 3 darts thrown, no checkout
      setIsProcessing(true);
      setTimeout(() => processEndTurn(), 1000);
    } else {
      // Update local state slightly to show current score if we want, or just let keypad handle it
      // For Training, we immediately subtract visually
      setGameState(prev => {
        const next = [...prev];
        next[activePlayer].currentScore = tempScore;
        return next;
      });
    }
  };

  const processCheckout = (dartsCount: number) => {
    let finalAttempts = 0;
    setGameState(prev => {
      const next = [...prev];
      const p = next[activePlayer];
      p.dartsUsed += (p.roundsOnCurrentTarget * 3) + dartsCount;
      p.roundsCompleted += 1;
      p.attempts += 1;
      p.bestCheckout = Math.max(p.bestCheckout, p.targetScore);
      finalAttempts = p.attempts;
      
      if (p.attempts < checkoutTargets) {
        const newTarget = generateRandomScore();
        p.targetScore = newTarget;
        p.currentScore = newTarget;
        p.scoreAtStartOfRound = newTarget;
        p.roundsOnCurrentTarget = 0;
      }
      return next;
    });

    if (activeP.targetScore >= 100) {
      // High Finish sound will play and then say "Game Shot" inside its own logic or we can just call it
      speak("Game Shot");
    } else {
      speak("Game Shot");
    }
    
    nextPlayer(finalAttempts);
  };

  const processBust = () => {
    let finalAttempts = 0;
    setGameState(prev => {
      const next = [...prev];
      const p = next[activePlayer];
      
      p.roundsOnCurrentTarget += 1;
      if (p.roundsOnCurrentTarget >= checkoutRounds) {
        p.attempts += 1;
        finalAttempts = p.attempts;
        
        if (p.attempts < checkoutTargets) {
          const newTarget = generateRandomScore();
          p.targetScore = newTarget;
          p.currentScore = newTarget;
          p.scoreAtStartOfRound = newTarget;
          p.roundsOnCurrentTarget = 0;
        }
      } else {
        p.currentScore = p.scoreAtStartOfRound;
      }
      return next;
    });
    
    speak("No Score");
    nextPlayer(finalAttempts);
  };

  const processEndTurn = () => {
    let finalAttempts = 0;
    setGameState(prev => {
      const next = [...prev];
      const p = next[activePlayer];
      
      p.roundsOnCurrentTarget += 1;
      if (p.roundsOnCurrentTarget >= checkoutRounds) {
        p.attempts += 1;
        finalAttempts = p.attempts;
        
        if (p.attempts < checkoutTargets) {
          const newTarget = generateRandomScore();
          p.targetScore = newTarget;
          p.currentScore = newTarget;
          p.scoreAtStartOfRound = newTarget;
          p.roundsOnCurrentTarget = 0;
        }
      } else {
        p.scoreAtStartOfRound = p.currentScore;
      }
      return next;
    });
    
    const roundScore = currentRoundDarts.reduce((s, d) => s + d.value, 0);
    speak(roundScore.toString());
    
    nextPlayer(finalAttempts);
  };

  const nextPlayer = (attemptsForActivePlayer: number = 0) => {
    // If the active player is the LAST player and they just hit the target limit -> End game
    if (activePlayer === players.length - 1 && attemptsForActivePlayer >= checkoutTargets) {
      setCurrentRoundDarts([]); // Fix visual bug
      setGameState(finalState => {
        setTimeout(() => {
          onFinish(finalState.map(p => ({ 
            name: p.name, 
            score: p.bestCheckout, 
            roundsCompleted: p.roundsCompleted, 
            attempts: p.attempts, 
            dartsUsed: p.dartsUsed 
          })));
        }, 500);
        return finalState;
      });
      return;
    }
    
    setActivePlayer((activePlayer + 1) % players.length);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  };

  const undoSingleDart = () => {
    if (currentRoundDarts.length > 0 && !isProcessing) {
      const lastDart = currentRoundDarts[currentRoundDarts.length - 1];
      setGameState(prev => {
        const next = [...prev];
        next[activePlayer].currentScore += lastDart.value;
        return next;
      });
      setCurrentRoundDarts(prev => prev.slice(0, -1));
    }
  };

  return (
    <div className="screen active-screen">
      <div className="app-header" style={{ marginBottom: '10px' }}>
        <button className="btn-danger" onClick={onAbort} style={{ width: 'auto' }}>Abbrechen</button>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h2 style={{ margin: 0 }}>🎯 Checkout Training</h2>
          <span style={{ color: '#999', fontSize: '0.9em' }}>Target {activeP.attempts + 1} / {checkoutTargets}</span>
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
              {p.currentScore}
            </div>

            {i === activePlayer && p.currentScore <= 170 && getCheckoutSuggestion(p.currentScore, 'DO', currentRoundDarts.length) && (
              <div className="checkout-hint" style={{ marginBottom: '10px' }}>
                {getCheckoutSuggestion(p.currentScore, 'DO', currentRoundDarts.length)}
              </div>
            )}

            <div style={{ fontSize: '0.9em', color: '#999', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                 <span>Quote: {p.attempts > 0 ? Math.round((p.roundsCompleted / p.attempts) * 100) : 0}%</span>
                 <span>Darts/CO: {p.roundsCompleted > 0 ? (p.dartsUsed / p.roundsCompleted).toFixed(1) : '-'}</span>
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '5px', marginTop: '10px', width: '100%' }}>
                 <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '4px' }}>
                   <div style={{ fontSize: '0.8em', color: '#888' }}>Target</div>
                   <div>{p.targetScore}</div>
                 </div>
                 <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '4px' }}>
                   <div style={{ fontSize: '0.8em', color: '#888' }}>Erfolge</div>
                   <div>{p.roundsCompleted}/{p.attempts}</div>
                 </div>
                 <div style={{ background: 'rgba(255,255,255,0.05)', padding: '5px', borderRadius: '4px' }}>
                   <div style={{ fontSize: '0.8em', color: '#888' }}>Runde</div>
                   <div>{p.roundsOnCurrentTarget + 1}/{checkoutRounds}</div>
                 </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      <Keypad 
        currentRoundDarts={currentRoundDarts}
        currentMultiplier={currentMultiplier}
        isProcessing={isProcessing}
        roundBust={false}
        addDart={(base) => handleDart(base)}
        toggleMultiplier={(m) => setCurrentMultiplier(m)}
        undoSingleDart={undoSingleDart}
        abortGame={onAbort}
      />
    </div>
  );
};
