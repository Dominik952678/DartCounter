import React, { useState, useEffect } from 'react';
import type { Profile, Dart } from '../types';
import { Keypad } from './Keypad';
import { getCheckoutSuggestion } from '../utils/checkouts';
import { getBotDart } from '../utils/bot';
import { playDartHitSound, playSciFiHitSound, speak, isSoundEnabled, setSoundEnabled } from '../utils/audio';

interface CheckoutTrainingProps {
  players: string[];
  profiles: Record<string, Profile>;
  checkoutRounds: number;
  checkoutTargets: number;
  onFinish: (results: { name: string; score: number; roundsCompleted: number; attempts: number; dartsUsed: number }[]) => void;
  onAbort: () => void;
  isOnline?: boolean;
  isHost?: boolean;
  roomChannel?: any;
  myUsername?: string;
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

interface HistorySnapshot {
  gameState: PlayerState[];
  activePlayer: number;
  currentRoundDarts: Dart[];
  roundBust: boolean;
}

const generateRandomScore = () => Math.floor(Math.random() * (120 - 2 + 1)) + 2;

export const CheckoutTraining: React.FC<CheckoutTrainingProps> = ({ players, profiles, checkoutRounds, checkoutTargets, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
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
  const [roundBust, setRoundBust] = useState(false);
  const [history, setHistory] = useState<HistorySnapshot[]>([]);

  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeP = gameState[activePlayer] || gameState[0];
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, roundBust });
  stateRef.current = { gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, roundBust };

