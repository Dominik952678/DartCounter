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

export const PowerScoring: React.FC<PowerScoringProps> = ({ players, profiles, rounds, onFinish, onAbort, isOnline, isHost, roomChannel, myUsername }) => {
  const [showAbortConfirm, setShowAbortConfirm] = useState(false);
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
  const isMyTurn = isOnline ? (activeP.name === myUsername) : true;

  const stateRef = React.useRef({ gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier });
  stateRef.current = { gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier };

  useEffect(() => {
    if (isOnline && roomChannel) {
      if (isHost) {
         roomChannel.send({ type: 'broadcast', event: 'ps_state', payload: stateRef.current });
         const sub = roomChannel.on('broadcast', { event: 'ps_throw' }, (p: any) => {
            const data = p?.payload ?? p;
            handleDart(data.base);
         });
         return () => { sub.unsubscribe(); };
      } else {
         const sub = roomChannel.on('broadcast', { event: 'ps_state' }, (p: any) => {
            const data = p?.payload ?? p;
            if (data.gameState) setGameState(data.gameState);
            if (data.activePlayer !== undefined) setActivePlayer(data.activePlayer);
            if (data.currentRound !== undefined) setCurrentRound(data.currentRound);
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
       roomChannel.send({ type: 'broadcast', event: 'ps_state', payload: stateRef.current });
    }
  }, [gameState, activePlayer, currentRound, currentRoundDarts, isProcessing, currentMultiplier, isOnline, isHost, roomChannel]);

  useEffect(() => {
    if (activeP.isBot && !isProcessing && currentRound <= rounds && (!isOnline || isHost)) {
      const timer = setTimeout(() => {
        const botThrow = getBotDart(activeP.targetAverage, 501); 
        handleDart(botThrow.base);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [activePlayer, currentRoundDarts, isProcessing, currentRound, isOnline, isHost]);

  const handleDart = (base: number) => {
    if (stateRef.current.isProcessing) return;

    if (isOnline && !isHost) {
       roomChannel?.send({ type: 'broadcast', event: 'ps_throw', payload: { base } });
       return;
    }

    let mult = stateRef.current.currentMultiplier;
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
    const roundScore = darts.reduce((sum, d) => sum + d.value, 0);
    if (roundScore === 180) play180Sound();
    else speak(roundScore.toString());
    
    const st = stateRef.current;
    
    setGameState(prev => {
      const newState = [...prev];
      newState[st.activePlayer].score += roundScore;
      return newState;
    });

    if (st.activePlayer === players.length - 1) {
      if (st.currentRound === rounds) {
        setCurrentRoundDarts([]);
        const finalResults = st.gameState.map((p, i) => ({
           name: p.name,
           score: p.score + (i === st.activePlayer ? roundScore : 0)
        }));
        onFinish(finalResults);
        return;
      } else {
        setCurrentRound(prev => prev + 1);
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
              🔥 Power Scoring
            </span>
            <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '6px' }}>
              Runde {currentRound} / {rounds}
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
          </div>

          <div className="game-screen-right">
            <Keypad 
              currentRoundDarts={currentRoundDarts}
              currentMultiplier={currentMultiplier}
              isProcessing={isProcessing}
              roundBust={false}
              addDart={handleDart}
              toggleMultiplier={(m) => setCurrentMultiplier(m)}
              undoSingleDart={undoSingleDart}
              abortGame={() => setShowAbortConfirm(true)}
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
