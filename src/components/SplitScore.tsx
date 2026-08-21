import React, { useState, useEffect } from 'react';
import type { Profile, Dart } from '../types';
import { playDartHitSound, playSciFiHitSound, speak, play180Sound } from '../utils/audio';

interface SplitScoreProps {
  players: string[];
  profiles: Record<string, Profile>;
  onFinish: (results: { name: string; score: number }[]) => void;
  onAbort: () => void;
  isOnline?: boolean;
  isHost?: boolean;
  roomChannel?: any;
  myUsername?: string;
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

export const SplitScore: React.FC<SplitScoreProps> = ({ players, profiles, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
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
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier });
  stateRef.current = { gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier };

  useEffect(() => {
    if (isOnline && roomChannel) {
      if (isHost) {
         roomChannel.send({ type: 'broadcast', event: 'ss_state', payload: stateRef.current });
         const sub = roomChannel.on('broadcast', { event: 'ss_throw' }, (p: any) => {
            const data = p?.payload ?? p;
            handleDart(data.base, data.overrideMult);
         });
         return () => { sub.unsubscribe(); };
      } else {
         const sub = roomChannel.on('broadcast', { event: 'ss_state' }, (p: any) => {
            const data = p?.payload ?? p;
            if (data.gameState) setGameState(data.gameState);
            if (data.activePlayer !== undefined) setActivePlayer(data.activePlayer);
            if (data.currentRoundIndex !== undefined) setCurrentRoundIndex(data.currentRoundIndex);
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
       roomChannel.send({ type: 'broadcast', event: 'ss_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRoundIndex, currentRoundDarts, isProcessing, currentMultiplier, isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRoundIndex < TARGETS.length && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        let aimBase = 20;
        if (currentTarget.type === 'number') aimBase = currentTarget.val;

        let mult = 1;
        let base = aimBase;
        const hitChance = Math.max(0.1, Math.min(0.8, activeP.targetAverage / 120));
        
        if (currentTarget.type === 'modifier') {
            if (Math.random() < hitChance) {
                mult = currentTarget.val;
                base = 20;
            } else {
                mult = 1;
                base = 20;
            }
        } else {
            if (Math.random() < hitChance) {
                base = aimBase;
                if (Math.random() < 0.2) mult = 2;
                if (Math.random() < 0.1 && base !== 25) mult = 3;
            } else {
                base = 1;
            }
        }

        handleDart(base, mult);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, currentRoundDarts, isProcessing, currentRoundIndex, isOnline, isHost]);

  const handleDart = (base: number, overrideMult?: number) => {
    if (stateRef.current.isProcessing) return;

    if (isOnline && !isHost) {
       roomChannel?.send({ type: 'broadcast', event: 'ss_throw', payload: { base, overrideMult } });
       return;
    }

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
    const cTarget = TARGETS[stateRef.current.currentRoundIndex];

    for (const d of darts) {
      if (cTarget.type === 'number') {
        if (d.base === cTarget.val) {
          roundScore += d.value;
          hitAny = true;
        }
      } else if (cTarget.type === 'modifier') {
        if (d.mult === cTarget.val && d.base !== 0) {
          roundScore += d.value;
          hitAny = true;
        }
      }
    }
    
    if (hitAny) {
      if (roundScore === 180) play180Sound();
      else speak(roundScore.toString());
    } else {
      speak("Halbiert");
    }

    const st = stateRef.current;
    setGameState(prev => {
      const newState = [...prev];
      if (hitAny) newState[st.activePlayer].score += roundScore;
      else newState[st.activePlayer].score = Math.floor(newState[st.activePlayer].score / 2);
      return newState;
    });

    if (st.activePlayer === players.length - 1) {
      if (st.currentRoundIndex === TARGETS.length - 1) {
        setCurrentRoundDarts([]);
        setTimeout(() => {
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
    
    setActivePlayer((st.activePlayer + 1) % players.length);
    setCurrentRoundDarts([]);
    setIsProcessing(false);
  };

  const undoSingleDart = () => {
    if (stateRef.current.currentRoundDarts.length > 0 && !stateRef.current.isProcessing && (!isOnline || isHost)) {
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
    <div className="screen active-screen game-screen-layout">
      {isOnline && !isMyTurn && (
         <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(255,0,0,0.8)', padding: '5px 15px', borderRadius: '15px', color: 'white', zIndex: 10 }}>
            Warte auf {activeP.name}...
         </div>
      )}
      <div style={{ opacity: (!isOnline || isMyTurn) ? 1 : 0.6, pointerEvents: (!isOnline || isMyTurn) ? 'auto' : 'none', height: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <div className="match-top-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          marginBottom: '8px',
          background: 'rgba(22, 22, 26, 0.6)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          border: '1px solid var(--card-border)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05em', color: 'var(--text)' }}>
              ➗ Split Score
            </span>
            <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
              Ziel: {currentTarget?.label} ({currentRoundIndex + 1}/{TARGETS.length})
            </span>
          </div>

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
              minHeight: '36px'
            }}
          >
            ✕ Beenden
          </button>
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
            
            <div style={{ textAlign: 'center', padding: '16px', background: '#1c1c1e', borderRadius: '12px', marginTop: '10px' }}>
               <div style={{ fontSize: '0.9em', color: '#999' }}>Aktuelles Ziel</div>
               <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: 'var(--blue)', margin: '4px 0' }}>
                 {currentTarget?.label}
               </div>
               <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '10px' }}>
                 {[0, 1, 2].map(idx => (
                    <div key={idx} style={{ 
                      width: '40px', 
                      height: '40px', 
                      borderRadius: '50%', 
                      border: '2px solid #555',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: currentRoundDarts[idx] ? '#333' : 'transparent',
                      color: currentRoundDarts[idx]?.value > 0 ? '#34c759' : '#fff'
                    }}>
                      {currentRoundDarts[idx] ? currentRoundDarts[idx].label : ''}
                    </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="game-screen-right">
            <div className="keypad" style={{ padding: '10px 0' }}>
              {currentTarget?.type === 'number' && currentTarget?.val !== 25 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button className="num-btn" onClick={() => handleDart(0, 1)} style={{ color: 'var(--red)', gridColumn: 'span 2' }}>Miss (0)</button>
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
  );
};