  useEffect(() => {
    if (isOnline && roomChannel) {
      if (isHost) {
         roomChannel.send({ type: 'broadcast', event: 'ct_state', payload: stateRef.current });
         const sub = roomChannel.on('broadcast', { event: 'ct_throw' }, (p: any) => {
            const data = p?.payload ?? p;
            handleDart(data.base, data.overrideMult);
         });
         return () => { sub.unsubscribe(); };
      } else {
         const sub = roomChannel.on('broadcast', { event: 'ct_state' }, (p: any) => {
            const data = p?.payload ?? p;
            if (data.gameState) setGameState(data.gameState);
            if (data.activePlayer !== undefined) setActivePlayer(data.activePlayer);
            if (data.currentRoundDarts) setCurrentRoundDarts(data.currentRoundDarts);
            if (data.isProcessing !== undefined) setIsProcessing(data.isProcessing);
            if (data.currentMultiplier !== undefined) setCurrentMultiplier(data.currentMultiplier);
         });
         return () => { sub.unsubscribe(); };
      }
    }
  }, [isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (isOnline && isHost && roomChannel) {
       roomChannel.send({ type: 'broadcast', event: 'ct_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRoundDarts, isProcessing, currentMultiplier, isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (activeP && activeP.isBot && !isProcessing && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        const botThrow = getBotDart(activeP.targetAverage, activeP.currentScore); 
        handleDart(botThrow.base, botThrow.mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, currentRoundDarts, isProcessing, activeP?.currentScore, isOnline, isHost]);

  const handleDart = (base: number, overrideMult?: number) => {
    if (stateRef.current.isProcessing) return;

    if (isOnline && !isHost) {
       roomChannel?.send({ type: 'broadcast', event: 'ct_throw', payload: { base, overrideMult } });
       return;
    }

    // Save snapshot before dart
    setHistory(prev => [...prev, {
      gameState: stateRef.current.gameState.map(p => ({ ...p })),
      activePlayer: stateRef.current.activePlayer,
      currentRoundDarts: [...stateRef.current.currentRoundDarts],
      roundBust: stateRef.current.roundBust
    }]);

    let mult = overrideMult ?? stateRef.current.currentMultiplier;
    if (base === 25 && mult === 3) mult = 1;
    
    const value = base * mult;
    const dart: Dart = {
      base,
      mult,
      value,
      label: base === 0 ? 'MISS' : base === 25 ? (mult === 2 ? 'DB' : 'BULL') : `${mult === 3 ? 'T' : mult === 2 ? 'D' : ''}${base}`
    };

    const newDarts = [...stateRef.current.currentRoundDarts, dart];
    setCurrentRoundDarts(newDarts);
    setCurrentMultiplier(1);

    if (base === 20 && mult === 3) playSciFiHitSound('T20');
    else if (base === 19 && mult === 3) playSciFiHitSound('T19');
    else if (base === 25 && mult === 2) playSciFiHitSound('Bull');
    else playDartHitSound();

    const st = stateRef.current;
    const currentP = st.gameState[st.activePlayer];
    const newScore = currentP.currentScore - value;
    
    // Live update player currentScore so UI shows the dart result instantly
    setGameState(prev => {
      const next = [...prev];
      next[st.activePlayer] = {
        ...next[st.activePlayer],
        currentScore: Math.max(0, newScore)
      };
      return next;
    });

    if (newScore === 0 && mult === 2) {
      // Successful Checkout!
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => processCheckout(newDarts.length), 700);
    } else if (newScore <= 1) {
      // Bust!
      setRoundBust(true);
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => processBust(newDarts.length), 800);
    } else if (newDarts.length === 3) {
      // Completed 3 darts turn
      setIsProcessing(true);
      timeoutRef.current = setTimeout(() => processEndTurn(newDarts), 700);
    }
  };

  const processCheckout = (dartsInThisTurn: number) => {
    speak("Game Shot");

    const st = stateRef.current;
    const p = st.gameState[st.activePlayer];
    const totalDartsForThisTarget = (p.roundsOnCurrentTarget * 3) + dartsInThisTurn;
    const newAttempts = p.attempts + 1;
    const newCompleted = p.roundsCompleted + 1;
    const newBestCheckout = Math.max(p.bestCheckout, p.targetScore);
    const newDartsUsed = p.dartsUsed + totalDartsForThisTarget;

    let nextTarget = p.targetScore;
    if (newAttempts < checkoutTargets) {
      nextTarget = generateRandomScore();
    }

    const updatedPlayer: PlayerState = {
      ...p,
      attempts: newAttempts,
      roundsCompleted: newCompleted,
      bestCheckout: newBestCheckout,
      dartsUsed: newDartsUsed,
      targetScore: nextTarget,
      currentScore: nextTarget,
      scoreAtStartOfRound: nextTarget,
      roundsOnCurrentTarget: 0
    };

    const nextGameState = [...st.gameState];
    nextGameState[st.activePlayer] = updatedPlayer;
    setGameState(nextGameState);

    advanceToNextPlayerOrFinish(nextGameState);
  };

  const processBust = (dartsInThisTurn: number) => {
    speak("No Score");
    setRoundBust(false);

    const st = stateRef.current;
    const p = st.gameState[st.activePlayer];
    const nextRoundOnTarget = p.roundsOnCurrentTarget + 1;

    let updatedPlayer: PlayerState;

    if (nextRoundOnTarget >= checkoutRounds) {
      // All allowed rounds on this target used -> target failed
      const newAttempts = p.attempts + 1;
      const totalDartsForThisTarget = (p.roundsOnCurrentTarget * 3) + dartsInThisTurn;
      let nextTarget = p.targetScore;
      if (newAttempts < checkoutTargets) {
        nextTarget = generateRandomScore();
      }

      updatedPlayer = {
        ...p,
        attempts: newAttempts,
        dartsUsed: p.dartsUsed + totalDartsForThisTarget,
        targetScore: nextTarget,
        currentScore: nextTarget,
        scoreAtStartOfRound: nextTarget,
        roundsOnCurrentTarget: 0
      };
    } else {
      // Has remaining round attempts for this target -> reset score back to scoreAtStartOfRound
      updatedPlayer = {
        ...p,
        currentScore: p.scoreAtStartOfRound,
        roundsOnCurrentTarget: nextRoundOnTarget
      };
    }

    const nextGameState = [...st.gameState];
    nextGameState[st.activePlayer] = updatedPlayer;
    setGameState(nextGameState);

    advanceToNextPlayerOrFinish(nextGameState);
  };

  const processEndTurn = (darts: Dart[]) => {
    const roundScore = darts.reduce((s, d) => s + d.value, 0);
    if (roundScore > 0) speak(roundScore.toString());
    else speak("No Score");

    const st = stateRef.current;
    const p = st.gameState[st.activePlayer];
    const nextRoundOnTarget = p.roundsOnCurrentTarget + 1;
    const remainingScore = p.currentScore;

    let updatedPlayer: PlayerState;

    if (nextRoundOnTarget >= checkoutRounds) {
      // All allowed rounds on this target used -> target failed
      const newAttempts = p.attempts + 1;
      const totalDartsForThisTarget = nextRoundOnTarget * 3;
      let nextTarget = p.targetScore;
      if (newAttempts < checkoutTargets) {
        nextTarget = generateRandomScore();
      }

      updatedPlayer = {
        ...p,
        attempts: newAttempts,
        dartsUsed: p.dartsUsed + totalDartsForThisTarget,
        targetScore: nextTarget,
        currentScore: nextTarget,
        scoreAtStartOfRound: nextTarget,
        roundsOnCurrentTarget: 0
      };
    } else {
      // Keep remaining score for next attempt at this target
      updatedPlayer = {
        ...p,
        currentScore: remainingScore,
        scoreAtStartOfRound: remainingScore,
        roundsOnCurrentTarget: nextRoundOnTarget
      };
    }

    const nextGameState = [...st.gameState];
    nextGameState[st.activePlayer] = updatedPlayer;
    setGameState(nextGameState);

    advanceToNextPlayerOrFinish(nextGameState);
  };

  const advanceToNextPlayerOrFinish = (latestGameState: PlayerState[]) => {
    const allFinished = latestGameState.every(p => p.attempts >= checkoutTargets);

    if (allFinished) {
      setCurrentRoundDarts([]);
      setIsProcessing(true);
      setTimeout(() => {
        onFinish(latestGameState.map(p => ({ 
          name: p.name, 
          score: p.bestCheckout, 
          roundsCompleted: p.roundsCompleted, 
          attempts: p.attempts, 
          dartsUsed: p.dartsUsed 
        })));
      }, 500);
      return;
    }

    const st = stateRef.current;
    let nextIdx = (st.activePlayer + 1) % players.length;
    for (let i = 0; i < players.length; i++) {
      if (latestGameState[nextIdx].attempts < checkoutTargets) {
        break;
      }
      nextIdx = (nextIdx + 1) % players.length;
    }

    setActivePlayer(nextIdx);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  };

  const undoSingleDart = () => {
    if (isOnline && !isHost) return;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setRoundBust(false);
    setIsProcessing(false);

    setHistory(prevHistory => {
      if (prevHistory.length === 0) {
        if (stateRef.current.currentRoundDarts.length > 0) {
          const lastDart = stateRef.current.currentRoundDarts[stateRef.current.currentRoundDarts.length - 1];
          const st = stateRef.current;
          setGameState(prev => {
            const next = [...prev];
            next[st.activePlayer] = {
              ...next[st.activePlayer],
              currentScore: next[st.activePlayer].currentScore + lastDart.value
            };
            return next;
          });
          setCurrentRoundDarts(prev => prev.slice(0, -1));
        }
        return prevHistory;
      }

      const lastSnapshot = prevHistory[prevHistory.length - 1];
      const newHistory = prevHistory.slice(0, -1);

      setGameState(lastSnapshot.gameState);
      setActivePlayer(lastSnapshot.activePlayer);
      setCurrentRoundDarts(lastSnapshot.currentRoundDarts);
      setRoundBust(lastSnapshot.roundBust || false);

      return newHistory;
    });
  };

  return (
    <div className="screen active-screen game-screen-layout">
      {isOnline && !isMyTurn && (
         <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,0,0,0.8)', padding: '5px 15px', borderRadius: '15px', color: 'white', zIndex: 10 }}>
            Warte auf {activeP.name}...
         </div>
      )}
      <div style={{ opacity: (!isOnline || isMyTurn) ? 1 : 0.6, pointerEvents: (!isOnline || isMyTurn) ? 'auto' : 'none', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="match-top-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ fontWeight: 800, fontSize: '1.05em', color: 'var(--text)', whiteSpace: 'nowrap' }}>
              🎯 Checkout Training
            </span>
            <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              Target {Math.min(activeP.attempts + 1, checkoutTargets)} / {checkoutTargets}
            </span>
          </div>

          <div className="match-header-actions">
            <button 
              onClick={() => {
                const next = !soundOn;
                setSoundEnabled(next);
                setSoundOn(next);
              }}
              className={`btn-sound-toggle ${soundOn ? 'btn-sound-on' : 'btn-sound-off'}`}
              title={soundOn ? 'Caller An (klicken zum Stummschalten)' : 'Caller Aus (klicken zum Einschalten)'}
              aria-label={soundOn ? 'Caller stummschalten' : 'Caller aktivieren'}
            >
              {soundOn ? '🔊' : '🔇'}
            </button>

            <button 
              className="btn-ghost" 
              onClick={() => setShowAbortConfirm(true)}
              style={{ 
                fontSize: '0.85em', 
                color: 'var(--red)', 
                padding: '6px 12px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 69, 58, 0.25)',
                background: 'rgba(255, 69, 58, 0.08)',
                minHeight: '36px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              ✕ <span className="btn-abort-text">Beenden</span>
            </button>
          </div>
        </div>

        <div className="game-screen-body">
          <div className="game-screen-left">
            <div className="scoreboard" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', padding: '10px 0' }}>
              {gameState.map((p, i) => (
                <div 
                  key={i} 
                  className={`player ${i === activePlayer ? 'active' : ''}`}
                  style={{ flex: 1, minWidth: '140px', borderLeftColor: i === activePlayer ? p.color : undefined }}
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
                         <div>{Math.min(p.roundsOnCurrentTarget + 1, checkoutRounds)}/{checkoutRounds}</div>
                       </div>
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="game-screen-right">
            <Keypad 
              currentRoundDarts={currentRoundDarts}
              currentMultiplier={currentMultiplier}
              isProcessing={isProcessing}
              roundBust={roundBust}
              addDart={(base) => handleDart(base)}
              toggleMultiplier={(m) => setCurrentMultiplier(m)}
              undoSingleDart={undoSingleDart}
              abortGame={() => setShowAbortConfirm(true)}
              canUndo={(history.length > 0 || currentRoundDarts.length > 0) && !isProcessing}
            />
          </div>
        </div>

      {showAbortConfirm && (
        <div className="modal-overlay" onClick={() => setShowAbortConfirm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px', textAlign: 'center', padding: '28px 20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>⚠️</div>
            <h3 style={{ marginBottom: '8px', fontSize: '1.3em' }}>Training beenden?</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9em', lineHeight: '1.4', marginBottom: '22px' }}>
              Möchtest du die aktuelle Training-Session wirklich abbrechen?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-secondary" 
                onClick={() => setShowAbortConfirm(false)}
                style={{ flex: 1 }}
              >
                Weiterspielen
              </button>
              <button 
                className="btn-danger" 
                onClick={() => {
                  setShowAbortConfirm(false);
                  onAbort();
                }}
                style={{ flex: 1 }}
              >
                Beenden
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
